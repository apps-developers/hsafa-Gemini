import React from 'react';
import { Loader2 } from 'lucide-react';
import { IconWrapper } from './IconWrapper';
import { Attachment } from '../types/chat';
import { ThemeColors } from '../utils/chat-theme';
import { AttachmentItem } from './AttachmentItem';

interface AttachmentInputProps {
  attachments: Attachment[];
  uploading: boolean;
  resolvedColors: ThemeColors;
  onRemoveAttachment: (id: string) => void;
}

export function AttachmentInput({
  attachments,
  uploading,
  resolvedColors,
  onRemoveAttachment
}: AttachmentInputProps) {
  if (attachments.length === 0 && !uploading) {
    return null;
  }

  return (
    <div>
      {attachments.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${resolvedColors.borderColor}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {attachments.map((att) => (
            <AttachmentItem
              key={att.id}
              attachment={att}
              resolvedColors={resolvedColors}
              mode="input"
              onRemove={onRemoveAttachment}
            />
          ))}
        </div>
      )}
      
      {uploading && (
        <div style={{
          padding: '8px 16px',
          borderBottom: `1px solid ${resolvedColors.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: resolvedColors.mutedTextColor
        }}>
          <IconWrapper IconComponent={Loader2} size="14" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Uploading files...</span>
        </div>
      )}
    </div>
  );
}
