import React from 'react';
import { ThemeColors } from '../utils/chat-theme';

interface FloatingChatButtonProps {
  show: boolean;
  onClick: () => void;
  resolvedColors: ThemeColors;
  floatingButtonPosition: {
    bottom?: number | string;
    right?: number | string;
    top?: number | string;
    left?: number | string;
  };
}

export function FloatingChatButton({
  show,
  onClick,
  resolvedColors,
  floatingButtonPosition
}: FloatingChatButtonProps) {
  if (!show) return null;

  const floatingButtonStyles = {
    position: 'fixed' as const,
    bottom: typeof floatingButtonPosition.bottom === 'number' ? `${floatingButtonPosition.bottom}px` : floatingButtonPosition.bottom,
    right: floatingButtonPosition.right ? (typeof floatingButtonPosition.right === 'number' ? `${floatingButtonPosition.right}px` : floatingButtonPosition.right) : undefined,
    top: floatingButtonPosition.top ? (typeof floatingButtonPosition.top === 'number' ? `${floatingButtonPosition.top}px` : floatingButtonPosition.top) : undefined,
    left: floatingButtonPosition.left ? (typeof floatingButtonPosition.left === 'number' ? `${floatingButtonPosition.left}px` : floatingButtonPosition.left) : undefined,
    zIndex: 1000
  };

  return (
    <button
      aria-label="Open chat"
      onClick={onClick}
      style={{
        ...floatingButtonStyles,
        borderColor: resolvedColors.borderColor,
        backgroundColor: resolvedColors.accentColor,
        color: resolvedColors.textColor,
        borderRadius: '50%',
        border: `1px solid ${resolvedColors.borderColor}`,
        padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = resolvedColors.primaryColor;
        e.currentTarget.style.backgroundColor = `${resolvedColors.accentColor}dd`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = resolvedColors.borderColor;
        e.currentTarget.style.backgroundColor = resolvedColors.accentColor;
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
