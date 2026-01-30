import React from "react";
import { XMarkdownRenderer } from "../XMarkdownRenderer";
import { UIErrorBoundary } from "./UIErrorBoundary";

type ThemeColors = {
  mutedTextColor: string;
  inputBackground: string;
  borderColor: string;
  textColor: string;
  warningColor: string;
  infoColor: string;
  errorColor: string;
  errorColorLight: string;
  errorColorDark: string;
  successColor: string;
};

interface AssistantMassageProps {
  parts: any[];
  messageId: string;
  openReasoningIds: Set<string>;
  toggleReasoning: (id: string) => void;
  resolvedColors: ThemeColors;
  HsafaUI?: Record<string, React.ComponentType<any>>;
  onUIError?: (toolCallId: string, toolName: string, error: Error) => void;
  onUISuccess?: (toolCallId: string, toolName: string) => void;
  addToolResult?: (payload: any) => void;
  dir?: 'rtl' | 'ltr';
  t?: (k: string) => string;
  theme?: 'light' | 'dark';
}

const getToolStatus = (state?: string, t?: (k: string) => string, colors?: ThemeColors) => {
  const statusMap: Record<string, { color: string; text: string }> = {
    'input-streaming': { color: colors?.warningColor || '#eab308', text: t ? t('tool.inputting') : 'Inputting' },
    'input-available': { color: colors?.infoColor || '#3b82f6', text: t ? t('tool.running') : 'Running' },
    'error': { color: colors?.errorColor || '#ef4444', text: t ? t('tool.error') : 'Error' },
    'output-available': { color: colors?.successColor || '#10b981', text: t ? t('tool.called') : 'Called' },
    'finished': { color: colors?.successColor || '#10b981', text: t ? t('tool.called') : 'Called' }
  };
  return statusMap[state || 'output-available'] || statusMap['output-available'];
};

/**
 * Parse MCP tool name format: {label}_{hash}_{originalToolName}
 * Returns { isMCP: true, mcpName, toolName } if it's an MCP tool
 * Otherwise returns { isMCP: false, toolName: original }
 */
const parseMCPToolName = (fullToolName: string): { isMCP: boolean; mcpName?: string; toolName: string } => {
  // MCP tools follow pattern: {label}_{6-char-hash}_{toolName}
  // Example: PostgreSQL_26e10d_execute_sql
  const mcpPattern = /^(.+?)_([a-f0-9]{6})_(.+)$/;
  const match = fullToolName.match(mcpPattern);
  
  if (match) {
    const [, label, , originalToolName] = match;
    return {
      isMCP: true,
      mcpName: label.replace(/_/g, ' '), // Convert underscores to spaces in MCP name
      toolName: originalToolName.replace(/_/g, ' ') // Convert underscores to spaces in tool name
    };
  }
  
  return { isMCP: false, toolName: fullToolName };
};

/**
 * Format tool name to be more readable
 * Converts camelCase, snake_case, kebab-case to readable text
 */
