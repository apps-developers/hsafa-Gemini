"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
} from "@assistant-ui/react";
import { useMembers, ReasoningPart, ToolCallPart } from "@hsafa/ui";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { type ReactNode } from "react";

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
