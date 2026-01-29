import React from "react";
import type { ThemeColors } from "../../utils/chat-theme";

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isLoading: boolean;
  uploading: boolean;
  attachments: Array<{ id: string; name: string; url: string; mimeType: string; size: number }>;
  formatBytes: (n: number) => string;
  handleRemoveAttachment: (id: string) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onStop: () => void;
  status?: 'ready' | 'streaming' | 'submitted' | 'error';
  t: (k: string) => string;
  resolvedColors: ThemeColors;
  fullPage?: boolean;
  dir?: 'rtl' | 'ltr';
}

export function ChatInput({ input, setInput, textareaRef, fileInputRef, isLoading, uploading, attachments, formatBytes, handleRemoveAttachment, onFileInputChange, onSend, onStop, status, t, resolvedColors, fullPage, dir = 'ltr' }: ChatInputProps) {
  const canStop = status === 'streaming' || status === 'submitted';
  const hasMessages = attachments.length > 0 || input.trim().length > 0;
  const isRTL = dir === 'rtl';

  if (fullPage) {
    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '768px', margin: '0 auto' }}>
        <div 
          style={{ 
            position: 'relative', 
            width: '100%', 
            borderRadius: '26px', 
            padding: isRTL ? '14px 48px 14px 14px' : '14px 14px 14px 48px', 
            backgroundColor: resolvedColors.inputBackground, // Use input background instead of card background
            boxShadow: '0 0 0 1px rgba(0,0,0,0.05)', // Subtle border
            transition: 'box-shadow 0.2s ease',
            direction: isRTL ? 'rtl' : 'ltr',
          }}
          onFocus={(e) => {
             // Optional: add focus ring
          }}
        >
          {/* Attach Button - Left aligned */}
          <div style={{ position: 'absolute', bottom: '10px', ...(isRTL ? { right: '12px' } : { left: '12px' }), zIndex: 10 }}>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isLoading || uploading} 
              style={{ 
                borderRadius: '50%', 
                width: '33px',
                height: '33px',
                transition: 'all 0.2s', 
                backgroundColor: 'transparent', 
                border: 'none', 
                cursor: isLoading || uploading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: resolvedColors.textColor, 
                opacity: isLoading || uploading ? 0.5 : 0.7 
              }} 
              aria-label={t('input.attachFiles')}
              onMouseEnter={(e) => {
                if (!isLoading && !uploading) {
                  e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.7';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {/* Attachments Area */}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: '8px', ...(isRTL ? { marginRight: '-4px', justifyContent: 'flex-end' } : { marginLeft: '-4px' }) }}>
                {attachments.map((att) => {
                  const isImage = att.mimeType.startsWith('image/');
                  return (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '8px',  padding: '6px 10px', backgroundColor: resolvedColors.cardBackground, borderRadius: '8px', border: `1px solid ${resolvedColors.borderColor}`, fontSize: '12px', color: resolvedColors.textColor, position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: isImage ? 'transparent' : resolvedColors.inputBackground }}>
                        {isImage ? (
                          <img src={att.url} alt={att.name} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="4" width="16" height="20" rx="2" ry="2" />
                          </svg>
                        )}
                      </div>
                      <span title={att.name} style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{att.name}</span>
                      <button onClick={() => handleRemoveAttachment(att.id)} style={{ background: 'none', border: 'none', color: resolvedColors.mutedTextColor, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px',}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {uploading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: resolvedColors.mutedTextColor }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>{t('input.uploadingFiles')}</span>
              </div>
            )}

            <div style={{ ...(isRTL ? { paddingLeft: '40px' } : { paddingRight: '40px' }), display:"flex", alignItems:"center"}}>
              <textarea
                ref={textareaRef}
                aria-label={t('input.prompt')}
                rows={1}
                placeholder={t('input.placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                disabled={uploading}
                style={{
                 
                  maxHeight: '200px',
                  width: '100%',
                  resize: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  outline: 'none',
                  border: 'none',
                  color: resolvedColors.textColor,
                  fontFamily: 'inherit',
                  overflow: 'auto',
                  padding: 0,
                  margin: 0,
                  direction: isRTL ? 'rtl' : 'ltr',
                  textAlign: isRTL ? 'right' : 'left'
                }}
              />
            </div>
          </div>

          {/* Send/Stop Button - Right aligned */}
          <div style={{ position: 'absolute', bottom: '8px', ...(isRTL ? { left: '8px' } : { right: '8px' }) }}>
             {isLoading ? (
              <button 
                onClick={onStop} 
                disabled={!canStop}
                aria-label={t('input.stop')} 
                style={{
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  transition: 'all 0.2s ease-out',
                  backgroundColor: resolvedColors.textColor, // Solid black/white
                  color: resolvedColors.inputBackground, // Inverted icon color
                  border: 'none',
                  opacity: canStop ? 1 : 0.7,
                  cursor: canStop ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect width="24" height="24" rx="2" />
                </svg>
              </button>
            ) : (
              <button 
                onClick={onSend} 
                disabled={(!hasMessages) || uploading} 
                aria-label={t('input.send')} 
                style={{ 
                  borderRadius: '50%', 
                  width: '36px',
                  height: '36px',
                  transition: 'all 0.2s ease-out', 
                  backgroundColor: (!hasMessages) || uploading ? resolvedColors.cardBackground : resolvedColors.textColor, 
                  color: (!hasMessages) || uploading ? resolvedColors.mutedTextColor : resolvedColors.inputBackground, 
                  border: 'none',
                  cursor: (!hasMessages) || uploading ? 'default' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  transform: isRTL ? "rotate(180deg)" : ""
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <input ref={fileInputRef} type="file" multiple onChange={onFileInputChange} style={{ display: 'none' }} accept="*/*" />
        
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', color: resolvedColors.mutedTextColor, opacity: 0.8 }}>
          AI can make mistakes. Please check important information.
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'sticky', bottom: '0', marginTop: 'auto', paddingBottom: '8px', paddingTop: '4px',  }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <div style={{ position: 'relative', width: '100%', borderRadius: '16px', paddingBottom: '48px', paddingTop: '16px', border: `1px solid ${resolvedColors.borderColor}`, backgroundColor: resolvedColors.cardBackground }}>
          {attachments.length > 0 && (
            <div style={{ padding: '0px 16px 12px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {attachments.map((att) => {
                const isImage = att.mimeType.startsWith('image/');
                return (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '8px',  padding: '8px 12px', backgroundColor: resolvedColors.inputBackground, borderRadius: '10px', border: `1px solid ${resolvedColors.borderColor}`, fontSize: '12px', color: resolvedColors.textColor, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: isImage ? 'transparent' : resolvedColors.cardBackground }}>
                      {isImage ? (
                        <img src={att.url} alt={att.name} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="4" width="16" height="20" rx="2" ry="2" />
                        </svg>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span title={att.name} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{att.name}</span>
                      <span style={{ color: resolvedColors.mutedTextColor, fontSize: '10px', marginTop: '2px' }}>{formatBytes(att.size)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                      {isImage && (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ background: 'none', border: 'none', color: resolvedColors.mutedTextColor, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px', textDecoration: 'none' }} title={t('input.previewImage')}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </a>
                      )}
                      <button onClick={() => handleRemoveAttachment(att.id)} style={{ background: 'none', border: 'none', color: resolvedColors.mutedTextColor, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px' }} title={t('input.removeFile')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {uploading && (
            <div style={{
              padding: '0px 16px 12px 16px',
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

          <div style={{ padding: '0 16px' }}>
            <textarea
              ref={textareaRef}
              aria-label={t('input.prompt')}
              rows={1}
              placeholder={t('input.placeholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              disabled={uploading}
              style={{
                height: '24px',
                maxHeight: '200px',
                width: '100%',
                resize: 'none',
                backgroundColor: 'transparent',
                fontSize: '15px',
                lineHeight: '1.6',
                outline: 'none',
                border: 'none',
                color: resolvedColors.textColor,
                fontFamily: 'inherit',
                overflow: 'auto',
                direction: isRTL ? 'rtl' : 'ltr',
                textAlign: isRTL ? 'right' : 'left'
              }}
            />
          </div>

          <input ref={fileInputRef} type="file" multiple onChange={onFileInputChange} style={{ display: 'none' }} accept="*/*" />

          <div style={{ position: 'absolute', bottom: '8px', ...(isRTL ? { right: '8px' } : { left: '8px' }), display: 'flex', alignItems: 'center', gap: '4px', color: resolvedColors.mutedTextColor }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || uploading} style={{ borderRadius: '8px', padding: '8px', transition: 'all 0.2s', backgroundColor: 'transparent', border: 'none', cursor: isLoading || uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', opacity: isLoading || uploading ? 0.5 : 1 }} aria-label={t('input.attachFiles')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.49" />
              </svg>
            </button>
          </div>

          <div style={{ position: 'absolute', bottom: '8px', ...(isRTL ? { left: '8px' } : { right: '8px' }) }}>
            {/* Stop button - shows when streaming or submitted */}
            {isLoading ? (
              <button 
                onClick={onStop} 
                disabled={!canStop}
                aria-label={t('input.stop')} 
                title="Stop generation"
                style={{
                  borderRadius: '12px',
                  padding: '12px',
                  transition: 'all 0.2s ease-out',
                  border: `1px solid ${resolvedColors.errorColor}`,
                  backgroundColor: resolvedColors.errorColorLight || `${resolvedColors.errorColor}20`,
                  color: resolvedColors.errorColor,
                  opacity: canStop ? 1 : 0.4,
                  cursor: canStop ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (canStop) {
                    e.currentTarget.style.backgroundColor = resolvedColors.errorColorLight || `${resolvedColors.errorColor}30`;
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = resolvedColors.errorColorLight || `${resolvedColors.errorColor}20`;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                </svg>
              </button>
            ) : (
              <button 
                onClick={onSend} 
                disabled={(!hasMessages) || uploading} 
                aria-label={t('input.send')} 
                title="Send message"
                style={{ 
                  borderRadius: '12px', 
                  padding: '12px',
                  transition: 'all 0.2s ease-out', 
                  border: `1px solid ${resolvedColors.borderColor}`, 
                  backgroundColor: resolvedColors.cardBackground, 
                  color: (!hasMessages) || uploading ? resolvedColors.mutedTextColor : resolvedColors.primaryColor, 
                  cursor: (!hasMessages) || uploading ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  opacity: (!hasMessages) || uploading ? 0.5 : 1 
                }}
                onMouseEnter={(e) => {
                  if (hasMessages && !uploading) {
                    e.currentTarget.style.borderColor = resolvedColors.primaryColor;
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = resolvedColors.borderColor;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 7-7 7 7"/>
                  <path d="M12 19V5"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


