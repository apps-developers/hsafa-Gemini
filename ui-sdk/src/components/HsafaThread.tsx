"use client";

import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import { ReasoningPart } from "./HsafaReasoning";
import { ToolCallPart } from "./HsafaToolCall";

// =============================================================================
// HsafaThread — Prebuilt full chat thread
// =============================================================================

export interface HsafaThreadProps {
  welcomeMessage?: string;
  placeholder?: string;
  className?: string;
}

export function HsafaThread({
  welcomeMessage = "How can I help you?",
  placeholder = "Type a message…",
  className,
}: HsafaThreadProps) {
  return (
    <ThreadPrimitive.Root
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <ThreadPrimitive.Viewport
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          padding: "1rem",
        }}
      >
        <ThreadPrimitive.Empty>
          <ThreadWelcome message={welcomeMessage} />
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage: HsafaUserMessage,
            AssistantMessage: HsafaAssistantMessage,
          }}
        />

        <div
          style={{
            position: "sticky",
            bottom: 0,
            marginTop: "auto",
            padding: "0.75rem 0",
            background: "inherit",
          }}
        >
          <HsafaComposer placeholder={placeholder} />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

// =============================================================================
// Thread Welcome
// =============================================================================

function ThreadWelcome({ message }: { message: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        color: "#888",
        fontSize: "0.95rem",
      }}
    >
      <p>{message}</p>
    </div>
  );
}

// =============================================================================
// Composer
// =============================================================================

function HsafaComposer({ placeholder }: { placeholder: string }) {
  return (
    <ComposerPrimitive.Root
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "0.5rem",
        borderRadius: "1rem",
        border: "1px solid #e0e0e0",
        padding: "0.5rem 0.75rem",
        background: "#fff",
      }}
    >
      <ComposerPrimitive.Input
        autoFocus
        placeholder={placeholder}
        rows={1}
      />
      <ComposerPrimitive.Send
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2rem",
          height: "2rem",
          borderRadius: "50%",
          border: "none",
          background: "#0f0f0f",
          color: "#fff",
          cursor: "pointer",
          flexShrink: 0,
          fontSize: "1rem",
        }}
      >
        ↑
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

// =============================================================================
// User Message
// =============================================================================

function HsafaUserMessage() {
  return (
    <MessagePrimitive.Root
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: "0.75rem",
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          borderRadius: "1rem 1rem 0.25rem 1rem",
          padding: "0.625rem 1rem",
          background: "#0f0f0f",
          color: "#fff",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

// =============================================================================
// Assistant Message
// =============================================================================

function HsafaAssistantMessage() {
  return (
    <MessagePrimitive.Root
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: "0.75rem",
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        <MessagePrimitive.Parts
          components={{
            Reasoning: ReasoningPart,
            tools: {
              Fallback: ToolCallPart,
            },
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}
