import React from 'react';

/**
 * Example custom component for XMarkdown
 * 
 * Usage in LLM output:
 * ```markdown
 * <welcome
 *   data-icon="https://example.com/icon.png"
 *   title="Welcome to the App"
 *   data-description="This is a custom welcome card"
 * ></welcome>
 * ```
 * 
 * Then pass it to XMarkdownRenderer:
 * ```tsx
 * <XMarkdownRenderer
 *   content={markdown}
 *   customComponents={{
 *     welcome: WelcomeCard,
 *   }}
 * />
 * ```
 */

interface WelcomeCardProps {
  domNode?: {
    attribs?: {
      'data-icon'?: string;
      title?: string;
      'data-description'?: string;
    };
  };
  streamStatus?: 'loading' | 'done';
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ domNode, streamStatus }) => {
  const attrs = domNode?.attribs || {};
  const icon = attrs['data-icon'];
  const title = attrs['title'];
  const description = attrs['data-description'];

  // Show loading skeleton while streaming
  if (streamStatus === 'loading') {
    return (
      <div style={{
        padding: '24px',
        borderRadius: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px dashed rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            height: '20px',
            width: '60%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            marginBottom: '8px',
          }} />
          <div style={{
            height: '14px',
            width: '80%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'transform 0.2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      {icon && (
        <img
          src={icon}
          alt={title || 'Welcome'}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            objectFit: 'cover',
          }}
        />
      )}
      <div style={{ flex: 1 }}>
        {title && (
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '4px',
          }}>
            {title}
          </h3>
        )}
        {description && (
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.5,
          }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
