"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useHsafaClient } from '../context.js';
import type {
  SmartSpaceMessage,
  SmartSpace,
  StreamEvent,
  HsafaStream,
  Membership,
  Entity,
} from '../types.js';

// =============================================================================
// Types for assistant-ui integration
// =============================================================================

export interface TextContentPart {
  type: 'text';
  text: string;
}

export interface ToolCallContentPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  argsText?: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

export interface ReasoningContentPart {
  type: 'reasoning';
  text: string;
}

export type ContentPart = TextContentPart | ToolCallContentPart | ReasoningContentPart;

export interface ThreadMessageLike {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: ContentPart[] | string;
  createdAt?: Date;
  metadata?: { custom?: Record<string, unknown> };
}

export interface AppendMessage {
  content: ReadonlyArray<{ type: string; text?: string }>;
  parentId?: string | null;
}

export interface ThreadListAdapter {
  threadId?: string;
  threads: Array<{ threadId: string; status: 'regular'; title: string }>;
  archivedThreads: Array<{ threadId: string; status: 'archived'; title: string }>;
  onSwitchToThread: (threadId: string) => void;
  onSwitchToNewThread?: () => void;
}

// =============================================================================
// Streaming message state
// =============================================================================

type StreamingPart =
  | { type: 'reasoning'; text: string }
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; argsText: string; args?: Record<string, unknown>; result?: unknown; status: 'running' | 'complete' };

interface StreamingMessage {
  id: string;
  entityId: string;
  parts: StreamingPart[];
  isStreaming: boolean;
}

// =============================================================================
// Hook Options & Return
// =============================================================================

export interface UseHsafaRuntimeOptions {
  smartSpaceId: string | null;
  entityId?: string;
  smartSpaces?: SmartSpace[];
  onSwitchThread?: (smartSpaceId: string) => void;
  onNewThread?: () => void;
}

export interface UseHsafaRuntimeReturn {
  messages: ThreadMessageLike[];
  isRunning: boolean;
  onNew: (message: AppendMessage) => Promise<void>;
  threadListAdapter?: ThreadListAdapter;
  membersById: Record<string, Entity>;
}

// =============================================================================
// Helper: Merge consecutive reasoning parts
// e.g. [reasoning, reasoning, tool-call, reasoning, text]
//    → [reasoning(merged), tool-call, reasoning, text]
// =============================================================================

function mergeConsecutiveReasoning(parts: ContentPart[]): ContentPart[] {
  const merged: ContentPart[] = [];
  for (const part of parts) {
    const prev = merged[merged.length - 1];
    if (part.type === 'reasoning' && prev?.type === 'reasoning') {
      // Merge into the previous reasoning part
      merged[merged.length - 1] = { type: 'reasoning', text: prev.text + part.text };
    } else {
      merged.push(part);
    }
  }
  return merged;
}

// =============================================================================
// Helper: Convert SmartSpaceMessage → ThreadMessageLike
// =============================================================================

