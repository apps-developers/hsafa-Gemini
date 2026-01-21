import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { IconWrapper } from '../IconWrapper';
import { ThemeColors } from '../../utils/chat-theme';
import { timeAgo } from '../../utils/time';

export interface ChatMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatHistoryPanelProps {
  search: string;
  onSearchChange: (search: string) => void;
  chats: ChatMeta[];
  currentChatId: string | null;
  resolvedColors: ThemeColors;
  onChatSelect: (chatId: string) => void;
  onChatDelete: (chatId: string) => void;
  className?: string;
  style?: React.CSSProperties;
  dir?: 'rtl' | 'ltr';
  t?: (k: string) => string;
}

export function ChatHistoryPanel({
  search,
  onSearchChange,
  chats,
  currentChatId,
  resolvedColors,
  onChatSelect,
  onChatDelete,
  className,
  style,
  dir = 'ltr',
  t
}: ChatHistoryPanelProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isRTL = dir === 'rtl';
  const filteredChats = search.trim() 
    ? chats.filter(m => (m.title || '').toLowerCase().includes(search.toLowerCase().trim()))
    : chats;

  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        direction: isRTL ? 'rtl' : 'ltr',
        ...style
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: `1px solid ${resolvedColors.borderColor}`,
        padding: '12px 16px',
        flexShrink: 0
      }}>
        <div style={{ flex: '1' }}>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t ? t('history.search') : 'Search'}
            style={{
              width: '100%',
              borderRadius: '8px',
              backgroundColor: resolvedColors.inputBackground,
              padding: '8px 12px',
              fontSize: '14px',
              color: resolvedColors.textColor,
              border: `1px solid ${resolvedColors.borderColor}`,
              outline: 'none',
              direction: isRTL ? 'rtl' : 'ltr',
              textAlign: isRTL ? 'right' : 'left'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = resolvedColors.primaryColor}
            onBlur={(e) => e.currentTarget.style.borderColor = resolvedColors.borderColor}
          />
        </div>
      </div>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0'
      }}>
        {filteredChats.length === 0 ? (
          <div style={{
            padding: '24px',
            color: resolvedColors.mutedTextColor,
            textAlign: 'center'
          }}>{t ? t('history.noChatsFound') : 'No chats found.'}</div>
        ) : (
          <div>
            {filteredChats.map((meta, index) => (
              <div 
                key={meta.id} 
                className={index > 0 ? 'chat-history-item-with-border' : 'chat-history-item'}
                style={{
                  '--border-color': resolvedColors.borderColor
                } as React.CSSProperties}
              >
                <div style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 12px',
                  backgroundColor: meta.id === currentChatId ? resolvedColors.cardBackground : 'transparent',
                  transition: 'background-color 0.2s'
                }}>
                  <button
                    style={{
                      flex: '1',
                      textAlign: isRTL ? 'right' : 'left',
                      transition: 'background-color 0.2s',
                      borderRadius: '8px',
                      padding: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      color: resolvedColors.textColor,
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => onChatSelect(meta.id)}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}>
                      <div style={{ minWidth: '0', flex: '1' }}>
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '14px',
                          color: resolvedColors.textColor,
                          fontWeight: meta.id === currentChatId ? 600 : 400
                        }}>{meta.title || (t ? t('history.untitledChat') : 'Untitled chat')}</div>
                      </div>
                      <div style={{
                        flexShrink: 0,
                        fontSize: '12px',
                        color: resolvedColors.mutedTextColor
                      }}>{mounted ? timeAgo(meta.updatedAt) : ''}</div>
                    </div>
                  </button>
                  <button
                    style={{
                      flexShrink: 0,
                      borderRadius: '6px',
                      padding: '8px',
                      color: resolvedColors.mutedTextColor,
                      border: '1px solid transparent',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={t ? t('history.deleteChat') : 'Delete chat'}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = resolvedColors.dangerColor;
                      e.currentTarget.style.backgroundColor = resolvedColors.dangerColorLight;
                      e.currentTarget.style.borderColor = `${resolvedColors.dangerColor}4d`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = resolvedColors.mutedTextColor;
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChatDelete(meta.id);
                    }}
                  >
                    <IconWrapper IconComponent={Trash2} size="16" strokeWidth="2" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
