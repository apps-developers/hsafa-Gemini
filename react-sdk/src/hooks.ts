import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createHsafaClient, HsafaHttpError, type HsafaClient } from './client.js';
import type {
  Entity,
  HsafaSseEvent,
  SmartSpace,
  SmartSpaceMessageRecord,
  SmartSpaceStreamPayload,
  SmartSpaceStreamMessage,
  PendingToolCall,
} from './types.js';

export function useHsafaClient(input: { gatewayUrl?: string } = {}): HsafaClient {
  const gatewayUrl = input.gatewayUrl ?? '';
  return useMemo(() => createHsafaClient({ gatewayUrl }), [gatewayUrl]);
}

export function useSmartSpaces(
  client: HsafaClient,
  input: { entityId?: string; limit?: number; offset?: number } = {}
): {
  smartSpaces: SmartSpace[];
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
} {
  const [smartSpaces, setSmartSpaces] = useState<SmartSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.listSmartSpaces(input);
      setSmartSpaces(res);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [client, input.entityId, input.limit, input.offset]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { smartSpaces, isLoading, error, refresh };
}

export function useSmartSpaceMembers(
  client: HsafaClient,
  input: { smartSpaceId: string | null }
): {
  members: Entity[];
  membersById: Record<string, Entity>;
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
} {
  const smartSpaceId = input.smartSpaceId;
  const [members, setMembers] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!smartSpaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.listSmartSpaceMembers({ smartSpaceId });
      const entities = res.map((m) => m.entity).filter((e): e is Entity => !!e);
      setMembers(entities);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [client, smartSpaceId]);

  useEffect(() => {
    setMembers([]);
    setError(null);
    if (!smartSpaceId) return;
    refresh();
  }, [smartSpaceId, refresh]);

  const membersById = useMemo(() => {
    const map: Record<string, Entity> = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  return { members, membersById, isLoading, error, refresh };
}

interface StreamingMessage {
  id: string;
  runId: string;
  entityId: string;
  role: string;
  parts: SmartSpaceStreamMessage['parts'];
  isStreaming: boolean;
}

interface StreamingToolCall {
  id: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  argsText: string;
  isStreaming: boolean;
}

export type ToolExecutor = (toolName: string, args: unknown) => Promise<unknown>;

function parseHsafaEvent(raw: string): HsafaSseEvent {
  const evt = JSON.parse(raw) as HsafaSseEvent;
  if (!evt || typeof evt !== 'object') throw new Error('Invalid SSE event');
  return evt;
}

export function useSmartSpaceMessages(
  client: HsafaClient,
  input: { smartSpaceId: string | null; limit?: number; toolExecutor?: ToolExecutor }
): {
  messages: SmartSpaceMessageRecord[];
  streamingMessages: StreamingMessage[];
  streamingToolCalls: StreamingToolCall[];
  pendingToolCalls: PendingToolCall[];
  isLoading: boolean;
  isConnected: boolean;
  error: unknown;
  sendMessage: (args: { entityId: string; content: string }) => Promise<void>;
  submitToolResult: (toolCallId: string, result: unknown) => Promise<void>;
  refresh: () => Promise<void>;
  lastSeq: string | null;
} {
  const smartSpaceId = input.smartSpaceId;
  const limit = input.limit ?? 50;
  const toolExecutor = input.toolExecutor;

  const [messages, setMessages] = useState<SmartSpaceMessageRecord[]>([]);
  const [streamingMessages, setStreamingMessages] = useState<StreamingMessage[]>([]);
  const [streamingToolCalls, setStreamingToolCalls] = useState<StreamingToolCall[]>([]);
  const [pendingToolCalls, setPendingToolCalls] = useState<PendingToolCall[]>([]);

  const toolExecutorRef = useRef(toolExecutor);
  useEffect(() => {
    toolExecutorRef.current = toolExecutor;
  }, [toolExecutor]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastSeq, setLastSeq] = useState<string | null>(null);

  const lastSeqRef = useRef<string | null>(null);
  useEffect(() => {
    lastSeqRef.current = lastSeq;
  }, [lastSeq]);

  const refresh = useCallback(async () => {
    if (!smartSpaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.listSmartSpaceMessages({ smartSpaceId, limit });
      setMessages(res);
      const newest = res.length > 0 ? res[res.length - 1] : null;
      setLastSeq(newest?.seq ?? null);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [client, smartSpaceId, limit]);

  useEffect(() => {
    setMessages([]);
    setStreamingMessages([]);
    setStreamingToolCalls([]);
    setPendingToolCalls([]);
    setLastSeq(null);
    setError(null);
    setIsConnected(false);
    if (!smartSpaceId) return;
    refresh();
  }, [smartSpaceId, refresh]);

  useEffect(() => {
    if (!smartSpaceId) return;

    const base = client.apiBaseUrl;
    const url = new URL(`${base}/smart-spaces/${smartSpaceId}/stream`, window.location.origin);

    const es = new EventSource(url.toString());

    es.onopen = () => {
      setIsConnected(true);

      const currentLastSeq = lastSeqRef.current;
      client
        .listSmartSpaceMessages({
          smartSpaceId,
          afterSeq: currentLastSeq ?? undefined,
          limit: 200,
        })
        .then((newMsgs) => {
          if (newMsgs.length === 0) return;

          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of newMsgs) {
              if (!existingIds.has(m.id)) merged.push(m);
            }
            return merged;
          });

          const newest = newMsgs[newMsgs.length - 1];
          setLastSeq(newest.seq);
        })
        .catch(() => {});
    };

    const handleMessage = (evt: MessageEvent) => {
      try {
        const parsed = parseHsafaEvent(evt.data);
        const payload = parsed.data as SmartSpaceStreamPayload<Record<string, unknown>>;

        const payloadData = (payload?.data ?? null) as Record<string, unknown> | null;

        const runId =
          typeof payload?.runId === 'string'
            ? payload.runId
            : typeof payloadData?.runId === 'string'
              ? (payloadData.runId as string)
              : null;

        const agentEntityId =
          typeof payload?.agentEntityId === 'string'
            ? payload.agentEntityId
            : typeof payloadData?.agentEntityId === 'string'
              ? (payloadData.agentEntityId as string)
              : null;

        const upsertStreamingMessage = (input: {
          runId: string;
          agentEntityId: string | null;
          appendTextDelta?: string;
          isStreaming?: boolean;
        }) => {
          setStreamingMessages((prev) => {
            const idx = prev.findIndex((m) => m.runId === input.runId);

            // Can't create a placeholder without agentEntityId.
            if (idx === -1 && !input.agentEntityId) return prev;

            const base: StreamingMessage =
              idx === -1
                ? {
                    id: `streaming-${input.runId}`,
                    runId: input.runId,
                    entityId: input.agentEntityId as string,
                    role: 'assistant',
                    parts: [],
                    isStreaming: true,
                  }
                : prev[idx];

            let nextParts = base.parts;
            if (input.appendTextDelta) {
              const last = nextParts[nextParts.length - 1];
              if (last && last.type === 'text') {
                nextParts = [...nextParts.slice(0, -1), { type: 'text', text: last.text + input.appendTextDelta }];
              } else {
                nextParts = [...nextParts, { type: 'text', text: input.appendTextDelta }];
              }
            }

            const next: StreamingMessage = {
              ...base,
              parts: nextParts,
              isStreaming: input.isStreaming ?? base.isStreaming,
            };

            if (idx === -1) return [...prev, next];
            return [...prev.slice(0, idx), next, ...prev.slice(idx + 1)];
          });
        };

        const upsertStreamingToolCall = (input: {
          runId: string;
          toolCallId: string;
          toolName?: string;
          appendDelta?: string;
          isStreaming?: boolean;
        }) => {
          setStreamingToolCalls((prev) => {
            const idx = prev.findIndex((t) => t.toolCallId === input.toolCallId);
            const base: StreamingToolCall =
              idx === -1
                ? {
                    id: `toolcall-${input.toolCallId}`,
                    runId: input.runId,
                    toolCallId: input.toolCallId,
                    toolName: input.toolName ?? 'tool',
                    argsText: '',
                    isStreaming: true,
                  }
                : prev[idx];

            const next: StreamingToolCall = {
              ...base,
              toolName: input.toolName ?? base.toolName,
              argsText: input.appendDelta ? base.argsText + input.appendDelta : base.argsText,
              isStreaming: input.isStreaming ?? base.isStreaming,
            };

            if (idx === -1) return [...prev, next];
            return [...prev.slice(0, idx), next, ...prev.slice(idx + 1)];
          });
        };

        if (parsed.type === 'smartSpace.message') {
          // A complete message was posted - fetch any new messages after the last *message* seq.
          // Note: Redis stream seq is not the same as SmartSpaceMessage.seq.
          const currentLastSeq = lastSeqRef.current;

          client
            .listSmartSpaceMessages({
              smartSpaceId,
              afterSeq: currentLastSeq ?? undefined,
              limit: 200,
            })
            .then((newMsgs) => {
              if (newMsgs.length === 0) return;

              setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const merged = [...prev];
                for (const m of newMsgs) {
                  if (!existingIds.has(m.id)) merged.push(m);
                }
                return merged;
              });

              const newest = newMsgs[newMsgs.length - 1];
              setLastSeq(newest.seq);

              // Only remove streaming messages when the final assistant text message is persisted.
              // Tool-call and tool-result messages are also persisted mid-run and should not kill streaming UI.
              const persistedAssistantTextRunIds = new Set<string>();
              for (const m of newMsgs) {
                const rid = m.runId;
                if (typeof rid !== 'string' || rid.length === 0) continue;
                if (m.role !== 'assistant') continue;
                if (typeof m.content === 'string' && m.content.trim().length > 0) {
                  persistedAssistantTextRunIds.add(rid);
                }
              }
              if (persistedAssistantTextRunIds.size > 0) {
                setStreamingMessages((prev) => prev.filter((sm) => !persistedAssistantTextRunIds.has(sm.runId)));
              }

              // Remove streaming tool calls if their toolCallId is now persisted in the DB
              const persistedToolCallIds = new Set<string>();
              for (const m of newMsgs) {
                const uiMessage = (m.metadata as any)?.uiMessage;
                const parts = uiMessage?.parts;
                if (!Array.isArray(parts)) continue;
                for (const p of parts) {
                  if (p && typeof p === 'object' && p.type === 'tool-call' && typeof p.toolCallId === 'string') {
                    persistedToolCallIds.add(p.toolCallId);
                  }
                }
              }
              if (persistedToolCallIds.size > 0) {
                setStreamingToolCalls((prev) => prev.filter((t) => !persistedToolCallIds.has(t.toolCallId)));
              }
            })
            .catch(() => {});
        } else if (parsed.type === 'run.created') {
          // A run started - create streaming message placeholder
          if (!runId) return;
          upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
        } else if (parsed.type === 'run.started') {
          // Runs can be restarted (e.g., after client tool results). Ensure placeholder exists.
          if (!runId) return;
          upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
        } else if (parsed.type === 'run.waiting_tool') {
          // The run is paused waiting for a tool result.
          if (!runId) return;
          upsertStreamingMessage({ runId, agentEntityId, isStreaming: false });
        } else if (parsed.type === 'text.delta') {
          // Streaming content update for a run
          if (!runId) return;
          const data = payload.data as { delta?: unknown };
          const delta = typeof data?.delta === 'string' ? data.delta : null;
          if (!delta) return;

          upsertStreamingMessage({ runId, agentEntityId, appendTextDelta: delta, isStreaming: true });
        } else if (parsed.type === 'tool.input.start') {
          if (!runId) return;
          const data = payload.data as { toolCallId?: unknown; toolName?: unknown };
          const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
          const toolName = typeof data?.toolName === 'string' ? data.toolName : null;
          if (!toolCallId || !toolName) return;
          // Ensure we have a streaming message container so tool UI can show while args stream.
          upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
          upsertStreamingToolCall({ runId, toolCallId, toolName, isStreaming: true });
        } else if (parsed.type === 'tool.input.delta') {
          if (!runId) return;
          const data = payload.data as { toolCallId?: unknown; delta?: unknown };
          const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
          const delta = typeof data?.delta === 'string' ? data.delta : null;
          if (!toolCallId || !delta) return;
          // Ensure we have a streaming message container so tool UI can show while args stream.
          upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
          upsertStreamingToolCall({
            runId,
            toolCallId,
            toolName: undefined,
            appendDelta: delta,
            isStreaming: true,
          });
        } else if (parsed.type === 'tool.call') {
          // A tool call is ready for execution (args fully streamed)
          if (!runId) return;
          const data = payload.data as { toolCallId?: unknown; toolName?: unknown; args?: unknown; executionTarget?: unknown };
          const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
          const toolName = typeof data?.toolName === 'string' ? data.toolName : null;
          const args = data?.args ?? {};
          const executionTarget = typeof data?.executionTarget === 'string' ? data.executionTarget : 'server';
          
          if (!toolCallId || !toolName) return;

          // Mark tool input streaming complete and ensure argsText is populated.
          upsertStreamingToolCall({
            runId,
            toolCallId,
            toolName,
            appendDelta: '',
            isStreaming: false,
          });
          
          // Only handle client-side tools
          if (executionTarget === 'client') {
            const pending: PendingToolCall = {
              runId,
              toolCallId,
              toolName,
              args,
              argsText: JSON.stringify(args),
              status: 'pending',
            };
            
            setPendingToolCalls((prev) => {
              // Don't add duplicates
              if (prev.some((p) => p.toolCallId === toolCallId)) return prev;
              return [...prev, pending];
            });
            
            // Auto-execute if toolExecutor is provided
            if (toolExecutorRef.current) {
              setPendingToolCalls((prev) =>
                prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'executing' } : p))
              );
              
              toolExecutorRef.current(toolName, args)
                .then((result) => {
                  setPendingToolCalls((prev) =>
                    prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'completed', result } : p))
                  );
                  // Submit result to gateway
                  client.submitToolResult({ runId, callId: toolCallId, result }).catch(() => {});
                })
                .catch((err) => {
                  const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                  setPendingToolCalls((prev) =>
                    prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'error', error: errorMsg } : p))
                  );
                  // Submit error result to gateway
                  client.submitToolResult({ runId, callId: toolCallId, result: { error: errorMsg } }).catch(() => {});
                });
            }
          }
        } else if (parsed.type === 'tool.result') {
          // A tool result was received - remove from pending
          const data = payload.data as { toolCallId?: unknown };
          const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
          if (toolCallId) {
            setPendingToolCalls((prev) => prev.filter((p) => p.toolCallId !== toolCallId));
          }
        } else if (parsed.type === 'run.completed' || parsed.type === 'run.failed') {
          // Run finished - mark streaming complete, will be replaced by persisted message
          if (!runId) return;
          upsertStreamingMessage({ runId, agentEntityId, isStreaming: false });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.addEventListener('hsafa', handleMessage as EventListener);

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.removeEventListener('hsafa', handleMessage as EventListener);
      es.close();
      setIsConnected(false);
    };
  }, [client, smartSpaceId]);

  const sendMessage = useCallback(
    async (args: { entityId: string; content: string }) => {
      if (!smartSpaceId) return;
      setError(null);
      try {
        await client.sendSmartSpaceMessage({
          smartSpaceId,
          entityId: args.entityId,
          content: args.content,
        });
      } catch (e) {
        setError(e);
        if (e instanceof HsafaHttpError) throw e;
        throw e;
      }
    },
    [client, smartSpaceId]
  );

  const submitToolResult = useCallback(
    async (toolCallId: string, result: unknown) => {
      const pending = pendingToolCalls.find((p) => p.toolCallId === toolCallId);
      if (!pending) return;
      
      setPendingToolCalls((prev) =>
        prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'completed', result } : p))
      );
      
      await client.submitToolResult({
        runId: pending.runId,
        callId: toolCallId,
        result,
      });
    },
    [client, pendingToolCalls]
  );

  return { messages, streamingMessages, streamingToolCalls, pendingToolCalls, isLoading, isConnected, error, sendMessage, submitToolResult, refresh, lastSeq };
}