function convertMessage(msg: SmartSpaceMessage, currentEntityId?: string): ThreadMessageLike | null {
  if (msg.role === 'tool') return null;

  // Determine the display role:
  // - Current user's messages → 'user' (right-aligned)
  // - Other humans' messages → 'assistant' with isOtherHuman flag (left-aligned)
  // - Agent/assistant messages → 'assistant'
  let role: 'user' | 'assistant' = msg.role === 'user' ? 'user' : 'assistant';
  let isOtherHuman = false;

  if (msg.role === 'user' && currentEntityId && msg.entityId && msg.entityId !== currentEntityId) {
    role = 'assistant';
    isOtherHuman = true;
  }

  const content: ContentPart[] = [];

  // Extract structured parts from metadata.uiMessage (includes reasoning + tool calls)
  const uiMessage = (msg.metadata as any)?.uiMessage;
  if (uiMessage?.parts && Array.isArray(uiMessage.parts)) {
    for (const part of uiMessage.parts) {
      if (part.type === 'reasoning' && part.text) {
        content.push({ type: 'reasoning', text: part.text });
      } else if (part.type === 'text' && part.text) {
        content.push({ type: 'text', text: part.text });
      } else if (part.type === 'tool-call') {
        content.push({
          type: 'tool-call',
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args,
          result: part.result,
        });
      }
    }
  }

  // Fallback to plain content if no structured parts
  if (content.length === 0) {
    const text = msg.content || '';
    if (!text.trim()) return null;
    content.push({ type: 'text', text });
  }

  return {
    id: msg.id,
    role,
    content: mergeConsecutiveReasoning(content),
    createdAt: new Date(msg.createdAt),
    metadata: { custom: { entityId: msg.entityId || undefined, isOtherHuman } },
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useHsafaRuntime(options: UseHsafaRuntimeOptions): UseHsafaRuntimeReturn {
  const client = useHsafaClient();
  const {
    smartSpaceId,
    entityId,
    smartSpaces = [],
    onSwitchThread,
    onNewThread,
  } = options;

  // State
  const [rawMessages, setRawMessages] = useState<SmartSpaceMessage[]>([]);
  const [streamingMessages, setStreamingMessages] = useState<StreamingMessage[]>([]);
  const [membersById, setMembersById] = useState<Record<string, Entity>>({});
  const streamRef = useRef<HsafaStream | null>(null);
  // Signals that initial messages have been loaded, so SSE can safely subscribe.
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  // Load initial messages
  useEffect(() => {
    if (!smartSpaceId) {
      setRawMessages([]);
      setStreamingMessages([]);
      setMessagesLoaded(false);
      return;
    }

    setMessagesLoaded(false);
    client.messages.list(smartSpaceId, { limit: 100 }).then(({ messages }) => {
      setRawMessages(messages);
      setMessagesLoaded(true);
    }).catch(() => {
      setMessagesLoaded(true);
    });
  }, [client, smartSpaceId]);

  // Load members
  useEffect(() => {
    if (!smartSpaceId) {
      setMembersById({});
      return;
    }

    client.spaces.listMembers(smartSpaceId).then(({ members }) => {
      const map: Record<string, Entity> = {};
      for (const m of members) {
        if (m.entity) {
          map[m.entityId] = m.entity;
        }
      }
      setMembersById(map);
    }).catch(() => {});
  }, [client, smartSpaceId]);

  // Subscribe to SSE — deferred until initial messages are loaded.
  // First reconstructs streaming state for active runs, THEN connects SSE
  // so text-delta events append to pre-populated entries instead of creating new ones.
  useEffect(() => {
    if (!smartSpaceId || !messagesLoaded) return;

    let cancelled = false;

    const init = async () => {
      // Step 1: Reconstruct streaming state for any in-progress runs so a
      // page refresh mid-stream shows the accumulated text immediately.
      try {
        const { runs } = await client.spaces.listRuns(smartSpaceId, { status: 'running' });
        for (const run of runs) {
          if (cancelled) return;
          try {
            const { events } = await client.runs.getEvents(run.id);
            let text = '';
            let reasoning = '';
            for (const ev of events) {
              if (ev.type === 'text-delta') {
                text += (ev.payload?.delta as string) || '';
              } else if (ev.type === 'reasoning-delta') {
                reasoning += (ev.payload?.delta as string) || '';
              }
            }
            if (text || reasoning) {
              const reconstructedParts: StreamingPart[] = [];
              // Build ordered parts from events
              let currentReasoning = '';
              let currentText = '';
              for (const ev of events) {
                if (ev.type === 'reasoning-delta') {
                  currentReasoning += (ev.payload?.delta as string) || '';
                } else if (ev.type === 'text-delta') {
                  // Flush reasoning before text
                  if (currentReasoning) {
                    reconstructedParts.push({ type: 'reasoning', text: currentReasoning });
                    currentReasoning = '';
                  }
                  currentText += (ev.payload?.delta as string) || '';
                } else if (ev.type === 'tool-input-available') {
                  // Flush reasoning before tool
                  if (currentReasoning) {
                    reconstructedParts.push({ type: 'reasoning', text: currentReasoning });
                    currentReasoning = '';
                  }
                  if (currentText) {
                    reconstructedParts.push({ type: 'text', text: currentText });
                    currentText = '';
                  }
                  reconstructedParts.push({
                    type: 'tool-call',
                    toolCallId: (ev.payload?.toolCallId as string) || '',
                    toolName: (ev.payload?.toolName as string) || '',
                    argsText: typeof ev.payload?.input === 'string' ? ev.payload.input : JSON.stringify(ev.payload?.input ?? {}),
                    args: (typeof ev.payload?.input === 'object' && ev.payload?.input !== null ? ev.payload.input : undefined) as Record<string, unknown> | undefined,
                    result: undefined,
                    status: 'running',
                  });
                } else if (ev.type === 'tool-output-available') {
                  const tcId = (ev.payload?.toolCallId as string) || '';
                  for (let j = reconstructedParts.length - 1; j >= 0; j--) {
                    const p = reconstructedParts[j];
                    if (p.type === 'tool-call' && p.toolCallId === tcId) {
                      reconstructedParts[j] = { ...p, result: ev.payload?.output, status: 'complete' };
                      break;
                    }
                  }
                }
              }
              // Flush remaining
              if (currentReasoning) reconstructedParts.push({ type: 'reasoning', text: currentReasoning });
              if (currentText) reconstructedParts.push({ type: 'text', text: currentText });

              setStreamingMessages((prev) => {
                if (prev.some((sm) => sm.id === run.id)) return prev;
                return [...prev, {
                  id: run.id,
                  entityId: run.agentEntityId,
                  parts: reconstructedParts,
                  isStreaming: true,
                }];
              });
            }
          } catch { /* run may have completed between list and getEvents */ }
        }
      } catch { /* failed to list runs — proceed without reconstruction */ }

      if (cancelled) return;

      // Step 2: Now subscribe to SSE — text-delta events will append to
      // the pre-populated entries created in step 1.
      const stream = client.spaces.subscribe(smartSpaceId);
      streamRef.current = stream;

      // Catch-up: re-fetch messages to cover the window between
      // the initial messages.list() and SSE connection establishment.
      client.messages.list(smartSpaceId, { limit: 100 }).then(({ messages: fresh }: { messages: SmartSpaceMessage[] }) => {
        setRawMessages((prev) => {
          const freshIds = new Set(fresh.map((m) => m.id));
          const sseOnly = prev.filter((m) => !freshIds.has(m.id));
          return [...fresh, ...sseOnly];
        });
      }).catch(() => {});

      stream.on('smartSpace.message', (event: StreamEvent) => {
        const raw = event.data?.message as Record<string, unknown> | undefined;
        if (!raw || !raw.id) return;

        // The gateway emits UI-formatted messages with `parts` array,
        // but SmartSpaceMessage uses `content`. Normalise here.
        let content = raw.content as string | undefined;
        if (!content && Array.isArray(raw.parts)) {
          content = (raw.parts as Array<{ type: string; text?: string }>)
            .filter((p) => p.type === 'text' && p.text)
            .map((p) => p.text)
            .join('\n');
        }

        // Reconstruct metadata.uiMessage from parts so convertMessage
        // can extract reasoning + tool-call parts from SSE messages.
        let metadata = (raw.metadata as Record<string, unknown>) || null;
        if (!metadata && Array.isArray(raw.parts)) {
          metadata = { uiMessage: { parts: raw.parts } };
        }

        const msg: SmartSpaceMessage = {
          id: raw.id as string,
          smartSpaceId: event.smartSpaceId || (raw.smartSpaceId as string) || '',
          entityId: (raw.entityId as string) || event.entityId || null,
          seq: (raw.seq as string) || String(event.seq || '0'),
          role: (raw.role as string) || 'user',
          content: content || null,
          metadata,
          createdAt: (raw.createdAt as string) || new Date().toISOString(),
        };

        if (!msg.content?.trim()) return;

        setRawMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // Remove streaming entry for this run (persisted message takes over)
        if (event.runId) {
          setStreamingMessages((prev) => prev.filter((sm) => sm.id !== event.runId));
        }
      });

      stream.on('run.created', (event: StreamEvent) => {
        const runId = (event.data.runId as string) || event.runId || '';
        const entityId = (event.data.agentEntityId as string) || event.entityId || '';
        if (!runId) return;

        setStreamingMessages((prev) => {
          if (prev.some((sm) => sm.id === runId)) return prev;
          return [...prev, {
            id: runId,
            entityId,
            parts: [],
            isStreaming: true,
          }];
        });
      });

      // Helper: ensure a streaming entry exists for a run
      const ensureEntry = (prev: StreamingMessage[], runId: string, entityId: string): StreamingMessage[] => {
        if (prev.some((sm) => sm.id === runId)) return prev;
        return [...prev, { id: runId, entityId, parts: [], isStreaming: true }];
      };

      stream.on('text-delta', (event: StreamEvent) => {
        const runId = event.runId || (event.data.runId as string);
        const delta = (event.data.delta as string) || (event.data.text as string) || '';
        if (!runId || !delta) return;

        setStreamingMessages((prev) => {
          prev = ensureEntry(prev, runId, event.entityId || '');
          return prev.map((sm) => {
            if (sm.id !== runId) return sm;
            const parts = [...sm.parts];
            const last = parts[parts.length - 1];
            if (last?.type === 'text') {
              parts[parts.length - 1] = { ...last, text: last.text + delta };
            } else {
              parts.push({ type: 'text', text: delta });
            }
            return { ...sm, parts };
          });
        });
      });

      stream.on('reasoning-delta', (event: StreamEvent) => {
        const runId = event.runId || (event.data.runId as string);
        const delta = (event.data.delta as string) || '';
        if (!runId || !delta) return;

        setStreamingMessages((prev) => {
          prev = ensureEntry(prev, runId, event.entityId || '');
          return prev.map((sm) => {
            if (sm.id !== runId) return sm;
            const parts = [...sm.parts];
            const last = parts[parts.length - 1];
            if (last?.type === 'reasoning') {
              parts[parts.length - 1] = { ...last, text: last.text + delta };
            } else {
              parts.push({ type: 'reasoning', text: delta });
            }
            return { ...sm, parts };
          });
        });
      });

      stream.on('tool-input-available', (event: StreamEvent) => {
        const runId = event.runId || (event.data.runId as string);
        if (!runId) return;

        const tc: StreamingPart & { type: 'tool-call' } = {
          type: 'tool-call',
          toolCallId: (event.data.toolCallId as string) || '',
          toolName: (event.data.toolName as string) || '',
          argsText: typeof event.data.input === 'string' ? event.data.input : JSON.stringify(event.data.input ?? {}),
          args: (typeof event.data.input === 'object' && event.data.input !== null ? event.data.input : undefined) as Record<string, unknown> | undefined,
          result: undefined,
          status: 'running',
        };

        setStreamingMessages((prev) =>
          prev.map((sm) =>
            sm.id === runId ? { ...sm, parts: [...sm.parts, tc] } : sm
          )
        );
      });

      stream.on('tool-output-available', (event: StreamEvent) => {
        const runId = event.runId || (event.data.runId as string);
        const toolCallId = (event.data.toolCallId as string) || '';
        if (!runId || !toolCallId) return;

        setStreamingMessages((prev) =>
          prev.map((sm) =>
            sm.id === runId
              ? {
                  ...sm,
                  parts: sm.parts.map((p) =>
                    p.type === 'tool-call' && p.toolCallId === toolCallId
                      ? { ...p, result: event.data.output, status: 'complete' as const }
                      : p
                  ),
                }
              : sm
          )
        );
      });

      stream.on('run.completed', (event: StreamEvent) => {
        const runId = event.runId || (event.data.runId as string);
        if (!runId) return;
        // Mark as not streaming but keep visible — will be removed
        // when smartSpace.message arrives with the persisted version.
        setStreamingMessages((prev) =>
          prev.map((sm) =>
            sm.id === runId ? { ...sm, isStreaming: false } : sm
          )
        );
      });

      stream.on('run.failed', (event: StreamEvent) => {
        const runId = event.runId || (event.data.runId as string);
        if (!runId) return;
        setStreamingMessages((prev) =>
          prev.map((sm) =>
            sm.id === runId ? { ...sm, isStreaming: false } : sm
          )
        );
      });

      stream.on('run.canceled', (event: StreamEvent) => {
        const runId = event.runId || (event.data.runId as string);
        if (!runId) return;
        setStreamingMessages((prev) =>
          prev.map((sm) =>
            sm.id === runId ? { ...sm, isStreaming: false } : sm
          )
        );
      });
    };

    init();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      setStreamingMessages([]);
    };
  }, [client, smartSpaceId, messagesLoaded]);

  // Build final message list
  const isRunning = streamingMessages.some((sm) => sm.isStreaming);

  const messages = useMemo<ThreadMessageLike[]>(() => {
    const persisted = rawMessages
      .map((m) => convertMessage(m, entityId))
      .filter((m): m is ThreadMessageLike => m !== null);

    const streaming = streamingMessages
      .filter((sm) => sm.parts.length > 0)
      .map((sm): ThreadMessageLike => {
        const content: ContentPart[] = sm.parts.map((p): ContentPart => {
          if (p.type === 'tool-call') {
            return {
              type: 'tool-call',
              toolCallId: p.toolCallId,
              toolName: p.toolName,
              argsText: p.argsText,
              args: p.args,
              result: p.result,
            };
          }
          return p;
        });

        return {
          id: sm.id,
          role: 'assistant',
          content: mergeConsecutiveReasoning(content),
          createdAt: new Date(),
          metadata: { custom: { entityId: sm.entityId } },
        };
      });

    return [...persisted, ...streaming];
  }, [rawMessages, streamingMessages]);

  // Send message
  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (!smartSpaceId) throw new Error('No SmartSpace selected');
      const firstPart = message.content[0];
      if (!firstPart || firstPart.type !== 'text' || !firstPart.text) {
        throw new Error('Only text messages are supported');
      }
      await client.messages.send(smartSpaceId, { content: firstPart.text, entityId });
    },
    [client, smartSpaceId, entityId]
  );

  // Thread list adapter
  // NOTE: intentionally NOT memoized — @assistant-ui/react's
  // ExternalStoreThreadListRuntimeCore compares adapter references
  // to detect changes, but its constructor never initialises _threads
  // from the adapter. A fresh object on each render ensures the first
  // setAdapter call after mount actually applies the data.
  const threadListAdapter: ThreadListAdapter | undefined =
    onSwitchThread
      ? {
          threadId: smartSpaceId ?? undefined,
          threads: smartSpaces.map((ss) => ({
            threadId: ss.id,
            status: 'regular' as const,
            title: ss.name ?? 'Untitled',
          })),
          archivedThreads: [],
          onSwitchToThread: (threadId: string) => {
            onSwitchThread(threadId);
          },
          onSwitchToNewThread: () => {
            onNewThread?.();
          },
        }
      : undefined;

  return {
    messages,
    isRunning,
    onNew,
    threadListAdapter,
    membersById,
  };
}
