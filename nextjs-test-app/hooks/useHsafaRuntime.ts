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
  type HsafaClient,
  type SmartSpaceMessageRecord,
  type SmartSpace,
} from "@hsafa/react-sdk";

export interface UseHsafaRuntimeOptions {
  client: HsafaClient;
  entityId: string;
  smartSpaceId: string | null;
  smartSpaces?: SmartSpace[];
  onSwitchThread?: (smartSpaceId: string) => void;
  onNewThread?: () => void;
}

function convertSmartSpaceMessage(msg: SmartSpaceMessageRecord): ThreadMessageLike {
  const text = smartSpaceMessageToText(msg);
  return {
    id: msg.id,
    role: msg.role === "user" ? "user" : "assistant",
    content: [{ type: "text", text }],
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
  } = options;

  const { membersById } = useSmartSpaceMembers(client, { smartSpaceId });

  const {
    messages: rawMessages,
    streamingMessages,
    sendMessage,
  } = useSmartSpaceMessages(client, { smartSpaceId, limit: 100 });

  const isRunning = streamingMessages.some((sm) => sm.isStreaming);

  const convertedMessages = useMemo<ThreadMessageLike[]>(() => {
    const persisted = rawMessages.map(convertSmartSpaceMessage);

    // Only show streaming messages that are still actively streaming
    // Once isStreaming is false, the message is completed and waiting to be
    // replaced by the persisted version - don't show duplicates
    const activeStreaming = streamingMessages.filter((sm) => sm.isStreaming);

    const streaming = activeStreaming.map((sm): ThreadMessageLike => {
      const text = smartSpaceStreamPartsToText(sm.parts);
      return {
        id: sm.id,
        role: "assistant",
        content: [{ type: "text", text }],
      };
    });

    return [...persisted, ...streaming];
  }, [rawMessages, streamingMessages]);

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

  return { runtime, membersById };
}
