"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
} from "@assistant-ui/react";
import { useMembers } from "@hsafa/ui";
import { ArrowUpIcon, SquareIcon, ChevronRightIcon, LoaderIcon, CheckIcon, XIcon, WrenchIcon } from "lucide-react";
import { type ReactNode, useState, useEffect } from "react";

import { Button } from "@/components/ui/button";

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="scrollbar-none flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 pt-6">
          <ThreadPrimitive.Empty>
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <p className="text-muted-foreground text-sm">
                How can I help you today?
              </p>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      <div className="sticky bottom-0 bg-background">
        <div className="mx-auto w-full max-w-3xl px-4">
          <Composer />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="bg-background py-2">
      <div className="rounded-xl border border-border bg-muted/50 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20">
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder="Ask a question..."
            className="max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none"
            rows={1}
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-end px-1.5 pb-1.5">
          <ComposerAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function ComposerAction(): ReactNode {
  return (
    <>
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send asChild>
          <Button type="submit" size="icon" className="size-7 rounded-lg">
            <ArrowUpIcon className="size-4" />
          </Button>
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>

      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 rounded-lg"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </>
  );
}

function StreamingCaret() {
  return (
    <span className="inline-block size-2 ml-1 rounded-full bg-foreground/50 animate-pulse" />
  );
}

function TextWithCaret({
  text,
  status,
}: {
  text: string;
  status: { type: string };
}) {
  const isStreaming = status.type === "running";

  return (
    <div className="border border-border rounded-lg px-3 py-2">
      <span className="whitespace-pre-wrap">{text}</span>
      {isStreaming && <StreamingCaret />}
    </div>
  );
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function ReasoningBlock({
  text,
  status,
}: {
  text: string;
  status: { type: string };
}) {
  const isStreaming = status?.type === "running";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStreaming) setOpen(true);
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && status?.type === "complete") setOpen(false);
  }, [isStreaming, status?.type]);

  if (!text) return null;

  const tokens = estimateTokens(text);

  return (
    <div className="mb-2 rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {isStreaming ? (
          <LoaderIcon className="size-3 animate-spin" />
        ) : (
          <ChevronRightIcon
            className={`size-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          />
        )}
        <span className="font-medium">
          {isStreaming ? "Thinking…" : "Thought process"}
        </span>
        <span className="ml-auto tabular-nums text-[10px] opacity-60">
          {tokens} tokens
        </span>
      </button>
      <div
        className="transition-[grid-template-rows] duration-250 ease-in-out"
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCallBlock({
  toolName,
  argsText,
  result,
  status,
}: {
  toolName: string;
  argsText: string;
  args: unknown;
  result?: unknown;
  status: { type: string; reason?: string };
  toolCallId: string;
}) {
  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";
  const isError = status?.type === "incomplete" && status?.reason === "error";
  const isCancelled = status?.type === "incomplete" && status?.reason === "cancelled";
  const [open, setOpen] = useState(false);

  const displayName = toolName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className={`mb-2 rounded-lg border overflow-hidden ${
        isCancelled
          ? "border-muted-foreground/30 bg-muted/30"
          : isError
            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : "border-border bg-muted/30"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className={`flex w-full items-center gap-1.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors ${
          isError ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
        }`}
      >
        {isRunning ? (
          <LoaderIcon className="size-3 animate-spin" />
        ) : isError ? (
          <XIcon className="size-3" />
        ) : isComplete ? (
          <CheckIcon className="size-3 text-emerald-600" />
        ) : (
          <WrenchIcon className="size-3" />
        )}
        <span className="font-medium">
          {isRunning ? `Running ${displayName}…` : displayName}
        </span>
        {isRunning && (
          <span className="flex-1 h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />
        )}
        {!isRunning && (
          <ChevronRightIcon
            className={`ml-auto size-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          />
        )}
      </button>
      <div
        className="transition-[grid-template-rows] duration-250 ease-in-out"
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-2 font-mono text-[11px]">
            {argsText && argsText !== "{}" && (
              <div className={result != null ? "mb-2" : ""}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 font-sans">
                  Input
                </div>
                <pre className="whitespace-pre-wrap break-words text-muted-foreground leading-relaxed">
                  {formatJson(argsText)}
                </pre>
              </div>
            )}
            {result != null && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 font-sans">
                  Output
                </div>
                <pre className="whitespace-pre-wrap break-words text-muted-foreground leading-relaxed">
                  {typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function UserMessage() {
  const { membersById, currentEntityId } = useMembers();
  const entityId = useMessage((m) => (m.metadata as any)?.custom?.entityId as string | undefined);
  const member = entityId ? membersById[entityId] : undefined;
  const displayName = member?.displayName || "You";

  return (
    <MessagePrimitive.Root className="flex flex-col items-end py-2" data-role="user">
      <span className="mb-1 mr-1 text-xs font-medium text-muted-foreground">
        {displayName}
      </span>
      <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-3 py-2 text-sm">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const { membersById } = useMembers();
  const entityId = useMessage((m) => (m.metadata as any)?.custom?.entityId as string | undefined);
  const isOtherHuman = useMessage((m) => (m.metadata as any)?.custom?.isOtherHuman === true);
  const member = entityId ? membersById[entityId] : undefined;
  const displayName = member?.displayName || (isOtherHuman ? "User" : "AI Assistant");

  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="flex items-center gap-2 mb-1">
        <div
          className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${
            isOtherHuman ? "bg-blue-500" : "bg-emerald-600"
          }`}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {displayName}
        </span>
      </div>
      <div className="text-sm pl-8">
        <MessagePrimitive.Parts
          components={{
            Text: TextWithCaret,
            Reasoning: ReasoningBlock,
            tools: {
              Fallback: ToolCallBlock,
            },
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}
