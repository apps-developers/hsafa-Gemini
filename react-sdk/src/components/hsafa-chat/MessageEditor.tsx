import React from 'react';
import { Plus } from 'lucide-react';
import { Attachment } from '../../types/chat';
import { AttachmentDisplay } from '../AttachmentDisplay';
import type { ThemeColors } from '../../utils/chat-theme';

interface MessageEditorProps {
  messageId: string;
  initialText: string;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onCancel: () => void;
  onSave: (messageId: string, text: string) => void;
  streaming: boolean;
  resolvedColors: ThemeColors;
  attachments?: Attachment[];
  onRemoveAttachment?: (id: string) => void;
  onAddAttachments?: (files: FileList) => void;
  uploading?: boolean;
  t: (key: string) => string;
}

export function MessageEditor({
  messageId,
  initialText,
  editingText,
  onEditingTextChange,
  onCancel,
  onSave,
  streaming,
  resolvedColors,
  attachments,
  onRemoveAttachment,
  onAddAttachments,
  uploading,
  t
}: MessageEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!streaming) {
        onSave(messageId, editingText || initialText);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onAddAttachments) {
      onAddAttachments(files);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{
      maxWidth: '720px',
      borderRadius: '16px',
      padding: '8px',
      fontSize: '15px',
      border: `2px solid ${resolvedColors.primaryColor}`,
      backgroundColor: resolvedColors.accentColor,
      color: resolvedColors.textColor,
        marginBottom: '16px',
        marginTop: '16px'
    }}>
      <textarea
        autoFocus
        style={{
          width: '100%',
          resize: 'none',
          backgroundColor: 'transparent',
          padding: '8px',
          lineHeight: '1.6',
          outline: 'none',
          border: 'none',
          color: 'inherit',
          fontFamily: 'inherit',
          fontSize: 'inherit'
        }}
        rows={Math.max(2, Math.min(10, Math.ceil((editingText || initialText).length / 60)))}
        value={editingText}
        onChange={(e) => onEditingTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      
      {attachments && attachments.length > 0 && (
        <div style={{ padding: '8px' }}>
          <AttachmentDisplay
            attachments={attachments}
            resolvedColors={resolvedColors}
            onRemove={onRemoveAttachment}
          />
        </div>
      )}
      
      {uploading && (
        <div style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: resolvedColors.mutedTextColor
        }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>{t('input.uploadingFiles')}</span>
        </div>
      )}
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '8px 8px 8px 0'
      }}>
        {/* File upload button */}
        {onAddAttachments && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || streaming}
              title={uploading ? t('input.uploadingFiles') : t('input.attachFiles')}
              style={{
                display: 'flex',
                margin: '0 10px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                transition: 'all 0.2s',
                border: `1px solid ${resolvedColors.borderColor}`,
                color: resolvedColors.mutedTextColor,
                backgroundColor: 'transparent',
                cursor: uploading || streaming ? 'not-allowed' : 'pointer',
                opacity: uploading || streaming ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!uploading && !streaming) {
                  e.currentTarget.style.backgroundColor = resolvedColors.inputBackground;
                  e.currentTarget.style.borderColor = resolvedColors.primaryColor;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = resolvedColors.borderColor;
              }}
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>
        )}
        
        {/* Action buttons container */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            style={{
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '14px',
              transition: 'background-color 0.2s',
              border: `1px solid ${resolvedColors.borderColor}`,
              color: resolvedColors.mutedTextColor,
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = resolvedColors.inputBackground}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={onCancel}
          >
            {t('editor.cancel')}
          </button>
          <button
            style={{
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '14px',
              transition: 'border-color 0.2s',
              border: `1px solid ${resolvedColors.borderColor}`,
              backgroundColor: resolvedColors.cardBackground,
              color: resolvedColors.textColor,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = resolvedColors.primaryColor}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = resolvedColors.borderColor}
            onClick={() => { if (!streaming) onSave(messageId, editingText || initialText); }}
          >
            {t('editor.saveAndRegenerate')}
          </button>
        </div>
      </div>
    </div>
  );
}
