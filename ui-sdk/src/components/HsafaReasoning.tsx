"use client";

import { useState, useEffect, type FC } from "react";

// =============================================================================
// HsafaReasoning — Collapsible "Thinking…" block for AI reasoning
//
// Themed via CSS custom properties with built-in light/dark defaults.
// Override --hsafa-reasoning-* variables in your app's CSS for customization.
//
// Auto-opens during streaming, auto-closes when complete.
// =============================================================================

export interface ReasoningPartProps {
  type: "reasoning";
  text: string;
  status: { type: string };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const ReasoningPart: FC<ReasoningPartProps> = ({ text, status }) => {
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
    <div className="hsafa-reasoning">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className="hsafa-reasoning__header"
      >
        {isStreaming ? (
          <span className="hsafa-reasoning__spinner" />
        ) : (
          <svg
            className="hsafa-reasoning__chevron"
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
        <span className="hsafa-reasoning__title">
          {isStreaming ? "Thinking…" : "Thought process"}
        </span>
        <span className="hsafa-reasoning__tokens">
          {tokens} tokens
        </span>
      </button>

      {/* Animated content via grid-template-rows */}
      <div
        className="hsafa-reasoning__body"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="hsafa-reasoning__body-inner">
          <div className="hsafa-reasoning__text">
            {text}
          </div>
        </div>
      </div>

      <style>{REASONING_STYLES}</style>
    </div>
  );
};

const REASONING_STYLES = `
  .hsafa-reasoning {
    --_border: var(--hsafa-reasoning-border, var(--border, hsl(0 0% 89.8%)));
    --_bg: var(--hsafa-reasoning-bg, color-mix(in oklch, var(--muted, hsl(0 0% 96%)) 30%, transparent));
    --_fg: var(--hsafa-reasoning-fg, var(--muted-foreground, hsl(0 0% 45%)));
    --_hover: var(--hsafa-reasoning-hover, color-mix(in oklch, var(--muted, hsl(0 0% 96%)) 50%, transparent));

    border-radius: 0.5rem;
    border: 1px solid var(--_border);
    margin-bottom: 0.5rem;
    overflow: hidden;
    background: var(--_bg);
    font-family: inherit;
  }

  .hsafa-reasoning__header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--_fg);
    font-family: inherit;
    transition: background 0.15s ease;
  }
  .hsafa-reasoning__header:hover {
    background: var(--_hover);
  }

  .hsafa-reasoning__spinner {
    display: inline-block;
    width: 0.75rem;
    height: 0.75rem;
    border: 1.5px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: hsafa-reasoning-spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  .hsafa-reasoning__chevron {
    display: block;
    opacity: 0.5;
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .hsafa-reasoning__title {
    font-weight: 500;
  }

  .hsafa-reasoning__tokens {
    margin-left: auto;
    font-size: 0.625rem;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }

  .hsafa-reasoning__body {
    display: grid;
    transition: grid-template-rows 0.25s ease;
  }
  .hsafa-reasoning__body-inner {
    overflow: hidden;
  }
  .hsafa-reasoning__text {
    padding: 0 0.75rem 0.5rem;
    font-size: 0.75rem;
    color: var(--_fg);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  @keyframes hsafa-reasoning-spin {
    to { transform: rotate(360deg); }
  }
`;