const formatToolName = (toolName: string): string => {
  return toolName
    // Handle snake_case
    .replace(/_/g, ' ')
    // Handle kebab-case
    .replace(/-/g, ' ')
    // Handle camelCase (insert space before capitals)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter of each word
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


export function AssistantMassage({ parts, messageId, openReasoningIds, toggleReasoning, resolvedColors, HsafaUI, onUIError, onUISuccess, addToolResult, dir = 'ltr', t, theme = 'dark' }: AssistantMassageProps) {
  const isRTL = dir === 'rtl';
  const groups: Array<
    { type: 'reasoning'; texts: string[]; startDate?: number; endDate?: number; isCompleted?: boolean } |
    { type: 'tool'; toolName?: string; status?: string; input?: any; output?: any; startDate?: number; endDate?: number; toolCallId?: string } |
    { type: 'text'; text: string; startDate?: number; endDate?: number }
  > = [];

  let currentReasonings: string[] = [];
  let reasoningStartDate: number | undefined;
  let reasoningEndDate: number | undefined;
  let reasoningCompleted = false;

  for (const it of Array.isArray(parts) ? parts : []) {
    if (!it) continue;
    // Reasoning chunks
    if (it.type === 'reasoning' && typeof it.text === 'string') {
      currentReasonings.push(it.text);
      if (!reasoningStartDate) reasoningStartDate = it.startDate;
      reasoningEndDate = it.endDate;
      // Check if this reasoning part is marked as done
      if (it.state === 'done') {
        reasoningCompleted = true;
      }
      continue;
    }

    // Text content (e.g., from plainText tool)
    if (it.type === 'text' && typeof it.text === 'string') {
      // Flush any pending reasoning first
      if (currentReasonings.length) {
        groups.push({ 
          type: 'reasoning', 
          texts: currentReasonings, 
          startDate: reasoningStartDate, 
          endDate: reasoningEndDate,
          isCompleted: reasoningCompleted
        });
        currentReasonings = [];
        reasoningStartDate = undefined;
        reasoningEndDate = undefined;
        reasoningCompleted = false;
      }
      
      groups.push({
        type: 'text',
        text: it.text,
        startDate: it.startDate,
        endDate: it.endDate
      });
      continue;
    }

    // Tool calls: support both "tool-*" and "dynamic-tool"
    const isDynamicTool = it.type === 'dynamic-tool';
    const isPrefixedTool = typeof it.type === 'string' && it.type.startsWith('tool-');
    if (isDynamicTool || isPrefixedTool || it.type === 'tool-call') {
      if (currentReasonings.length) {
        groups.push({ 
          type: 'reasoning', 
          texts: currentReasonings, 
          startDate: reasoningStartDate, 
          endDate: reasoningEndDate,
          isCompleted: reasoningCompleted
        });
        currentReasonings = [];
        reasoningStartDate = undefined;
        reasoningEndDate = undefined;
        reasoningCompleted = false;
      }

      const derivedToolName = isDynamicTool
        ? String(it.toolName || 'dynamic-tool')
        : isPrefixedTool
          ? String(it.type?.slice('tool-'.length) || 'tool')
          : String(it.toolName || 'tool');

      if (derivedToolName === 'requestInput') {
        // Render a placeholder host so inline form mounts in the tool area
        groups.push({
          type: 'tool',
          toolName: derivedToolName,
          status: it.state || it.status,
          input: it.input,
          output: it.output,
          startDate: it.startDate,
          endDate: it.endDate,
          toolCallId: it.toolCallId,
        } as any);
      } else {
        groups.push({
          type: 'tool',
          toolName: derivedToolName,
          status: it.state || it.status, // Use 'state' field, fallback to 'status'
          input: it.input,
          output: it.output,
          startDate: it.startDate,
          endDate: it.endDate,
          toolCallId: it.toolCallId
        });
      }
      continue;
    }
  }

  if (currentReasonings.length) {
    groups.push({ 
      type: 'reasoning', 
      texts: currentReasonings, 
      startDate: reasoningStartDate, 
      endDate: reasoningEndDate,
      isCompleted: reasoningCompleted
    });
  }

  if (!groups.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', direction: isRTL ? 'rtl' : 'ltr' }}>
      {groups.map((g, idx) => {
        const itemId = `${messageId}-${idx}`;
        const isOpen = openReasoningIds.has(itemId);

        if (g.type === 'reasoning') {
          const isCompleted = g.isCompleted || (typeof g.startDate === 'number' && typeof g.endDate === 'number');
          const hasText = g.texts && g.texts.length > 0 && g.texts.some(t => t.trim().length > 0);
    
          const handleClick = () => {
            if (hasText) {
              toggleReasoning(itemId);
            }
          };
          if (isCompleted && !hasText) {
            return null;
          }

          return (
            <div key={itemId} onClick={handleClick} style={{ cursor: hasText ? 'pointer' : 'default', padding: '0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isOpen ? '4px' : '0px' }}>
                <div style={{ fontSize: '13px', color: resolvedColors.mutedTextColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', maxWidth: '100%', minWidth: 0, width: '100%' }}>
                
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {!isCompleted && (
                          <span style={{ display: 'inline-block', height: '6px', width: '6px', borderRadius: '50%', backgroundColor: resolvedColors.mutedTextColor, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        )}
                        <span 
                          style={{ 
                            color: resolvedColors.textColor, 
                            fontWeight: 600, 
                            opacity: 0.9,
                            background: !isCompleted  ? `linear-gradient(90deg, ${resolvedColors.textColor}, ${resolvedColors.mutedTextColor}, ${resolvedColors.mutedTextColor})` : 'none',
                            backgroundSize: !isCompleted  ? '200% 100%' : 'auto',
                            backgroundClip: !isCompleted ? 'text' : 'unset',
                            WebkitBackgroundClip: !isCompleted ? 'text' : 'unset',
                            WebkitTextFillColor: !isCompleted? 'transparent' : resolvedColors.mutedTextColor,
                            animation: !isCompleted ? 'shimmer 2s ease-in-out infinite' : undefined
                          }}
                        >
                        {isCompleted ? (t ? t('assistant.finishThinking') : 'Finish Thinking') : (t ? t('assistant.thinking') : 'Thinking')}
                        </span>
                      </span>
                  
                  {hasText && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease-out' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateRows: (isOpen || !isCompleted) ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease-out', overflow: 'hidden' }}>
                  <div style={{ minHeight: 0 }}>
                    {g.texts && g.texts.length > 0 ? (
                      <div style={{ fontSize: '13px', color: resolvedColors.mutedTextColor, lineHeight: '1.6', maxWidth: '100%' }}>
                        {/* While expanded and streaming, show all reasoning; otherwise, show only the latest or all if completed and expanded */}
                        {(
                          (!isCompleted && isOpen)
                            ? g.texts
                            : (!isCompleted
                                ? [g.texts[g.texts.length - 1]]
                                : (isOpen ? g.texts : [])
                              )
                        ).map((t, i2) => (
                          <div key={`rg-line-${idx}-${i2}`} style={{ marginBottom: '6px', opacity: 0.5 }}>
                            <XMarkdownRenderer content={t} theme={theme} streaming={!isCompleted} dir={dir} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: resolvedColors.mutedTextColor, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', height: '6px', width: '6px', borderRadius: '50%', backgroundColor: resolvedColors.mutedTextColor, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <span style={{ letterSpacing: '2px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Handle text content
        if (g.type === 'text') {
          const isStreamingText = typeof g.endDate !== 'number';
          return (
            <div key={itemId} style={{ fontSize: '15px', color: resolvedColors.textColor, lineHeight: '1.6', direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
              <XMarkdownRenderer content={g.text} theme={theme} streaming={isStreamingText} dir={dir} />
            </div>
          );
        }

        // Handle tool calls - g.type is 'tool' at this point
        const { color, text } = getToolStatus(g.status, t, resolvedColors);
        const isRunning = g.status === 'input-streaming' || g.status === 'input-available';
        
        // Special case: requestInput
        if (g.toolName === 'requestInput') {
          return <div key={itemId} style={{ display: 'block', position: 'relative' }}>
            <div 
              data-get-from-user-host={(g as any).toolCallId || itemId}
              style={{ width: '100%' }}
            />
          </div>
        }
        
        // Check if a UI component exists for this tool name
        const UIByToolName = HsafaUI?.[g.toolName || ''];
        if (UIByToolName) {
          return (
            <div key={itemId} style={{ 
              display: 'block', 
              position: 'relative',
            }}>
              <UIErrorBoundary 
                componentName={g.toolName || 'Unknown'} 
                resolvedColors={resolvedColors}
                toolCallId={g.toolCallId}
                toolName={g.toolName || 'unknown'}
                onError={onUIError}
                onSuccess={onUISuccess}
              >
                <UIByToolName 
                  toolName={g.toolName || ''}
                  toolCallId={g.toolCallId || ''}
                  input={g.input}
                  output={g.output}
                  status={g.status}
                  addToolResult={addToolResult}
                  theme={theme}
                />
              </UIErrorBoundary>
            </div>
          );
        }

        // Default tool UI - Parse and format tool name
        const parsedTool = parseMCPToolName(g.toolName || 'tool');
        
        return (
          <div key={itemId} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: resolvedColors.mutedTextColor, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontWeight: 600, 
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ 
                    display: 'inline-block', 
                    height: '6px', 
                    width: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: color,
                    animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : undefined
                  }} />
                  {text}
                </span>
                {parsedTool.isMCP ? (
                  <span style={{ fontWeight: 500, color: resolvedColors.textColor }}>
                    <span style={{ fontWeight: 600 }}>{parsedTool.toolName}</span>
                    <span style={{ opacity: 0.7, margin: '0 4px' }}>from</span>
                    <span style={{ fontWeight: 600, opacity: 0.85 }}>{parsedTool.mcpName}</span>
                  </span>
                ) : (
                  <span style={{ fontWeight: 500, color: resolvedColors.textColor }}>
                    {formatToolName(parsedTool.toolName)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
     
     
      })}
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>
    </div>
  );
}


