import React from 'react';
import { File, Eye, X, Download } from 'lucide-react';
import { IconWrapper } from './IconWrapper';
import { Attachment } from '../types/chat';
import { formatBytes } from '../utils/file';
import { ThemeColors } from '../utils/chat-theme';

interface AttachmentItemProps {
  attachment: Attachment;
  resolvedColors: ThemeColors;
  mode: 'editable' | 'viewable' | 'input';
  onRemove?: (id: string) => void;
  maxWidth?: string;
}

export function AttachmentItem({
  attachment,
  resolvedColors,
  mode,
  onRemove,
  maxWidth = '200px'
}: AttachmentItemProps) {
  const isImage = attachment.mimeType?.startsWith('image/');
  const isEditable = mode === 'editable' || mode === 'input';
  const isLink = mode === 'viewable';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: mode === 'input' ? '8px' : '6px',
    padding: mode === 'input' ? '8px 12px' : '6px 10px',
    backgroundColor: resolvedColors.inputBackground,
    borderRadius: mode === 'input' ? '10px' : '8px',
    border: `1px solid ${resolvedColors.borderColor}`,
    fontSize: mode === 'input' ? '12px' : '11px',
    color: resolvedColors.textColor,
    transition: 'all 0.2s ease-out',
    cursor: isLink ? 'pointer' : 'default',
    maxWidth: mode === 'input' ? '140px' : maxWidth,
    position: 'relative'
  };

  const content = (
    <>
      {/* Thumbnail or icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: mode === 'input' ? '20px' : '16px',
        height: mode === 'input' ? '20px' : '16px',
        borderRadius: mode === 'input' ? '4px' : '3px',
        backgroundColor: isImage ? 'transparent' : resolvedColors.accentColor,
        flexShrink: 0
      }}>
        {isImage ? (
          <img 
            src={attachment.url} 
            alt={attachment.name}
            style={{
              width: mode === 'input' ? '20px' : '16px',
              height: mode === 'input' ? '20px' : '16px',
              borderRadius: mode === 'input' ? '4px' : '3px',
              objectFit: 'cover'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fileIcon = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (fileIcon) fileIcon.style.display = 'block';
            }}
          />
        ) : null}
        <IconWrapper IconComponent={File}
          size={mode === 'input' ? 14 : 10} 
          strokeWidth="2" 
          style={{ 
            display: isImage ? 'none' : 'block',
            color: resolvedColors.mutedTextColor 
          }} 
        />
      </div>
      
      {/* File name and size */}
      <div style={{
        minWidth: '0',
        flex: '1',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <span 
          title={attachment.name}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: '500'
          }}
        >
          {attachment.name}
        </span>
        <span style={{
          fontSize: mode === 'input' ? '10px' : '9px',
          color: resolvedColors.mutedTextColor,
          marginTop: mode === 'input' ? '2px' : '1px'
        }}>
          {formatBytes(attachment.size ?? 0)}
        </span>
      </div>
      
      {/* Action buttons */}
      {mode === 'input' && isImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachment.url, '_blank');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: resolvedColors.mutedTextColor,
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
          title="Preview image"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
            e.currentTarget.style.color = resolvedColors.textColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = resolvedColors.mutedTextColor;
          }}
        >
          <IconWrapper IconComponent={Eye} size="12" strokeWidth="2" />
        </button>
      )}
      
      {isEditable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(attachment.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: mode === 'input' ? 'auto' : '16px',
            height: mode === 'input' ? 'auto' : '16px',
            padding: mode === 'input' ? '2px' : '0',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            color: resolvedColors.mutedTextColor,
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ef444420';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = resolvedColors.mutedTextColor;
          }}
        >
          <IconWrapper IconComponent={X} size="12" strokeWidth="2" />
        </button>
      )}
      
      {isLink && (
        <IconWrapper IconComponent={Download}
          size="10" 
          strokeWidth="2" 
          style={{ 
            color: resolvedColors.mutedTextColor,
            flexShrink: 0
          }} 
        />
      )}
    </>
  );

  if (isLink) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        style={{
          ...containerStyle,
          textDecoration: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
          e.currentTarget.style.borderColor = resolvedColors.primaryColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = resolvedColors.inputBackground;
          e.currentTarget.style.borderColor = resolvedColors.borderColor;
        }}
      >
        {content}
      </a>
    );
  }

  return <div style={containerStyle}>{content}</div>;
}
