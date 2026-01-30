import React from 'react';
import { createPortal } from 'react-dom';
import { ThemeColors } from '../../utils/chat-theme';
import { EditProcessContent } from '../../types/chat';
import { Pencil } from 'lucide-react';
import { IconWrapper } from '../IconWrapper';

interface ConfirmEditModalProps {
  isOpen: boolean;
  resolvedColors: ThemeColors;
  onConfirm: () => void;
  onCancel: () => void;
  editProcessContent?: EditProcessContent;
  dir?: 'rtl' | 'ltr';
  lang?: 'en' | 'ar';
  t?: (k: string) => string;
}

export function ConfirmEditModal({
  isOpen,
  resolvedColors,
  onConfirm,
  onCancel,
  editProcessContent,
  dir = 'ltr',
  t
}: ConfirmEditModalProps) {
  if (!isOpen) return null;

  // Use custom content or defaults
  const title = editProcessContent?.title || (t ? t('editModal.title') : 'Edit Message');
  const content = editProcessContent?.content || (t ? t('editModal.content') : 'This will remove this message and all messages after it, and place its content in the input field for editing. Do you want to continue?');
  const submitButtonLabel = editProcessContent?.submit_button_label || (t ? t('editModal.submit') : 'Edit');
  const cancelButtonLabel = editProcessContent?.cancel_button_label || (t ? t('editModal.cancel') : 'Cancel');
  const CustomIcon = editProcessContent?.icon;
  
  // Check if content is a React component or string
  const isContentComponent = typeof content === 'function';
  const ContentComponent = isContentComponent ? content as React.ComponentType<any> : null;

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
        onClick={onCancel}
      />
      {/* Modal panel */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1101,
          width: '420px',
          maxWidth: '94vw',
          overflow: 'hidden',
          borderRadius: '16px',
          border: `1px solid ${resolvedColors.borderColor}`,
          backgroundColor: resolvedColors.backgroundColor,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          direction: dir === 'rtl' ? 'rtl' : 'ltr'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${resolvedColors.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {CustomIcon ? (
            <div style={{ flexShrink: 0 }}>
              <IconWrapper IconComponent={CustomIcon} size="20" strokeWidth="2" />
            </div>
          ) : (
            <div style={{ flexShrink: 0, color: resolvedColors.mutedTextColor }}>
              <IconWrapper IconComponent={Pencil} size="20" strokeWidth="2" />
            </div>
          )}
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: resolvedColors.textColor,
            flex: 1
          }}>
            {title}
          </h3>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          color: resolvedColors.textColor,
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          {isContentComponent && ContentComponent ? (
            <ContentComponent />
          ) : (
            <p style={{ margin: 0 }}>
              {content as string}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '16px 24px',
          borderTop: `1px solid ${resolvedColors.borderColor}`,
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              border: `1px solid ${resolvedColors.borderColor}`,
              backgroundColor: 'transparent',
              color: resolvedColors.textColor,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {cancelButtonLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              backgroundColor: resolvedColors.primaryColor,
              color: resolvedColors.backgroundColor,
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {submitButtonLabel}
          </button>
        </div>
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
