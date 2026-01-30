/**
 * Message utility functions for converting between formats
 */

import { 
  ChatMessage, 
  Attachment, 
  UserContentPart, 
  AssistantContentPart 
} from '../types/chat';
import { 
  buildUserContent, 
  extractTextFromUserContent, 
  extractAttachmentsFromUserContent 
} from '../types/messages';

/**
 * Convert user message content to legacy format for backward compatibility
 */
export function getMessageText(message: ChatMessage): string {
  if (message.role === 'user') {
    // Try legacy text field first
    if (message.text) return message.text;
    
    // Extract from content
    return extractTextFromUserContent(message.content);
  }
  
  return '';
}

/**
 * Convert user message content to attachments for backward compatibility
 */
export function getMessageAttachments(message: ChatMessage): Attachment[] {
  if (message.role === 'user') {
    // Try legacy attachments field first
    if (message.attachments) return message.attachments;
    
    // Extract from content
    return extractAttachmentsFromUserContent(message.content);
  }
  
  return [];
}

/**
 * Create a user message in Vercel AI SDK format
 */
export function createUserMessage(
  text: string, 
  attachments: Attachment[] = []
): ChatMessage & { role: 'user' } {
  const content = buildUserContent(text, attachments);
  const now = Date.now();
  
  return {
    id: `user_${now}_${Math.random().toString(36).slice(2)}`,
    role: 'user',
    content,
    createdAt: now,
    // Keep legacy fields for backward compatibility
    text,
    attachments: attachments.length > 0 ? attachments : undefined
  };
}

/**
 * Create an assistant message in Vercel AI SDK format
 */
export function createAssistantMessage(defaultReasoningOpen = false): ChatMessage & { role: 'assistant' } {
  const now = Date.now();
  
  return {
    id: `assistant_${now}_${Math.random().toString(36).slice(2)}`,
    role: 'assistant',
    items: [],
    reasoning: '',
    reasoningOpen: defaultReasoningOpen,
    mainAgentActions: [],
    createdAt: now
  };
}

/**
 * Convert messages to API format (for sending to agent)
 * Properly formats messages according to Vercel AI SDK specification:
 * - User: text + images + files
 * - Assistant: first agent message + reasoning + tool calls + final text (items stringified)
 * - Tool: separate tool result messages
 */
export function messagesToAPIFormat(messages: ChatMessage[]): Array<{
  role: string;
  content: any;
}> {
  const result: Array<{ role: string; content: any }> = [];
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      // User messages: keep content as-is (string or array of TextPart/ImagePart/FilePart)
      result.push({
        role: msg.role,
        content: msg.content
      });
    } else if (msg.role === 'assistant') {
      // Assistant messages: construct content array with all parts
      const contentParts: AssistantContentPart[] = [];
      
      // Process main agent actions (reasoning and tool calls)
      if (msg.mainAgentActions && msg.mainAgentActions.length > 0) {
        for (const action of msg.mainAgentActions) {
          if (action.type === 'reasoning' && action.reasoning) {
            contentParts.push({
              type: 'reasoning',
              text: action.reasoning
            });
          } else if (action.type === 'tool-call' && action.toolName) {
            // Compute a stable toolCallId for both the tool-call and tool-result
            const stableToolCallId = action.toolCallId 
              || (typeof action.startDate === 'number' && action.toolName 
                  ? `${action.toolName}_${action.startDate}`
                  : `call_${action.toolName || 'tool'}_${Math.abs((action.durationMs || 0))}`);

            // Tool calls go in assistant content
            contentParts.push({
              type: 'tool-call',
              toolCallId: stableToolCallId,
              toolName: action.toolName,
              input: action.input || {}
            });
            
            // Tool results become separate tool messages
            if (action.output !== undefined) {
              result.push({
                role: 'tool',
                content: [{
                  type: 'tool-result',
                  toolCallId: stableToolCallId,
                  toolName: action.toolName,
                  output: action.output,
                  isError: action.status === 'error'
                }]
              });
            }
          }
        }
      }
      
      // Add final response items as stringified text
      if (msg.items && msg.items.length > 0) {
        const itemsText = JSON.stringify(msg.items, null, 2);
        contentParts.push({
          type: 'text',
          text: itemsText
        });
      }
      
      // Only add assistant message if it has content
      if (contentParts.length > 0) {
        result.push({
          role: msg.role,
          content: contentParts
        });
      }
    }
  }
  
  return result;
}

/**
 * Update a user message with new text and attachments
 */
export function updateUserMessage(
  message: ChatMessage & { role: 'user' },
  text: string,
  attachments?: Attachment[]
): ChatMessage & { role: 'user' } {
  const newAttachments = attachments ?? getMessageAttachments(message);
  const content = buildUserContent(text, newAttachments);
  
  return {
    ...message,
    content,
    text,
    attachments: newAttachments.length > 0 ? newAttachments : undefined
  };
}

/**
 * Check if a message has attachments
 */
export function hasAttachments(message: ChatMessage): boolean {
  if (message.role === 'user') {
    const attachments = getMessageAttachments(message);
    return attachments.length > 0;
  }
  return false;
}

/**
 * Get display text for a message (useful for chat history preview)
 */
export function getMessageDisplayText(message: ChatMessage): string {
  if (message.role === 'user') {
    const text = getMessageText(message);
    const attachments = getMessageAttachments(message);
    
    if (attachments.length > 0) {
      return `${text} [${attachments.length} attachment${attachments.length > 1 ? 's' : ''}]`;
    }
    
    return text;
  } else if (message.role === 'assistant') {
    // Extract text from items
    const items = message.items || [];
    const textItems = items.filter((item: any) => item.type === 'text');
    if (textItems.length > 0) {
      return textItems.map((item: any) => item.text || '').join(' ').slice(0, 100);
    }
    return 'Assistant response';
  }
  
  return '';
}
