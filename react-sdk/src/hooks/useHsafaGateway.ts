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
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_BASE_DELAY = 1000;

  const hydrateStateRef = useRef<{
    active: boolean;
    runId: string | null;
    sseCutoffIso: string | null;
  }>({ active: false, runId: null, sseCutoffIso: null });
  const bufferedSseEventsRef = useRef<StreamEvent[]>([]);

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
    const currentRunId = attachedRunIdRef.current;
    if (!currentRunId) return;

    if (typeof payload === 'string') {
      return;
    }

    const p = payload as Record<string, unknown>;
    const toolCallId = typeof p.toolCallId === 'string' ? p.toolCallId : undefined;
    const result = p.output ?? p.result;
    if (!toolCallId) return;

    setPendingToolCalls(prev => prev.filter(tc => tc.id !== toolCallId));
    await sendToolResult(currentRunId, toolCallId, result);
  }, [sendToolResult]);

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

      case 'reasoning.start':
        setStatus('streaming');
        setIsStreaming(true);
        currentReasoningRef.current = '';
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

      case 'step.start':
      case 'step.finish':
      case 'stream.finish':
      case 'tool.input.start':
      case 'tool.input.delta':
        // These are informational events - we don't need to update UI for them
        // but we acknowledge them to prevent unknown event warnings
        break;

      case 'agent.build.error': {
        const d = data as Record<string, unknown> | null | undefined;
        const errorMsg = typeof d?.error === 'string' ? d.error : 'Agent build failed';
        const err = new Error(errorMsg);
        setError(err);
        setStatus('error');
        setIsStreaming(false);
        onError?.(err);
        break;
      }

      case 'message.user':
      case 'message.assistant':
      case 'message.tool': {
        const maybeMessage = (data as { message?: unknown } | null | undefined)?.message;
        const msg = maybeMessage as GatewayMessage | undefined;
        if (!msg || typeof msg !== 'object' || typeof msg.id !== 'string') break;

        // If we have a draft assistant and this is the final message.assistant,
        // finalize the draft by merging streamed content with final message
        if (type === 'message.assistant' && draftAssistantIdRef.current) {
          const draftId = draftAssistantIdRef.current;
          draftAssistantIdRef.current = null;

          setMessages(prev => {
            const draftIdx = prev.findIndex(m => m.id === draftId);
            if (draftIdx === -1) {
              // Draft not found, just add the final message if not duplicate
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            }

            const draft = prev[draftIdx];
            const draftParts = Array.isArray(draft.parts) ? draft.parts : [];
            const finalParts = Array.isArray(msg.parts) ? msg.parts : [];

            // Build merged parts: prefer streamed content over final for text/reasoning
            const mergedParts: GatewayMessagePart[] = [];

            // Add reasoning from draft if we have streamed reasoning
            const streamedReasoning = currentReasoningRef.current;
            const draftReasoningPart = draftParts.find(p => p.type === 'reasoning');
            if (streamedReasoning || draftReasoningPart) {
              const reasoningText = streamedReasoning || (draftReasoningPart as { text?: string })?.text || '';
              if (reasoningText) {
                mergedParts.push({ type: 'reasoning', text: reasoningText });
              }
            }

            // Add text from draft if we have streamed text
            const streamedText = currentTextRef.current;
            const draftTextPart = draftParts.find(p => p.type === 'text');
            const finalTextPart = finalParts.find(p => p.type === 'text');
            const textToUse = streamedText || (draftTextPart as { text?: string })?.text || (finalTextPart as { text?: string })?.text || '';
            if (textToUse) {
              mergedParts.push({ type: 'text', text: textToUse });
            }

            // Add any tool-call parts from final message
            for (const part of finalParts) {
              if (part.type === 'tool-call') {
                mergedParts.push(part);
              }
            }

            // Replace draft with finalized message
            const updated = [...prev];
            updated[draftIdx] = { ...draft, id: msg.id, parts: mergedParts };

            // Reset refs
            currentTextRef.current = '';
            currentReasoningRef.current = '';

            return updated;
          });
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
              const currentRunId = attachedRunIdRef.current;
              if (!currentRunId) return;
              sendToolResult(currentRunId, toolCall.id, result);
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

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Start SSE stream for a run with reconnection support
  const startStream = useCallback((currentRunId: string, isReconnect = false) => {
    // Close existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    clearReconnectTimeout();

    if (!isReconnect) {
      reconnectAttemptsRef.current = 0;
    }

    const eventSource = new EventSource(`${gatewayUrl}/api/runs/${currentRunId}/stream`);
    eventSourceRef.current = eventSource;
    attachedRunIdRef.current = currentRunId;
    const streamRunId = currentRunId;

    eventSource.onopen = () => {
      // Reset reconnect attempts on successful connection
      reconnectAttemptsRef.current = 0;

      if (hydrateStateRef.current.active && hydrateStateRef.current.runId === streamRunId) {
        hydrateStateRef.current.sseCutoffIso = new Date().toISOString();
      }
    };

    eventSource.addEventListener('hsafa', (e) => {
      try {
        if (attachedRunIdRef.current !== streamRunId) return;
        const event: StreamEvent = JSON.parse(e.data);
        if (hydrateStateRef.current.active && hydrateStateRef.current.runId === streamRunId) {
          bufferedSseEventsRef.current.push(event);
          return;
        }
        processEvent(event);
      } catch (err) {
        console.error('Failed to parse event:', err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;

      // Only attempt reconnection if we're still attached to this run
      if (attachedRunIdRef.current !== streamRunId) return;

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;
        console.log(`SSE connection lost, reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (attachedRunIdRef.current === streamRunId) {
            startStream(streamRunId, true);
          }
        }, delay);
      } else {
        console.error('SSE reconnection failed after max attempts');
        setIsStreaming(false);
        setStatus(prev => prev === 'streaming' ? 'error' : prev);
        setError(new Error('Connection lost. Please refresh to reconnect.'));
      }
    };
  }, [gatewayUrl, processEvent, clearReconnectTimeout]);

  // Load run status from server
  const loadRunStatus = useCallback(async (targetRunId: string): Promise<{ status: string } | null> => {
    try {
      const response = await fetch(`${gatewayUrl}/api/runs/${targetRunId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.run ? { status: data.run.status } : null;
    } catch {
      return null;
    }
  }, [gatewayUrl]);

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
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setIsStreaming(false);
        setStatus('idle');
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
    clearReconnectTimeout();
    
    // Clear previous messages when attaching to a new run
    setMessages([]);
    setRunId(newRunId);
    attachedRunIdRef.current = newRunId;

    // Fetch the run status from server to determine if we should be streaming
    const runInfo = await loadRunStatus(newRunId);
    const serverStatus = runInfo?.status || 'unknown';
    
    // Set initial state based on server status
    const isActiveRun = serverStatus === 'running' || serverStatus === 'streaming' || serverStatus === 'waiting_tool';
    if (isActiveRun) {
      setIsStreaming(true);
      setStatus(serverStatus === 'waiting_tool' ? 'waiting_tool' : 'streaming');
    } else if (serverStatus === 'completed') {
      setIsStreaming(false);
      setStatus('completed');
    } else if (serverStatus === 'failed' || serverStatus === 'error') {
      setIsStreaming(false);
      setStatus('error');
    } else {
      setIsStreaming(false);
      setStatus('idle');
    }

    // Reset streaming/draft refs for this run
    currentTextRef.current = '';
    currentReasoningRef.current = '';
    draftAssistantIdRef.current = null;

    // Start SSE immediately and buffer events until we've hydrated history.
    // This prevents missing events that arrive during the hydration window.
    hydrateStateRef.current = { active: true, runId: newRunId, sseCutoffIso: null };
    bufferedSseEventsRef.current = [];
    startStream(newRunId);
    
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
        const cutoffIso = hydrateStateRef.current.runId === newRunId
          ? (hydrateStateRef.current.sseCutoffIso || new Date().toISOString())
          : new Date().toISOString();

        // Only replay events strictly before SSE cutoff.
        // Anything after the cutoff will be delivered by SSE and is buffered until hydration finishes.
        for (const evt of events) {
          if (attachedRunIdRef.current !== newRunId) return;

          if (typeof evt.ts === 'string' && evt.ts >= cutoffIso) continue;

          if (evt.type === 'text.delta' || evt.type === 'reasoning.delta' || evt.type === 'tool.call' || evt.type === 'tool.result' || evt.type === 'run.completed' || evt.type === 'run.failed' || evt.type === 'stream.error') {
            processEvent(evt);
          }
        }
      }
    } catch {
      // ignore
    }

    // Flush buffered SSE events now that hydration is complete.
    // We also drop any buffered events before the SSE cutoff since those were covered by replay.
    if (hydrateStateRef.current.runId === newRunId) {
      const cutoffIso = hydrateStateRef.current.sseCutoffIso || new Date().toISOString();
      const buffered = bufferedSseEventsRef.current;
      bufferedSseEventsRef.current = [];
      hydrateStateRef.current = { active: false, runId: null, sseCutoffIso: null };

      for (const evt of buffered) {
        if (attachedRunIdRef.current !== newRunId) return;
        if (typeof evt.ts === 'string' && evt.ts < cutoffIso) continue;
        processEvent(evt);
      }
    } else {
      hydrateStateRef.current = { active: false, runId: null, sseCutoffIso: null };
      bufferedSseEventsRef.current = [];
    }
  }, [startStream, loadRunMessages, loadRunEvents, processEvent, loadRunStatus, clearReconnectTimeout]);

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

    // Create abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setStatus('error');
      setIsStreaming(false);
      onError?.(error);
    }
  }, [agentId, isReady, runId, createRun, gatewayUrl, onError, senderId, senderName, ensureDraftAssistant, upsertMessageById]);

  // Stop current run
  const stop = useCallback(() => {
    // Cancel any pending fetch operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Close SSE stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    // Clear reconnect timeout
    clearReconnectTimeout();
    setIsStreaming(false);
    setStatus('idle');
  }, [clearReconnectTimeout]);

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
    reconnectAttemptsRef.current = 0;
    hydrateStateRef.current = { active: false, runId: null, sseCutoffIso: null };
    bufferedSseEventsRef.current = [];
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
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
