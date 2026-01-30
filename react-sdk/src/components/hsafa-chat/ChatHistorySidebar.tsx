import React from 'react';
import { Plus } from 'lucide-react';
import { IconWrapper } from '../IconWrapper';
import { ThemeColors } from '../../utils/chat-theme';
import { ChatHistoryPanel, ChatMeta } from './ChatHistoryPanel';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  historySearch: string;
  onSearchChange: (search: string) => void;
  chats: ChatMeta[];
  currentChatId: string | null;
  resolvedColors: ThemeColors;
  onChatSelect: (chatId: string) => void;
  onChatDelete: (chatId: string) => void;
  onNewChat: () => void;
  onClose?: () => void;
  isMobile?: boolean;
  dir?: 'rtl' | 'ltr';
  t?: (k: string) => string;
}

export function ChatHistorySidebar({
  isOpen,
  historySearch,
  onSearchChange,
  chats,
  currentChatId,
  resolvedColors,
  onChatSelect,
  onChatDelete,
  onNewChat,
  isMobile = false,
  dir = 'ltr',
  t
}: ChatHistorySidebarProps) {
  // if (!isOpen && !isMobile) return null; // Removed to allow animation
  const isRTL = dir === 'rtl';
  
  return (
    <div
      style={{
        width: isOpen ? '260px' : '0px',
        opacity: isOpen ? 1 : 0,
        ...(isRTL
          ? { marginRight: isOpen ? 0 : -10 }
          : { marginLeft: isOpen ? 0 : -10 }), // Slight slide effect
        height: '100%',
        backgroundColor: resolvedColors.backgroundColor, 
        ...(isRTL
          ? { borderLeft: isOpen ? `1px solid ${resolvedColors.borderColor}` : 'none' }
          : { borderRight: isOpen ? `1px solid ${resolvedColors.borderColor}` : 'none' }),
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        flexShrink: 0,
        position: isMobile ? 'fixed' : 'relative',
        zIndex: isMobile ? 100 : 1,
        ...(isRTL ? { right: 0 } : { left: 0 }),
        top: 0,
        bottom: 0,
        visibility: isOpen ? 'visible' : 'hidden', // Hide content when closed to avoid focus/interaction
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <div style={{ padding: '12px', flexShrink: 0, opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s 0.1s' }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: `1px solid ${resolvedColors.borderColor}`,
            backgroundColor: 'transparent',
            color: resolvedColors.textColor,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
            textAlign: isRTL ? 'right' : 'left'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
           <IconWrapper IconComponent={Plus} size="16" strokeWidth="2" />
           <span>{t ? t('history.newChat') : 'New chat'}</span>
        </button>
      </div>

      <ChatHistoryPanel
        search={historySearch}
        onSearchChange={onSearchChange}
        chats={chats}
        currentChatId={currentChatId}
        resolvedColors={resolvedColors}
        onChatSelect={onChatSelect}
        onChatDelete={onChatDelete}
        dir={dir}
        t={t}
        style={{ flex: 1 }}
      />
    </div>
  );
}
