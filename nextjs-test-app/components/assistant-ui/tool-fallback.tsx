"use client";

import { ChevronDownIcon, CheckIcon, LoaderIcon, XCircleIcon, WrenchIcon } from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ToolFallbackProps {
  toolName: string;
  argsText: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: { type: string; reason?: string };
}

export function ToolFallback({ toolName, argsText, args, result, status }: ToolFallbackProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = status.type === "running";
  const isComplete = status.type === "complete";
  const isError = status.type === "incomplete" && status.reason === "error";
  const isCancelled = status.type === "incomplete" && status.reason === "cancelled";

  const isArgsTextCompleteJson = (() => {
    if (typeof argsText !== "string") return true;
    if (argsText.trim().length === 0) return true;
    try {
      JSON.parse(argsText);
      return true;
    } catch {
      return false;
    }
  })();

  const isArgsStreaming =
    typeof argsText === "string" && argsText.trim().length > 0 && !isArgsTextCompleteJson;

  const hasArgs =
    (args && Object.keys(args).length > 0) ||
    (typeof argsText === "string" && argsText.trim().length > 0);
  const hasResult = result !== undefined && result !== null;
  const hasContent = hasArgs || hasResult || isError || isCancelled;

  return (
    <ToolFallbackRoot>
      <ToolFallbackTrigger
        toolName={toolName}
        isRunning={isRunning}
        isComplete={isComplete}
        isError={isError}
        isCancelled={isCancelled}
        isExpanded={isExpanded}
        hasContent={hasContent}
        onToggle={() => setIsExpanded(!isExpanded)}
      />
      <ToolFallbackContent isExpanded={isExpanded}>
        {(isError || isCancelled) && (
          <ToolFallbackError isCancelled={isCancelled} />
        )}
        {hasArgs && <ToolFallbackArgs args={args} argsText={argsText} isStreaming={isArgsStreaming} />}
        {hasResult && <ToolFallbackResult result={result} />}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
}

function ToolFallbackRoot({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 text-xs rounded-lg overflow-hidden">
      {children}
    </div>
  );
}

interface ToolFallbackTriggerProps {
  toolName: string;
  isRunning: boolean;
  isComplete: boolean;
  isError: boolean;
  isCancelled: boolean;
  isExpanded: boolean;
  hasContent: boolean;
  onToggle: () => void;
}

function ToolFallbackTrigger({
  toolName,
  isRunning,
  isComplete,
  isError,
  isCancelled,
  isExpanded,
  hasContent,
  onToggle,
}: ToolFallbackTriggerProps) {
  const duration = useToolDuration(isRunning);

  return (
    <button
      onClick={onToggle}
      disabled={!hasContent}
      className={cn(
        "group flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-200",
        "hover:bg-muted/40",
        isRunning && "bg-muted/30",
        (isError || isCancelled) && "opacity-60",
        !hasContent && "cursor-default"
      )}
    >
      {/* Status Icon */}
      <div className="relative shrink-0">
        <ToolStatusIcon
          isRunning={isRunning}
          isComplete={isComplete}
          isError={isError}
          isCancelled={isCancelled}
        />
      </div>

      {/* Tool name with shimmer effect when running */}
      <span className={cn(
        "flex-1 font-medium text-foreground/80 transition-colors",
        isRunning && "tool-shimmer"
      )}>
        {toolName}
      </span>

      {/* Duration */}
      {duration !== null && (
        <span className="text-[10px] text-muted-foreground/50 tabular-nums">
          {formatDuration(duration)}
        </span>
      )}

      {/* Expand chevron */}
      {hasContent && (
        <ChevronDownIcon
          className={cn(
            "size-3 text-muted-foreground/50 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      )}
    </button>
  );
}

interface ToolFallbackContentProps {
  isExpanded: boolean;
  children: ReactNode;
}

function ToolFallbackContent({ isExpanded, children }: ToolFallbackContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, children]);

  return (
    <div
      className="overflow-hidden transition-all duration-200 ease-out"
      style={{ height }}
    >
      <div ref={contentRef} className="border-t border-border/40 px-3 py-2">
        {children}
      </div>
    </div>
  );
}

interface ToolFallbackArgsProps {
  args: Record<string, unknown>;
  argsText: string;
  isStreaming?: boolean;
}

function ToolFallbackArgs({ args, argsText, isStreaming }: ToolFallbackArgsProps) {
  const renderArgs = () => {
    const raw = typeof argsText === "string" ? argsText : "";

    if (isStreaming) {
      return (
        <span className="whitespace-pre-wrap wrap-break-word">
          {raw}
          <span className="inline-block w-[0.6ch] animate-pulse">▍</span>
        </span>
      );
    }

    if (raw.trim().length > 0) {
      try {
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        return raw;
      }
    }

    return JSON.stringify(args, null, 2);
  };

  return (
    <div className="mt-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">
        Input
      </div>
      <pre className={cn(
        "text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2 overflow-x-auto max-h-32",
        isStreaming && "tool-shimmer"
      )}>
        {renderArgs()}
      </pre>
    </div>
  );
}

interface ToolFallbackResultProps {
  result: unknown;
}

function ToolFallbackResult({ result }: ToolFallbackResultProps) {
  return (
    <div className="mt-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">
        Output
      </div>
      <pre className="text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2 overflow-x-auto max-h-32">
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

interface ToolFallbackErrorProps {
  isCancelled: boolean;
}

function ToolFallbackError({ isCancelled }: ToolFallbackErrorProps) {
  return (
    <div className="mt-1 text-[11px] text-red-500/80">
      {isCancelled ? "Tool call was cancelled" : "Tool execution failed"}
    </div>
  );
}

function ToolStatusIcon({
  isRunning,
  isComplete,
  isError,
  isCancelled,
}: {
  isRunning: boolean;
  isComplete: boolean;
  isError: boolean;
  isCancelled: boolean;
}) {
  const iconClass = "size-3.5";
  
  if (isRunning) {
    return (
      <div className="relative">
        <LoaderIcon className={cn(iconClass, "animate-spin text-blue-500")} />
        <div className="absolute inset-0 animate-ping">
          <div className="size-full rounded-full bg-blue-500/20" />
        </div>
      </div>
    );
  }
  
  if (isError || isCancelled) {
    return <XCircleIcon className={cn(iconClass, "text-red-400")} />;
  }
  
  if (isComplete) {
    return <CheckIcon className={cn(iconClass, "text-emerald-500")} />;
  }
  
  return <WrenchIcon className={cn(iconClass, "text-muted-foreground/60")} />;
}

function useToolDuration(isRunning: boolean): number | null {
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      
      const interval = setInterval(() => {
        if (startTimeRef.current !== null) {
          setCurrentDuration(Date.now() - startTimeRef.current);
        }
      }, 100);
      
      return () => clearInterval(interval);
    } else if (startTimeRef.current !== null) {
      setDuration(Date.now() - startTimeRef.current);
      setCurrentDuration(null);
    }
  }, [isRunning]);

  return isRunning ? currentDuration : duration;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Export compound components
ToolFallback.Root = ToolFallbackRoot;
ToolFallback.Trigger = ToolFallbackTrigger;
ToolFallback.Content = ToolFallbackContent;
ToolFallback.Args = ToolFallbackArgs;
ToolFallback.Result = ToolFallbackResult;
ToolFallback.Error = ToolFallbackError;

export {
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
  ToolFallbackError,
};
