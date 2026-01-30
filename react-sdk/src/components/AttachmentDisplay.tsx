import React from 'react';
import { Attachment } from '../types/chat';
import { ThemeColors } from '../utils/chat-theme';
import { AttachmentItem } from './AttachmentItem';

interface AttachmentDisplayProps {
  attachments: Attachment[];
  resolvedColors: ThemeColors;
  onRemove?: (id: string) => void;
}

export function AttachmentDisplay({ attachments, resolvedColors, onRemove }: AttachmentDisplayProps) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }

  const mode = typeof onRemove === 'function' ? 'editable' : 'viewable';

  return (
    <div style={{
      marginTop: '12px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      {attachments.map((att) => (
        <AttachmentItem
          key={att.id}
          attachment={att}
          resolvedColors={resolvedColors}
          mode={mode}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
