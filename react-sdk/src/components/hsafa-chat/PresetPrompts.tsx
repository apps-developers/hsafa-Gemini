import React, { useState } from "react";

type ThemeColors = {
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  inputBackground: string;
  cardBackground: string;
  primaryColor: string;
  hoverBackground: string;
};

interface PresetPromptsProps {
  prompts: Array<{ label: string; prompt: string }>;
  onSelect: (prompt: string) => void;
  resolvedColors: ThemeColors;
  disabled?: boolean;
  dir?: 'rtl' | 'ltr';
  t?: (k: string) => string;
}

export function PresetPrompts({ 
  prompts, 
  onSelect, 
  resolvedColors, 
  disabled = false,
  dir = 'ltr',
  t
}: PresetPromptsProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const isRTL = dir === 'rtl';

  if (!prompts || prompts.length === 0) return null;

  return (
    <div style={{ 
      padding: '12px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 600,
        color: resolvedColors.mutedTextColor,
        ...(isRTL ? { paddingRight: '4px', textAlign: 'right' } : { paddingLeft: '4px', textAlign: 'left' }),
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {t ? t('prompts.suggested') : 'Suggested Prompts'}
      </div>
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {prompts.map((preset, index) => {
          const isExpanded = expandedId === index;
          const isLongPrompt = preset.prompt.length > 180;
          const truncatedPrompt = isLongPrompt && !isExpanded 
            ? preset.prompt.slice(0, 180) + '...' 
            : preset.prompt;

          return (
            <button
              key={index}
              onClick={() => {
                if (!disabled) {
                  onSelect(preset.prompt);
                }
              }}
              disabled={disabled}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '12px',
                backgroundColor: resolvedColors.cardBackground,
                border: `1px solid ${resolvedColors.borderColor}`,
                borderRadius: '12px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                textAlign: isRTL ? 'right' : 'left',
                opacity: disabled ? 0.5 : 1,
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
                  e.currentTarget.style.borderColor = resolvedColors.primaryColor;
                  e.currentTarget.style.transform = isRTL ? 'translateX(-2px)' : 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = resolvedColors.cardBackground;
                e.currentTarget.style.borderColor = resolvedColors.borderColor;
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              {/* Label */}
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: resolvedColors.textColor,
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={resolvedColors.primaryColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                {preset.label}
              </div>

              {/* Prompt text */}
              <div style={{
                fontSize: '12px',
                color: resolvedColors.mutedTextColor,
                lineHeight: '1.5',
                width: '100%',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                direction: isRTL ? 'rtl' : 'ltr',
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {truncatedPrompt}
              </div>

              {/* Expand/Collapse button for long prompts */}
              {isLongPrompt && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(isExpanded ? null : index);
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: resolvedColors.primaryColor,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 500,
                  }}
                >
                  {isExpanded ? (t ? t('prompts.showLess') : 'Show less') : (t ? t('prompts.showMore') : 'Show more')}
                  <svg 
                    width="10" 
                    height="10" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
