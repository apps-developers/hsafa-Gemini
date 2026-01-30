import React from 'react';
import { createPortal } from 'react-dom';
import { ThemeColors } from '../../utils/chat-theme';
import { ChatHistoryPanel, ChatMeta } from './ChatHistoryPanel';

interface ChatHistoryModalProps {
  historyOpen: boolean;
  historySearch: string;
  currentChatId: string | null;
  refreshKey?: number;
  resolvedColors: ThemeColors;
  onClose: () => void;
  onSearchChange: (search: string) => void;
  onChatSelect: (chatId: string) => void;
  onChatDelete: (chatId: string) => void;
  loadChatsIndex: () => ChatMeta[];
  historyPopupRef: React.RefObject<HTMLDivElement>;
  dir?: 'rtl' | 'ltr';
  t?: (k: string) => string;
}

export function ChatHistoryModal({
  historyOpen,
  historySearch,
  currentChatId,
  refreshKey,
  resolvedColors,
  onClose,
  onSearchChange,
  onChatSelect,
  onChatDelete,
  loadChatsIndex,
  historyPopupRef,
  dir = 'ltr',
  t
}: ChatHistoryModalProps) {
  if (!historyOpen) return null;

  const chats = loadChatsIndex();

  const modalContent = (
    <>
      {/* Backdrop with blur */}
      <div
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: 1100,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      {/* Command palette panel */}
      <div
        ref={historyPopupRef}
        style={{
          position: 'fixed',
          left: '50%',
          top: '64px',
          transform: 'translateX(-50%)',
          zIndex: 1101,
          width: '680px',
          maxWidth: '94vw',
          height: '60vh',
          maxHeight: '600px',
          overflow: 'hidden',
          borderRadius: '16px',
          border: `1px solid ${resolvedColors.borderColor}`,
          backgroundColor: `${resolvedColors.backgroundColor}f0`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
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
        />
      </div>
    </>
  );
  
  // Only use portal if document.body is available
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  
  // Fallback to inline rendering
  return modalContent;
}
