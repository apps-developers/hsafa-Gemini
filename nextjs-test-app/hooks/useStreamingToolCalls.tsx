"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StreamingToolCall } from "@hsafa/react-sdk";

interface StreamingToolCallsContextValue {
  streamingToolCalls: StreamingToolCall[];
  getArgsText: (toolCallId: string) => string | undefined;
}

const StreamingToolCallsContext = createContext<StreamingToolCallsContextValue | null>(null);

export function StreamingToolCallsProvider({
  streamingToolCalls,
  children,
}: {
  streamingToolCalls: StreamingToolCall[];
  children: ReactNode;
}) {
  const getArgsText = (toolCallId: string): string | undefined => {
    const tc = streamingToolCalls.find((t) => t.toolCallId === toolCallId);
    return tc?.argsText;
  };

  return (
    <StreamingToolCallsContext.Provider value={{ streamingToolCalls, getArgsText }}>
      {children}
    </StreamingToolCallsContext.Provider>
  );
}

export function useStreamingToolCalls() {
  const ctx = useContext(StreamingToolCallsContext);
  if (!ctx) {
    return { streamingToolCalls: [], getArgsText: () => undefined };
  }
  return ctx;
}
