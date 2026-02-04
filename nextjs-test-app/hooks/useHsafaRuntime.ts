"use client";

import { useMemo } from "react";
import {
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
  type ExternalStoreThreadListAdapter,
} from "@assistant-ui/react";
import {
  useSmartSpaceMessages,
  useSmartSpaceMembers,
  smartSpaceMessageToText,
  smartSpaceStreamPartsToText,
  extractMessageParts,
  type HsafaClient,
  type SmartSpaceMessageRecord,
  type SmartSpace,
  type PendingToolCall,
} from "@hsafa/react-sdk";

export type ToolExecutor = (toolName: string, args: unknown) => Promise<unknown>;

export interface UseHsafaRuntimeOptions {
  client: HsafaClient;
  entityId: string;
  smartSpaceId: string | null;
  smartSpaces?: SmartSpace[];
  onSwitchThread?: (smartSpaceId: string) => void;
  onNewThread?: () => void;
  toolExecutor?: ToolExecutor;
}

type ContentPart = 
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      argsText?: string;
      result?: unknown;
    };

function convertSmartSpaceMessage(
  msg: SmartSpaceMessageRecord,
  toolResultsById: Map<string, unknown>
): ThreadMessageLike | null {
  // Skip tool role messages - they only contain tool-results which are handled internally
  if (msg.role === "tool") {
    return null;
  }

  const parts = extractMessageParts(msg);
  
  // Convert parts to ThreadMessageLike content
  const content: ContentPart[] = [];
  
  for (const part of parts) {
    if (part.type === "text") {
      content.push({ type: "text", text: part.text });
    } else if (part.type === "tool-call") {
      const args = part.args as Record<string, unknown>;
      content.push({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args,
        argsText: JSON.stringify(args),
        result: toolResultsById.get(part.toolCallId),
      });
    }
  }

  // If no content, add empty text
  if (content.length === 0) {
    const text = smartSpaceMessageToText(msg);
    content.push({ type: "text", text });
  }

  return {
    id: msg.id,
    role: msg.role === "user" ? "user" : "assistant",
    content: content as ThreadMessageLike["content"],
    createdAt: new Date(msg.createdAt),
    metadata: { custom: { entityId: msg.entityId } },
  };
}

export function useHsafaRuntime(options: UseHsafaRuntimeOptions) {
  const {
    client,
    entityId,
    smartSpaceId,
    smartSpaces = [],
    onSwitchThread,
    onNewThread,
    toolExecutor,
  } = options;

  const { membersById } = useSmartSpaceMembers(client, { smartSpaceId });

  const {
    messages: rawMessages,
    streamingMessages,
    streamingToolCalls,
    pendingToolCalls,
    sendMessage,
    submitToolResult,
  } = useSmartSpaceMessages(client, { smartSpaceId, limit: 100, toolExecutor });

  const isRunning = streamingMessages.some((sm) => sm.isStreaming);

  const convertedMessages = useMemo<ThreadMessageLike[]>(() => {
    const toolResultsById = new Map<string, unknown>();
    for (const m of rawMessages) {
      if (m.role !== "tool") continue;
      const parts = extractMessageParts(m);
      for (const p of parts) {
        if (p.type === "tool-result") {
          toolResultsById.set(p.toolCallId, p.result);
        }
      }
    }

    const persisted = rawMessages
      .map((m) => convertSmartSpaceMessage(m, toolResultsById))
      .filter((m): m is ThreadMessageLike => m !== null);

    // Only show streaming messages that are still actively streaming
    // Once isStreaming is false, the message is completed and waiting to be
    // replaced by the persisted version - don't show duplicates
    const activeStreaming = streamingMessages.filter((sm) => sm.isStreaming);

    const streaming = activeStreaming.map((sm): ThreadMessageLike => {
      const text = smartSpaceStreamPartsToText(sm.parts);
      
      // Include streaming tool calls in the message content
      const content: ContentPart[] = [];
      if (text) {
        content.push({ type: "text", text });
      }
      
      // Add tool calls that belong to this run
      for (const tc of streamingToolCalls) {
        if (tc.runId === sm.runId) {
          try {
            const args = tc.argsText ? JSON.parse(tc.argsText) : {};
            content.push({
              type: "tool-call",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args,
              argsText: tc.argsText,
              result: toolResultsById.get(tc.toolCallId),
            });
          } catch {
            content.push({
              type: "tool-call",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: {},
              argsText: tc.argsText,
              result: toolResultsById.get(tc.toolCallId),
            });
          }
        }
      }
      
      if (content.length === 0) {
        content.push({ type: "text", text: "" });
      }
      
      return {
        id: sm.id,
        role: "assistant",
        content: content as ThreadMessageLike["content"],
      };
    });

    return [...persisted, ...streaming];
  }, [rawMessages, streamingMessages, streamingToolCalls]);

  const onNew = async (message: AppendMessage) => {
    const firstPart = message.content[0];
    if (!firstPart || firstPart.type !== "text") {
      throw new Error("Only text messages are supported");
    }
    const text = firstPart.text;
    await sendMessage({ entityId, content: text });
  };

  const threadListAdapter = useMemo<
    ExternalStoreThreadListAdapter | undefined
  >(() => {
    if (!onSwitchThread) return undefined;

    const threads = smartSpaces.map((ss) => ({
      id: ss.id,
      threadId: ss.id,
      status: "regular" as const,
      title: ss.name ?? "Untitled",
    }));

    return {
      threadId: smartSpaceId ?? undefined,
      threads,
      archivedThreads: [],
      onSwitchToThread: (threadId) => {
        onSwitchThread(threadId);
      },
      onSwitchToNewThread: () => {
        onNewThread?.();
      },
    };
  }, [smartSpaces, smartSpaceId, onSwitchThread, onNewThread]);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages: convertedMessages,
    convertMessage: (m) => m,
    onNew,
    adapters: threadListAdapter ? { threadList: threadListAdapter } : undefined,
  });

  return { runtime, membersById, pendingToolCalls, submitToolResult };
}
