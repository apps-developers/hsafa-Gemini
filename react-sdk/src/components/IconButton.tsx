import React from 'react';
import { ThemeColors } from '../utils/chat-theme';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  resolvedColors: ThemeColors;
  disabled?: boolean;
  title?: string;
}

export function IconButton({
  icon,
  onClick,
  ariaLabel,
  resolvedColors,
  disabled = false,
  title
}: IconButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      style={{
        backgroundColor: 'transparent',
        color: resolvedColors.mutedTextColor,
        border: 'none',
        borderRadius: '8px',
        padding: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
          e.currentTarget.style.color = resolvedColors.textColor;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = resolvedColors.mutedTextColor;
      }}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
