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

export type ContentPart = TextContentPart | ToolCallContentPart;

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

interface StreamingMessage {
  id: string;
  entityId: string;
  text: string;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    argsText: string;
    args: Record<string, unknown> | undefined;
    result?: unknown;
    status: 'running' | 'complete';
  }>;
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
// Helper: Convert SmartSpaceMessage → ThreadMessageLike
// =============================================================================

function convertMessage(msg: SmartSpaceMessage): ThreadMessageLike | null {
  if (msg.role === 'tool') return null;

  const text = msg.content || '';
  if (!text.trim()) return null;

  return {
    id: msg.id,
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: [{ type: 'text', text }],
    createdAt: new Date(msg.createdAt),
    metadata: { custom: { entityId: msg.entityId || undefined } },
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
  const maxSeqRef = useRef<string>('0');

  // Load initial messages
  useEffect(() => {
    if (!smartSpaceId) {
      setRawMessages([]);
      setStreamingMessages([]);
      return;
    }

    client.messages.list(smartSpaceId, { limit: 100 }).then(({ messages }) => {
      setRawMessages(messages);
      if (messages.length > 0) {
        maxSeqRef.current = messages[messages.length - 1].seq;
      }
    }).catch(() => {});
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

  // Subscribe to SSE
  useEffect(() => {
    if (!smartSpaceId) return;

    const afterSeq = maxSeqRef.current !== '0' ? parseInt(maxSeqRef.current) : undefined;
    const stream = client.spaces.subscribe(smartSpaceId, { afterSeq });
    streamRef.current = stream;

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

      const msg: SmartSpaceMessage = {
        id: raw.id as string,
        smartSpaceId: event.smartSpaceId || (raw.smartSpaceId as string) || '',
        entityId: (raw.entityId as string) || event.entityId || null,
        seq: (raw.seq as string) || String(event.seq || '0'),
        role: (raw.role as string) || 'user',
        content: content || null,
        createdAt: (raw.createdAt as string) || new Date().toISOString(),
      };

      if (!msg.content?.trim()) return;

      setRawMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
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
          text: '',
          toolCalls: [],
          isStreaming: true,
        }];
      });
    });

    stream.on('text-delta', (event: StreamEvent) => {
      const runId = event.runId || (event.data.runId as string);
      const delta = (event.data.delta as string) || (event.data.text as string) || '';
      if (!runId || !delta) return;

      setStreamingMessages((prev) =>
        prev.map((sm) =>
          sm.id === runId ? { ...sm, text: sm.text + delta } : sm
        )
      );
    });

    stream.on('tool-input-available', (event: StreamEvent) => {
      const runId = event.runId || (event.data.runId as string);
      if (!runId) return;

      const tc = {
        toolCallId: (event.data.toolCallId as string) || '',
        toolName: (event.data.toolName as string) || '',
        argsText: typeof event.data.input === 'string' ? event.data.input : JSON.stringify(event.data.input ?? {}),
        args: (typeof event.data.input === 'object' && event.data.input !== null ? event.data.input : undefined) as Record<string, unknown> | undefined,
        result: undefined as unknown,
        status: 'running' as const,
      };

      setStreamingMessages((prev) =>
        prev.map((sm) =>
          sm.id === runId ? { ...sm, toolCalls: [...sm.toolCalls, tc] } : sm
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
                toolCalls: sm.toolCalls.map((tc) =>
                  tc.toolCallId === toolCallId
                    ? { ...tc, result: event.data.output, status: 'complete' as const }
                    : tc
                ),
              }
            : sm
        )
      );
    });

    stream.on('run.completed', (event: StreamEvent) => {
      const runId = event.runId || (event.data.runId as string);
      if (!runId) return;
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

    return () => {
      stream.close();
      streamRef.current = null;
      setStreamingMessages([]);
    };
  }, [client, smartSpaceId]);

  // Build final message list
  const isRunning = streamingMessages.some((sm) => sm.isStreaming);

  const messages = useMemo<ThreadMessageLike[]>(() => {
    const persisted = rawMessages
      .map(convertMessage)
      .filter((m): m is ThreadMessageLike => m !== null);

    const streaming = streamingMessages
      .filter((sm) => sm.isStreaming && sm.text.trim())
      .map((sm): ThreadMessageLike => {
        const content: ContentPart[] = [];

        if (sm.text) {
          content.push({ type: 'text', text: sm.text });
        }

        for (const tc of sm.toolCalls) {
          content.push({
            type: 'tool-call',
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            argsText: tc.argsText,
            args: tc.args,
            result: tc.result,
          });
        }

        return {
          id: sm.id,
          role: 'assistant',
          content,
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
