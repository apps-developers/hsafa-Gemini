/**
 * useHsafaGateway - Simple hook for connecting to Hsafa Gateway
 * 
 * Handles agent connection, run lifecycle, SSE streaming, and browser tools.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { genId } from '../utils/time';

// ============ Types ============

export type GatewayMessagePart = {
  type: string;
  [key: string]: unknown;
};

export interface GatewayMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  parts: GatewayMessagePart[];
  createdAt?: number;
}

export interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  executionTarget?: 'server' | 'browser' | 'device' | 'external';
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export interface RunInfo {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface StreamEvent {
  id: string;
  type: string;
  ts: string;
  data: unknown;
}

export interface UseHsafaGatewayConfig {
  /** Gateway URL */
  gatewayUrl: string;
  /** Agent ID (gateway already knows this agent; SDK does not register agents) */
  agentId: string;
  /** Attach to existing run */
  runId?: string;
  /** Sender identity */
  senderId?: string;
  senderName?: string;
  /** Browser-side tools */
  tools?: Record<string, (args: unknown) => Promise<unknown> | unknown>;
  /** Called for UI tools */
  onToolCall?: (toolCall: ToolCall, addResult: (result: unknown) => void) => void;
  /** Called on completion */
  onComplete?: (text: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface HsafaGatewayAPI {
  messages: GatewayMessage[];
  isStreaming: boolean;
  status: 'idle' | 'running' | 'streaming' | 'waiting_tool' | 'completed' | 'error';
  runId: string | null;
  agentId: string | null;
  isReady: boolean;
  error: Error | null;
  pendingToolCalls: ToolCall[];
  /** Load list of runs for current agent from PostgreSQL */
  loadRuns: () => Promise<RunInfo[]>;
  /** Delete a run from PostgreSQL */
  deleteRun: (runId: string) => Promise<boolean>;
  createRun: () => Promise<string>;
  attachToRun: (runId: string) => Promise<void>;
  sendMessage: (text: string, files?: Array<{ url: string; mediaType: string; name?: string }>) => Promise<void>;
  addToolResult: (payload: unknown) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

// ============ Hook Implementation ============

export function useHsafaGateway(config: UseHsafaGatewayConfig): HsafaGatewayAPI {
  const {
    gatewayUrl,
    agentId: providedAgentId,
    runId: providedRunId,
    senderId,
    senderName,
    tools = {},
    onToolCall,
    onComplete,
    onError,
  } = config;

  // State
  const [messages, setMessages] = useState<GatewayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<HsafaGatewayAPI['status']>('idle');
  const [runId, setRunId] = useState<string | null>(providedRunId || null);
  const [agentId, setAgentId] = useState<string | null>(providedAgentId || null);
  const [error, setError] = useState<Error | null>(null);
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);
  const [isReady, setIsReady] = useState(!!providedAgentId);

  // Refs
  const currentTextRef = useRef<string>('');
  const currentReasoningRef = useRef<string>('');
  const draftAssistantIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (providedRunId) {
      setRunId(providedRunId);
    }
  }, [providedRunId]);

  const attachedRunIdRef = useRef<string | null>(null);

  const upsertMessageById = useCallback((msg: GatewayMessage) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msg.id);
      if (idx === -1) return [...prev, msg];
      const updated = [...prev];
      updated[idx] = msg;
      return updated;
    });
  }, [setMessages]);

  const ensureDraftAssistant = useCallback(() => {
    if (draftAssistantIdRef.current) return draftAssistantIdRef.current;
    const id = `draft_${genId()}`;
    draftAssistantIdRef.current = id;
    upsertMessageById({
      id,
      role: 'assistant',
      parts: [],
      createdAt: Date.now(),
    });
    return id;
  }, [upsertMessageById]);

  useEffect(() => {
    if (!providedAgentId) {
      setError(new Error('agentId is required for useHsafaGateway'));
      setStatus('error');
      setIsReady(false);
      return;
    }
    setAgentId(providedAgentId);
    setIsReady(true);
    setStatus('idle');
  }, [providedAgentId]);

  const loadRunEvents = useCallback(async (targetRunId: string): Promise<StreamEvent[]> => {
    try {
      const response = await fetch(`${gatewayUrl}/api/runs/${targetRunId}/events`);
      if (!response.ok) return [];
      const data = await response.json();
      const events: unknown[] = Array.isArray(data?.events) ? data.events : [];
      return events
        .map((e: unknown): StreamEvent | null => {
          if (!e || typeof e !== 'object') return null;
          const ee = e as Record<string, unknown>;
          const type = typeof ee.type === 'string' ? ee.type : '';
          if (!type) return null;
          const seq = ee.seq;
          const id = typeof seq === 'number' || typeof seq === 'string' ? String(seq) : `evt_${genId()}`;
          const ts = typeof ee.createdAt === 'string' ? ee.createdAt : '';
          const payload = (ee.payload ?? {}) as unknown;
          return { id, type, ts, data: payload };
        })
        .filter((x): x is StreamEvent => !!x);
    } catch {
      return [];
    }
  }, [gatewayUrl]);

  // Handle browser tool execution
  const executeBrowserTool = useCallback(async (toolCall: ToolCall): Promise<unknown> => {
    const toolFn = tools[toolCall.toolName];
    if (toolFn) {
      try {
        const result = await toolFn(toolCall.args);
        return result;
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    }
    return { error: `Tool ${toolCall.toolName} not found` };
  }, [tools]);

  // Send tool result to gateway
  const sendToolResult = useCallback(async (currentRunId: string, callId: string, result: unknown) => {
    try {
      await fetch(`${gatewayUrl}/api/runs/${currentRunId}/tool-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          result,
          source: 'browser',
        }),
      });
    } catch (err) {
      console.error('Failed to send tool result:', err);
    }
  }, [gatewayUrl]);

  // Add tool result (public API for UI tools)
  const addToolResult = useCallback(async (payload: unknown) => {
    if (!runId) return;

    if (typeof payload === 'string') {
      return;
    }

    const p = payload as Record<string, unknown>;
    const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : undefined;
    const result = p.output ?? p.result;
    if (!toolCallId) return;

    setPendingToolCalls(prev => prev.filter(tc => tc.id !== toolCallId));
    await sendToolResult(runId, toolCallId, result);
  }, [runId, sendToolResult]);

  // Process SSE event
  const processEvent = useCallback((event: StreamEvent) => {
    const { type, data } = event;

    switch (type) {
      case 'run.created':
      case 'run.started':
        setStatus('streaming');
        setIsStreaming(true);
        break;

      case 'run.waiting_tool':
        setStatus('waiting_tool');
        break;

      case 'reasoning.delta': {
        setStatus('streaming');
        setIsStreaming(true);
        const d = data as Record<string, unknown> | null | undefined;
        const delta = typeof d?.delta === 'string' ? d.delta : '';
        if (!delta) break;
        currentReasoningRef.current += delta;
        const draftId = ensureDraftAssistant();
        setMessages(prev => prev.map(m => {
          if (m.id !== draftId) return m;
          const parts = Array.isArray(m.parts) ? [...m.parts] : [];
          const idx = parts.findIndex(p => p.type === 'reasoning');
          if (idx === -1) {
            parts.unshift({ type: 'reasoning', text: currentReasoningRef.current });
          } else {
            parts[idx] = { ...parts[idx], text: currentReasoningRef.current };
          }
          return { ...m, parts };
        }));
        break;
      }

      case 'text.delta': {
        setStatus('streaming');
        setIsStreaming(true);
        const d = data as Record<string, unknown> | null | undefined;
        const delta = typeof d?.delta === 'string' ? d.delta : '';
        if (!delta) break;
        currentTextRef.current += delta;
        const draftId = ensureDraftAssistant();
        setMessages(prev => prev.map(m => {
          if (m.id !== draftId) return m;
          const parts = Array.isArray(m.parts) ? [...m.parts] : [];
          const idx = parts.findIndex(p => p.type === 'text');
          if (idx === -1) {
            parts.push({ type: 'text', text: currentTextRef.current });
          } else {
            parts[idx] = { ...parts[idx], text: currentTextRef.current };
          }
          return { ...m, parts };
        }));
        break;
      }

      case 'message.user':
      case 'message.assistant':
      case 'message.tool': {
        const maybeMessage = (data as { message?: unknown } | null | undefined)?.message;
        const msg = maybeMessage as GatewayMessage | undefined;
        if (!msg || typeof msg !== 'object' || typeof msg.id !== 'string') break;

        // If we have a draft assistant and this is the final message.assistant,
        // finalize the draft: keep streamed text, and merge tool-call parts if present.
        if (type === 'message.assistant' && draftAssistantIdRef.current) {
          const draftId = draftAssistantIdRef.current;
          draftAssistantIdRef.current = null;

          setMessages(prev => prev.map(m => {
            if (m.id !== draftId) return m;

            const draftParts = Array.isArray(m.parts) ? m.parts : [];
            const finalParts = Array.isArray(msg.parts) ? msg.parts : [];

            const draftReasoning = draftParts.find(p => {
              const t = (p as { type?: unknown }).type;
              return typeof t === 'string' && t === 'reasoning';
            });
            const draftText = draftParts.find(p => {
              const t = (p as { type?: unknown }).type;
              return typeof t === 'string' && t === 'text';
            });

            const hasToolCall = finalParts.some(p => {
              const t = (p as { type?: unknown }).type;
              return typeof t === 'string' && t === 'tool-call';
            });
            const hasText = finalParts.some(p => {
              const t = (p as { type?: unknown }).type;
              return typeof t === 'string' && t === 'text';
            });

            let parts: GatewayMessagePart[] = finalParts;

            if (hasToolCall) {
              const merged: GatewayMessagePart[] = [];
              const reasoningText = draftReasoning && typeof (draftReasoning as Record<string, unknown>).text === 'string'
                ? ((draftReasoning as Record<string, unknown>).text as string)
                : '';
              if (reasoningText) merged.push({ type: 'reasoning', text: reasoningText });

              const draftTextValue = draftText && typeof (draftText as Record<string, unknown>).text === 'string'
                ? ((draftText as Record<string, unknown>).text as string)
                : '';
              const textToUse = currentTextRef.current || draftTextValue;
              if (textToUse) merged.push({ type: 'text', text: textToUse });

              merged.push(...finalParts.filter(p => {
                const t = (p as { type?: unknown }).type;
                return t !== 'text' && t !== 'reasoning';
              }));

              parts = merged;
            } else if (hasText && currentTextRef.current) {
              // Prefer the accumulated streamed text
              parts = finalParts.map(p => {
                const t = (p as { type?: unknown }).type;
                if (t === 'text') return { ...p, text: currentTextRef.current };
                return p;
              });
              const reasoningText = draftReasoning && typeof (draftReasoning as Record<string, unknown>).text === 'string'
                ? ((draftReasoning as Record<string, unknown>).text as string)
                : '';
              if (reasoningText && !parts.some(p => {
                const t = (p as { type?: unknown }).type;
                return typeof t === 'string' && t === 'reasoning';
              })) {
                parts = [{ type: 'reasoning', text: reasoningText }, ...parts];
              }
            } else if (finalParts.length === 0) {
              // Nothing in final: keep draft parts
              parts = draftParts;
            }

            return { ...m, id: msg.id, parts };
          }));

          currentTextRef.current = '';
          currentReasoningRef.current = '';
          break;
        }

        // Skip if we already have this message (prevents duplicates from history + stream)
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        break;
      }

      case 'tool.call': {
        const d = data as Record<string, unknown> | null | undefined;
        const executionTarget = typeof d?.executionTarget === 'string'
          ? (d.executionTarget as ToolCall['executionTarget'])
          : undefined;
        const toolCall: ToolCall = {
          id: (data as { toolCallId?: string } | null | undefined)?.toolCallId || '',
          toolName: (data as { toolName?: string } | null | undefined)?.toolName || '',
          args: ((data as { args?: Record<string, unknown> } | null | undefined)?.args) || {},
          executionTarget,
          status: 'pending',
        };

        if (!toolCall.id || !toolCall.toolName) break;

        const isBrowserTool = executionTarget === 'browser' || !!tools[toolCall.toolName];

        if (isBrowserTool) {
          // Check if it needs UI interaction
          if (onToolCall && !tools[toolCall.toolName]) {
            // UI tool - let the app handle it
            setStatus('waiting_tool');
            setPendingToolCalls(prev => [...prev, toolCall]);
            onToolCall(toolCall, (result) => addToolResult({ toolCallId: toolCall.id, output: result }));
          } else if (tools[toolCall.toolName]) {
            // Auto-execute browser tool
            executeBrowserTool(toolCall).then(result => {
              if (runId) {
                sendToolResult(runId, toolCall.id, result);
              }
            });
          }
        }
        // Server tools are handled by the gateway automatically
        break;
      }

      case 'tool.result':
        {
          const d = data as Record<string, unknown> | null | undefined;
          const toolCallId = typeof d?.toolCallId === 'string' ? d.toolCallId : undefined;
          if (toolCallId) {
            setPendingToolCalls(prev => prev.filter(tc => tc.id !== toolCallId));
          }
          setStatus('streaming');
        }
        break;

      case 'run.completed':
        setStatus('completed');
        setIsStreaming(false);
        {
          const d = data as Record<string, unknown> | null | undefined;
          const text = typeof d?.text === 'string' ? d.text : '';
          onComplete?.(text || currentTextRef.current);
        }
        break;

      case 'run.failed':
      case 'stream.error':
        {
          const msg = typeof (data as { error?: unknown } | null | undefined)?.error === 'string'
            ? (data as { error?: string }).error
            : 'Run failed';
          const err = new Error(msg || 'Run failed');
          setError(err);
          setStatus('error');
          setIsStreaming(false);
          onError?.(err);
          break;
        }
    }
  }, [tools, onToolCall, addToolResult, executeBrowserTool, sendToolResult, runId, onComplete, onError, ensureDraftAssistant]);

  // Start SSE stream for a run
  const startStream = useCallback((currentRunId: string) => {
    // Close existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${gatewayUrl}/api/runs/${currentRunId}/stream`);
    eventSourceRef.current = eventSource;
    attachedRunIdRef.current = currentRunId;
    const streamRunId = currentRunId;

    eventSource.addEventListener('hsafa', (e) => {
      try {
        if (attachedRunIdRef.current !== streamRunId) return;
        const event: StreamEvent = JSON.parse(e.data);
        processEvent(event);
      } catch (err) {
        console.error('Failed to parse event:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      eventSource.close();
      setIsStreaming(false);
    };
  }, [gatewayUrl, processEvent]);

  // Load messages for a run (authoritative source of truth)
  const loadRunMessages = useCallback(async (targetRunId: string): Promise<GatewayMessage[]> => {
    try {
      const response = await fetch(`${gatewayUrl}/api/runs/${targetRunId}/messages`);
      if (!response.ok) {
        console.warn('Failed to load run messages:', response.statusText);
        return [];
      }
      const data = await response.json();
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      return msgs.filter((m: unknown): m is GatewayMessage => {
        if (!m || typeof m !== 'object') return false;
        const mm = m as { id?: unknown; role?: unknown; parts?: unknown };
        return typeof mm.id === 'string' && (mm.role === 'user' || mm.role === 'assistant' || mm.role === 'tool') && Array.isArray(mm.parts);
      });
    } catch (err) {
      console.error('Error loading run messages:', err);
      return [];
    }
  }, [gatewayUrl]);

  // Load runs list from PostgreSQL
  const loadRuns = useCallback(async (): Promise<RunInfo[]> => {
    if (!agentId) return [];
    try {
      const response = await fetch(`${gatewayUrl}/api/runs?agentId=${agentId}`);
      if (!response.ok) {
        console.warn('Failed to load runs:', response.statusText);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data?.runs) ? data.runs : [];
    } catch (err) {
      console.error('Error loading runs:', err);
      return [];
    }
  }, [gatewayUrl, agentId]);

  // Delete a run from PostgreSQL
  const deleteRun = useCallback(async (targetRunId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${gatewayUrl}/api/runs/${targetRunId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.warn('Failed to delete run:', response.statusText);
        return false;
      }
      // If we deleted the current run, reset state
      if (targetRunId === runId) {
        setMessages([]);
        setRunId(null);
        attachedRunIdRef.current = null;
      }
      return true;
    } catch (err) {
      console.error('Error deleting run:', err);
      return false;
    }
  }, [gatewayUrl, runId]);

  const attachToRun = useCallback(async (newRunId: string) => {
    if (!newRunId) {
      console.warn('attachToRun called with empty runId');
      return;
    }

    // Stop any existing stream immediately to avoid mixing runs while we load
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    
    // Clear previous messages when attaching to a new run
    setMessages([]);
    setRunId(newRunId);
    attachedRunIdRef.current = newRunId;

    // Reset streaming/draft refs for this run
    currentTextRef.current = '';
    currentReasoningRef.current = '';
    draftAssistantIdRef.current = null;
    
    // Load existing messages for this run from PostgreSQL
    const history = await loadRunMessages(newRunId);
    setMessages(history);

    // If we don't have an assistant message after the last user message, the run is likely mid-stream.
    // Replay persisted delta events from Postgres so the user immediately sees partial output after refresh.
    try {
      const lastUserIdx = (() => {
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i]?.role === 'user') return i;
        }
        return -1;
      })();

      const hasAssistantAfterLastUser = lastUserIdx >= 0
        ? history.slice(lastUserIdx + 1).some(m => m?.role === 'assistant')
        : true;

      if (!hasAssistantAfterLastUser) {
        const events = await loadRunEvents(newRunId);
        for (const evt of events) {
          if (attachedRunIdRef.current !== newRunId) return;
          if (evt.type === 'text.delta' || evt.type === 'reasoning.delta' || evt.type === 'tool.call' || evt.type === 'tool.result' || evt.type === 'run.completed' || evt.type === 'run.failed' || evt.type === 'stream.error') {
            processEvent(evt);
          }
        }
      }
    } catch {
      // ignore
    }

    // Start streaming live updates
    startStream(newRunId);
  }, [startStream, loadRunMessages, loadRunEvents, processEvent]);

  useEffect(() => {
    if (!providedRunId) return;
    if (attachedRunIdRef.current === providedRunId) return;
    attachToRun(providedRunId);
  }, [providedRunId, attachToRun]);

  const createRun = useCallback(async () => {
    if (!agentId || !isReady) {
      throw new Error('Agent not ready yet');
    }

    const response = await fetch(`${gatewayUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create run: ${response.statusText}`);
    }

    const data = (await response.json()) as { runId?: string };
    if (!data?.runId) {
      throw new Error('Failed to create run: missing runId');
    }

    // Clear messages for new run
    setMessages([]);
    setRunId(data.runId);
    attachedRunIdRef.current = data.runId;

    // Reset streaming/draft refs for this run
    currentTextRef.current = '';
    currentReasoningRef.current = '';
    draftAssistantIdRef.current = null;

    startStream(data.runId);
    return data.runId;
  }, [agentId, gatewayUrl, isReady, startStream]);

  // Send message
  const sendMessage = useCallback(async (text: string, files?: Array<{ url: string; mediaType: string; name?: string }>) => {
    if (!agentId || !isReady) {
      throw new Error('Agent not ready yet');
    }

    const trimmed = text.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    let currentRunId = runId;
    if (!currentRunId) {
      currentRunId = await createRun();
    }

    const parts: GatewayMessagePart[] = [];
    if (trimmed) {
      parts.push({ type: 'text', text: trimmed });
    }
    for (const f of files || []) {
      parts.push({
        type: 'file',
        data: f.url,
        mediaType: f.mediaType,
        ...(f.name ? { name: f.name } : {}),
      });
    }

    const userMessage: GatewayMessage = {
      id: `msg_${genId()}`,
      role: 'user',
      parts,
      createdAt: Date.now(),
    };

    upsertMessageById(userMessage);

    currentTextRef.current = '';
    currentReasoningRef.current = '';
    draftAssistantIdRef.current = null;
    ensureDraftAssistant();

    try {
      setIsStreaming(true);
      setStatus('running');
      setError(null);

      const response = await fetch(`${gatewayUrl}/api/runs/${currentRunId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          senderId: senderId ?? null,
          senderName: senderName ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setStatus('error');
      setIsStreaming(false);
      onError?.(error);
    }
  }, [agentId, isReady, runId, createRun, gatewayUrl, onError, senderId, senderName, ensureDraftAssistant, upsertMessageById]);

  // Stop current run
  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setStatus('idle');
  }, []);

  // Reset
  const reset = useCallback(() => {
    stop();
    setMessages([]);
    setRunId(null);
    setError(null);
    setPendingToolCalls([]);
    currentTextRef.current = '';
    currentReasoningRef.current = '';
    draftAssistantIdRef.current = null;
    attachedRunIdRef.current = null;
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    messages,
    isStreaming,
    status,
    runId,
    agentId,
    isReady,
    error,
    pendingToolCalls,
    loadRuns,
    deleteRun,
    createRun,
    attachToRun,
    sendMessage,
    addToolResult,
    stop,
    reset,
  };
}
