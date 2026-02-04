"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  SquareIcon,
  LoaderIcon,
  CheckIcon,
  WrenchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMembers } from "@/hooks/useMembersContext";

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

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const { membersById, currentEntityId } = useMembers();
  const message = useMessage();
  
  const entityId = (message.metadata?.custom as { entityId?: string })?.entityId;
  const isFromMe = entityId === currentEntityId;
  const sender = entityId ? membersById[entityId] : null;
  const senderName = sender?.displayName || (sender?.type === "agent" ? "Agent" : "Unknown");

  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      {!isFromMe && senderName && (
        <div className="mb-1 text-xs font-medium text-muted-foreground">
          {senderName}
        </div>
      )}
      <div className={cn(
        "text-sm rounded-lg px-3 py-2",
        !isFromMe && "border border-border"
      )}>
        <MessagePrimitive.Content
          components={{
            Text: ({ text }: { text: string }) => (
              <span className="whitespace-pre-wrap">{text}</span>
            ),
            tools: {
              Fallback: ToolCallUI,
            },
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function useToolDuration(isRunning: boolean): number | null {
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    } else if (!isRunning && startTimeRef.current !== null) {
      setDuration(Date.now() - startTimeRef.current);
    }
  }, [isRunning]);

  return duration;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ToolStatusIcon({
  isRunning,
  isComplete,
}: {
  isRunning: boolean;
  isComplete: boolean;
}): ReactNode {
  if (isRunning) {
    return <LoaderIcon className="size-3 animate-spin" />;
  }
  if (isComplete) {
    return <CheckIcon className="size-3 text-emerald-500" />;
  }
  return <WrenchIcon className="size-3" />;
}

interface ToolCallUIProps {
  toolName: string;
  argsText: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: { type: string; reason?: string };
}

function ToolCallUI({ toolName, args, status }: ToolCallUIProps) {
  const isRunning = status.type === "running";
  const isComplete = status.type === "complete";
  const duration = useToolDuration(isRunning);

  return (
    <div
      className={cn(
        "my-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground text-xs",
        isRunning && "animate-pulse"
      )}
    >
      <ToolStatusIcon isRunning={isRunning} isComplete={isComplete} />
      <span className="flex-1 truncate">
        {isRunning ? "Running" : "Completed"} {toolName}
      </span>
      {duration !== null && (
        <span className="text-muted-foreground/60">{formatDuration(duration)}</span>
      )}
    </div>
  );
}
