import React from 'react';
import { Maximize2, Plus, History, ChevronRight } from 'lucide-react';
import { IconWrapper } from '../IconWrapper';
import { ThemeColors } from '../../utils/chat-theme';
import type { TranslationKeys } from '../../i18n/translations';
import { IconButton } from '../IconButton';

interface ChatHeaderProps {
  title: string;
  alwaysOpen: boolean;
  streaming: boolean;
  dir: string;
  resolvedColors: ThemeColors;
  onNew: () => void;
  onToggleHistory: () => void;
  onClose: () => void;
  historyBtnRef: React.RefObject<HTMLButtonElement>;
  t: (key: keyof TranslationKeys) => string;
}

export function ChatHeader({
  title,
  alwaysOpen,
  streaming,
  dir,
  resolvedColors,
  onNew,
  onToggleHistory,
  onClose,
  historyBtnRef,
  t
}: ChatHeaderProps) {
  return (
    <div style={{
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      direction: dir === 'rtl' ? 'rtl' : 'ltr'
    }}>
      <div style={{ minWidth: '0' }}>
        <h1
          title={title}
          style={{
            color: resolvedColors.textColor,
            fontSize: '18px',
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            margin: '0'
          }}
        >
          {title}
        </h1>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
        color: resolvedColors.mutedTextColor
      }}>
      
        
        <IconButton
          icon={<IconWrapper IconComponent={Plus} size="20" strokeWidth="2" />}
          onClick={() => { if (!streaming) onNew(); }}
          ariaLabel={t('header.new')}
          resolvedColors={resolvedColors}
          disabled={streaming}
        />
        
        <button
          ref={historyBtnRef}
          aria-label={t('header.history')}
          style={{ 
            backgroundColor: 'transparent',
            color: resolvedColors.mutedTextColor,
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
            e.currentTarget.style.color = resolvedColors.textColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = resolvedColors.mutedTextColor;
          }}
          onClick={onToggleHistory}
        >
          <IconWrapper IconComponent={History} size="20" strokeWidth="2" />
        </button>
        
        {!alwaysOpen && (
          <IconButton
            icon={<IconWrapper IconComponent={ChevronRight} size="20" strokeWidth="2" style={{ transform: dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />}
            onClick={onClose}
            ariaLabel={t('header.close')}
            resolvedColors={resolvedColors}
          />
        )}
      </div>
    </div>
  );
}
