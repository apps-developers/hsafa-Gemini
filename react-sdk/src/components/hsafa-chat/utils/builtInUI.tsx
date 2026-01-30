import React from 'react';
import { XMarkdownRenderer } from '../../XMarkdownRenderer';

/**
 * PlainText - Built-in UI component that renders text with markdown support
 * Always available to agents without needing to be added to HsafaUI
 * 
 * @param text - The text content to render with markdown
 * @param theme - The theme to use for markdown rendering
 */
function PlainText({ input, theme = 'dark' }: { input: any; theme?: 'light' | 'dark' }) {
  return (
    <div style={{ 
      fontSize: '14px', 
      lineHeight: '1.6',
      width: '100%'
    }}>
      <XMarkdownRenderer content={input?.text || ''} theme={theme} />
    </div>
  );
}

/**
 * Creates built-in UI components that are always available to agents
 * These components don't need to be explicitly added to HsafaUI prop
 */
export function createBuiltInUI(): Record<string, React.ComponentType<any>> {
  return {
    plainText: PlainText,
  };
}

