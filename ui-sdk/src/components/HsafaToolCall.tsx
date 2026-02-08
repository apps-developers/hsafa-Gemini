"use client";

import { useState, type FC } from "react";

// =============================================================================
// HsafaToolCall — Default tool call UI for @assistant-ui/react MessagePrimitive.Parts
//
// Used as the `Fallback` component in the `tools` prop of MessagePrimitive.Parts.
// Props match the ToolCallMessagePart interface from assistant-ui.
//
// Uses CSS grid-template-rows for smooth animated expand/collapse (same pattern
// as HsafaReasoning).
// =============================================================================

export interface ToolCallPartProps {
  toolName: string;
  argsText: string;
  args: unknown;
  result?: unknown;
  status: { type: string; reason?: string };
  toolCallId: string;
}

function formatToolName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ToolCallPart: FC<ToolCallPartProps> = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";
  const isError =
    status?.type === "incomplete" && status?.reason === "error";
  const isCancelled =
    status?.type === "incomplete" && status?.reason === "cancelled";
  const [open, setOpen] = useState(false);

  const displayName = formatToolName(toolName);

  return (
    <div
      style={{
        borderRadius: "0.5rem",
        border: `1px solid var(--hsafa-tool-border, ${isCancelled ? "#d1d5db" : isError ? "#fca5a5" : "#e5e7eb"})`,
        marginBottom: "0.5rem",
        overflow: "hidden",
        background: `var(--hsafa-tool-bg, ${isCancelled ? "#f3f4f6" : isError ? "#fef2f2" : "#f9fafb"})`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        type="button"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "0.8rem",
          color: `var(--hsafa-tool-fg, ${isError ? "#dc2626" : "#6b7280"})`,
          fontFamily: "inherit",
        }}
      >
        {/* Status icon */}
        {isRunning ? (
          <span
            style={{
              display: "inline-block",
              width: "0.75rem",
              height: "0.75rem",
              border: "1.5px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "hsafa-tool-spin 0.6s linear infinite",
            }}
          />
        ) : isError ? (
          <span style={{ fontSize: "0.75rem" }}>✕</span>
        ) : isComplete ? (
          <span style={{ fontSize: "0.75rem", color: "#16a34a" }}>✓</span>
        ) : (
          <span
            style={{
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              display: "inline-block",
              fontSize: "0.65rem",
            }}
          >
            ▶
          </span>
        )}

        {/* Tool name */}
        <span style={{ fontWeight: 500 }}>
          {isRunning ? `Running ${displayName}…` : displayName}
        </span>

        {/* Shimmer bar for running state */}
        {isRunning && (
          <span
            style={{
              flex: 1,
              height: "2px",
              borderRadius: "1px",
              background:
                "linear-gradient(90deg, transparent 0%, var(--hsafa-tool-shimmer, #a5b4fc) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "hsafa-tool-shimmer 1.5s ease-in-out infinite",
            }}
          />
        )}

        {/* Chevron */}
        {!isRunning && (
          <span
            style={{
              marginLeft: "auto",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              display: "inline-block",
              fontSize: "0.6rem",
              opacity: 0.5,
            }}
          >
            ▶
          </span>
        )}
      </button>

      {/* Collapsible content */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.25s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "0 0.75rem 0.5rem",
              fontSize: "0.75rem",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {/* Args */}
            {argsText && argsText !== "{}" && (
              <div style={{ marginBottom: result ? "0.5rem" : 0 }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--hsafa-tool-label, #9ca3af)",
                    marginBottom: "0.25rem",
                    fontFamily: "inherit",
                  }}
                >
                  Input
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--hsafa-tool-code, #374151)",
                    lineHeight: 1.5,
                  }}
                >
                  {formatJson(argsText)}
                </pre>
              </div>
            )}

            {/* Result */}
            {result != null && (
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--hsafa-tool-label, #9ca3af)",
                    marginBottom: "0.25rem",
                    fontFamily: "inherit",
                  }}
                >
                  Output
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "var(--hsafa-tool-code, #374151)",
                    lineHeight: 1.5,
                  }}
                >
                  {typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes hsafa-tool-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes hsafa-tool-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
