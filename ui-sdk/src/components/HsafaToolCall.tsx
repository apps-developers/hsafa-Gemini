"use client";

import { useState, type FC } from "react";

// =============================================================================
// HsafaToolCall — Default tool call UI for @assistant-ui/react MessagePrimitive.Parts
//
// Themed via CSS custom properties with built-in light/dark defaults.
// Override --hsafa-tool-* variables in your app's CSS for customization.
//
// When there is no input and no output, the box is non-expandable.
// While the tool is running, a spinner + shimmer bar is shown.
// =============================================================================

export interface ToolCallPartProps {
  /** Display title. Falls back to formatted toolName. */
  title?: string;
  /** Structured input to display. Falls back to argsText / args. */
  input?: unknown;
  /** Structured output to display. Falls back to result. */
  output?: unknown;
  // --- assistant-ui native props (auto-provided by MessagePrimitive.Parts) ---
  toolName?: string;
  argsText?: string;
  args?: unknown;
  result?: unknown;
  status?: { type: string; reason?: string };
  toolCallId?: string;
}

function formatToolName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export const ToolCallPart: FC<ToolCallPartProps> = (props) => {
  const {
    title,
    input: inputProp,
    output: outputProp,
    toolName = "",
    argsText,
    args,
    result,
    status,
  } = props;

  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";
  const isError =
    status?.type === "incomplete" && status?.reason === "error";
  const isCancelled =
    status?.type === "incomplete" && status?.reason === "cancelled";

  const displayName = title || formatToolName(toolName);
  const resolvedInput = inputProp ?? (argsText && argsText !== "{}" ? argsText : args);
  const resolvedOutput = outputProp ?? result;

  const hasContent =
    (resolvedInput != null && resolvedInput !== "" && resolvedInput !== "{}") ||
    resolvedOutput != null;
  const isExpandable = hasContent && !isRunning;

  const [open, setOpen] = useState(false);

  const inputText =
    resolvedInput != null
      ? typeof resolvedInput === "string"
        ? tryFormatJson(resolvedInput)
        : formatValue(resolvedInput)
      : null;
  const outputText = resolvedOutput != null ? formatValue(resolvedOutput) : null;

  const variant = isCancelled ? "cancelled" : isError ? "error" : "default";

  return (
    <div className={`hsafa-tool hsafa-tool--${variant}`}>
      {/* Header */}
      <div
        className="hsafa-tool__header"
        role={isExpandable ? "button" : undefined}
        tabIndex={isExpandable ? 0 : undefined}
        onClick={isExpandable ? () => setOpen(!open) : undefined}
        onKeyDown={
          isExpandable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(!open);
                }
              }
            : undefined
        }
        style={{ cursor: isExpandable ? "pointer" : "default" }}
      >
        {/* Status icon */}
        {isRunning ? (
          <span className="hsafa-tool__spinner" />
        ) : isError ? (
          <span className="hsafa-tool__icon">✕</span>
        ) : isComplete ? (
          <span className="hsafa-tool__icon hsafa-tool__icon--success">✓</span>
        ) : (
          <span className="hsafa-tool__icon">⚙</span>
        )}

        {/* Title */}
        <span className="hsafa-tool__name">
          {isRunning ? `${displayName}…` : displayName}
        </span>

        {/* Shimmer bar while running */}
        {isRunning && <span className="hsafa-tool__shimmer" />}

        {/* Chevron — only when expandable */}
        {isExpandable && (
          <svg
            className="hsafa-tool__chevron"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </div>

      {/* Collapsible content */}
      {isExpandable && (
        <div
          className="hsafa-tool__body"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="hsafa-tool__body-inner">
            <div className="hsafa-tool__content">
              {inputText && inputText !== "{}" && (
                <div style={{ marginBottom: outputText ? "0.5rem" : 0 }}>
                  <div className="hsafa-tool__label">Input</div>
                  <pre className="hsafa-tool__pre">{inputText}</pre>
                </div>
              )}
              {outputText && (
                <div>
                  <div className="hsafa-tool__label">Output</div>
                  <pre className="hsafa-tool__pre">{outputText}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{TOOL_STYLES}</style>
    </div>
  );
};

function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

const TOOL_STYLES = `
  .hsafa-tool {
    --_border: var(--hsafa-tool-border, var(--border, hsl(0 0% 89.8%)));
    --_bg: var(--hsafa-tool-bg, color-mix(in oklch, var(--muted, hsl(0 0% 96%)) 30%, transparent));
    --_fg: var(--hsafa-tool-fg, var(--muted-foreground, hsl(0 0% 45%)));
    --_hover: var(--hsafa-tool-hover, color-mix(in oklch, var(--muted, hsl(0 0% 96%)) 50%, transparent));
    --_label: var(--hsafa-tool-label, color-mix(in oklch, var(--muted-foreground, hsl(0 0% 55%)) 60%, transparent));
    --_code: var(--hsafa-tool-code, var(--foreground, hsl(0 0% 15%)));
    --_success: var(--hsafa-tool-success, hsl(142 76% 36%));
    --_shimmer: var(--hsafa-tool-shimmer, color-mix(in oklch, var(--primary, hsl(226 83% 82%)) 30%, transparent));

    border-radius: 0.5rem;
    border: 1px solid var(--_border);
    margin-bottom: 0.5rem;
    overflow: hidden;
    background: var(--_bg);
    font-family: inherit;
  }
  .hsafa-tool--error {
    --_border: var(--hsafa-tool-error-border, var(--destructive, hsl(0 72% 51%)));
    --_bg: var(--hsafa-tool-error-bg, color-mix(in oklch, var(--destructive, hsl(0 72% 51%)) 8%, transparent));
    --_fg: var(--hsafa-tool-error-fg, var(--destructive, hsl(0 72% 51%)));
  }
  .hsafa-tool--cancelled {
    --_border: var(--hsafa-tool-cancelled-border, color-mix(in oklch, var(--muted-foreground, hsl(0 0% 55%)) 30%, transparent));
    --_bg: var(--hsafa-tool-cancelled-bg, color-mix(in oklch, var(--muted, hsl(0 0% 96%)) 30%, transparent));
  }

  .hsafa-tool__header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    font-size: 0.75rem;
    color: var(--_fg);
    font-family: inherit;
    transition: background 0.15s ease;
  }
  .hsafa-tool__header[role="button"]:hover {
    background: var(--_hover);
  }

  .hsafa-tool__spinner {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border: 1.5px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: hsafa-tool-spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  .hsafa-tool__icon {
    font-size: 0.75rem;
    flex-shrink: 0;
    opacity: 0.7;
  }
  .hsafa-tool__icon--success {
    color: var(--_success);
    opacity: 1;
  }

  .hsafa-tool__name {
    font-weight: 500;
  }

  .hsafa-tool__shimmer {
    flex: 1;
    height: 2px;
    border-radius: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--_shimmer) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: hsafa-tool-shimmer 1.5s ease-in-out infinite;
  }

  .hsafa-tool__chevron {
    margin-left: auto;
    display: block;
    opacity: 0.5;
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .hsafa-tool__body {
    display: grid;
    transition: grid-template-rows 0.25s ease;
  }
  .hsafa-tool__body-inner {
    overflow: hidden;
  }
  .hsafa-tool__content {
    padding: 0 0.75rem 0.5rem;
    font-size: 0.6875rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .hsafa-tool__label {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--_label);
    margin-bottom: 0.25rem;
    font-family: inherit;
  }

  .hsafa-tool__pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--_code);
    line-height: 1.5;
  }

  @keyframes hsafa-tool-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes hsafa-tool-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
