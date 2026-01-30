import React from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';

export interface XMarkdownRendererProps {
  content: string;
  theme?: 'light' | 'dark';
  streaming?: boolean;
  dir?: 'rtl' | 'ltr';
}

export function XMarkdownRenderer({ 
  content, 
  theme = 'dark',
  streaming = false,
  dir = 'ltr',
}: XMarkdownRendererProps) {
  // Type assertion to handle React 18 compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MarkdownComponent = XMarkdown as React.ComponentType<any>;
  
  const isRTL = dir === 'rtl';
  
  return (
    <div dir={dir} className="x-markdown-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
      <MarkdownComponent
        content={content}
        className={theme === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'}
        streaming={{
          hasNextChunk: streaming,
          enableAnimation: true,
          animationConfig: {
            fadeDuration: 200,
          },
          // Map incomplete markdown tokens to loading components
          incompleteMarkdownComponentMap: {
            html: 'IncompleteBlock',    // For incomplete HTML/custom tags
            link: 'IncompleteBlock',     // For incomplete links
            image: 'IncompleteBlock',    // For incomplete images
          },
        }}
        openLinksInNewTab={true}
        config={{
          gfm: true, // GitHub Flavored Markdown
        }}
        dompurifyConfig={{
          // Allow custom HTML tags for components
          ADD_TAGS: ['data-chart', 'welcome', 'user-card', 'mermaid'],
          ADD_ATTR: ['data-source', 'data-spec', 'data-icon', 'data-description', 'data-raw'],
        }}
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          wordBreak: 'break-word',
          maxWidth: '100%',
          overflow: 'hidden',
          direction: dir,
          width: '100%',
        }}
      />
      <style>{`
        /* Fix light theme text colors */
        .x-markdown-light {
          color: #111827 !important;
        }
        
        .x-markdown-light p,
        .x-markdown-light span,
        .x-markdown-light div,
        .x-markdown-light li,
        .x-markdown-light td,
        .x-markdown-light th {
          color: #111827 !important;
        }
        
        .x-markdown-light h1,
        .x-markdown-light h2,
        .x-markdown-light h3,
        .x-markdown-light h4,
        .x-markdown-light h5,
        .x-markdown-light h6 {
          color: #111827 !important;
        }
        
        .x-markdown-light a {
          color: #2563eb !important;
        }
        
        .x-markdown-light code {
          color: #111827 !important;
        }
        
        .x-markdown-light blockquote {
          color: #374151 !important;
        }
        
        /* Ensure tables take full width */
        .x-markdown-wrapper table,
        .x-markdown-dark table,
        .x-markdown-light table {
          width: 100% !important;
          table-layout: auto !important;
          display: table !important;
          box-sizing: border-box !important;
        }
        
        .x-markdown-wrapper table thead,
        .x-markdown-wrapper table tbody,
        .x-markdown-wrapper table tfoot {
          width: 100% !important;
          display: table-header-group !important;
        }
        
        .x-markdown-wrapper table tbody {
          display: table-row-group !important;
        }
        
        .x-markdown-wrapper table tr {
          width: 100% !important;
          display: table-row !important;
        }
        
        .x-markdown-wrapper table th,
        .x-markdown-wrapper table td {
          display: table-cell !important;
          box-sizing: border-box !important;
        }
      `}</style>
      {isRTL && (
        <style>{`
          /* Lists */
          [dir="rtl"] ul,
          [dir="rtl"] ol {
            padding-right: 2em;
            padding-left: 0;
          }
          
          [dir="rtl"] ul li,
          [dir="rtl"] ol li {
            text-align: right;
          }
          
          [dir="rtl"] ul {
            list-style-position: inside;
          }
          
          [dir="rtl"] ol {
            list-style-position: inside;
          }
          
          /* Blockquotes */
          [dir="rtl"] blockquote {
            border-left: none;
            border-right: 4px solid;
            padding-left: 0;
            padding-right: 1em;
            margin-left: 0;
            margin-right: 0;
          }
          
          /* Code blocks - keep LTR */
          [dir="rtl"] code {
            direction: ltr;
            text-align: left;
            display: inline-block;
          }
          
          [dir="rtl"] pre {
            direction: ltr;
            text-align: left;
          }
          
          [dir="rtl"] pre code {
            direction: ltr;
            text-align: left;
          }
          
          /* Tables */
          [dir="rtl"] table {
            direction: rtl;
            width: 100%;
          }
          
          [dir="rtl"] table th,
          [dir="rtl"] table td {
            text-align: right;
          }
          
          [dir="rtl"] table th:first-child,
          [dir="rtl"] table td:first-child {
            padding-right: 12px;
            padding-left: 12px;
          }
          
          [dir="rtl"] table th:last-child,
          [dir="rtl"] table td:last-child {
            padding-left: 12px;
            padding-right: 12px;
          }
          
          /* Headings */
          [dir="rtl"] h1,
          [dir="rtl"] h2,
          [dir="rtl"] h3,
          [dir="rtl"] h4,
          [dir="rtl"] h5,
          [dir="rtl"] h6 {
            text-align: right;
          }
          
          /* Paragraphs */
          [dir="rtl"] p {
            text-align: right;
          }
          
          /* Links */
          [dir="rtl"] a {
            direction: rtl;
          }
          
          /* Horizontal rules */
          [dir="rtl"] hr {
            margin-left: 0;
            margin-right: 0;
          }
          
          /* Task lists */
          [dir="rtl"] input[type="checkbox"] {
            margin-right: 0;
            margin-left: 0.5em;
          }
          
          /* Nested lists */
          [dir="rtl"] ul ul,
          [dir="rtl"] ol ol,
          [dir="rtl"] ul ol,
          [dir="rtl"] ol ul {
            padding-right: 2em;
            padding-left: 0;
          }
          
          /* Images */
          [dir="rtl"] img {
            margin-left: auto;
            margin-right: 0;
          }
          
          /* Details/Summary */
          [dir="rtl"] details {
            text-align: right;
          }
          
          [dir="rtl"] summary {
            text-align: right;
          }
        `}</style>
      )}
    </div>
  );
}
