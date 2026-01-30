/**
 * Vercel AI SDK compatible message types
 * Based on https://sdk.vercel.ai/docs/ai-sdk-core/messages
 */

import type { Attachment } from './chat';

// Content Parts for User Messages
export type TextPart = {
  type: 'text';
  text: string;
};

export type ImagePart = {
  type: 'image';
  image: string | URL;
  mediaType?: string;
};

export type FilePart = {
  type: 'file';
  data: string | URL;
  mediaType: string;
  name?: string;
};

export type UserContentPart = TextPart | ImagePart | FilePart;

// Content Parts for Assistant Messages
export type AssistantTextPart = {
  type: 'text';
  text: string;
};

export type ReasoningPart = {
  type: 'reasoning';
  text: string;
};

export type AssistantFilePart = {
  type: 'file';
  data: string | URL;
  mediaType: string;
  filename?: string;
};

export type ToolCallPart = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  input: any;
};

export type AssistantContentPart = AssistantTextPart | ReasoningPart | AssistantFilePart | ToolCallPart;

// Content Parts for Tool Messages
export type ToolResultPart = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  output: unknown;
  isError?: boolean;
};

// Message Types
export type SystemModelMessage = {
  role: 'system';
  content: string;
};

export type UserModelMessage = {
  role: 'user';
  content: string | UserContentPart[];
};

export type AssistantModelMessage = {
  role: 'assistant';
  content: string | AssistantContentPart[];
};

export type ToolModelMessage = {
  role: 'tool';
  content: ToolResultPart[];
};

export type ModelMessage = 
  | SystemModelMessage 
  | UserModelMessage 
  | AssistantModelMessage 
  | ToolModelMessage;

// Extended Message Types for UI (includes ID and metadata)
export type UIMessage = ModelMessage & {
  id: string;
  createdAt?: number;
  metadata?: Record<string, any>;
};

// Helper to convert Attachment to content parts
export function attachmentToContentPart(attachment: Attachment): ImagePart | FilePart {
  const isImage = attachment.mimeType?.startsWith('image/');
  
  if (isImage) {
    return {
      type: 'image',
      image: new URL(attachment.url),
      mediaType: attachment.mimeType || 'image/*'
    };
  } else {
    return {
      type: 'file',
      data: attachment.url,
      mediaType: attachment.mimeType || 'application/octet-stream',
      name: attachment.name || 'file'
    };
  }
}

// Helper to build user content from text and attachments
export function buildUserContent(text: string, attachments: Attachment[]): string | UserContentPart[] {
  const trimmedText = (text || '').trim();
  
  // If no attachments, return simple string
  if (!attachments || attachments.length === 0) {
    return trimmedText;
  }
  
  // Build parts array
  const parts: UserContentPart[] = [];
  
  // Add text part if present
  if (trimmedText) {
    parts.push({ type: 'text', text: trimmedText });
  }
  
  // Add attachment parts
  for (const attachment of attachments) {
    parts.push(attachmentToContentPart(attachment));
  }
  
  return parts;
}

// Helper to extract text from user content
export function extractTextFromUserContent(content: string | UserContentPart[]): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    const textParts = content.filter((part): part is TextPart => part.type === 'text');
    return textParts.map(part => part.text).join('\n');
  }
  
  return '';
}

// Helper to extract attachments from user content
export function extractAttachmentsFromUserContent(content: string | UserContentPart[]): Attachment[] {
  if (typeof content === 'string' || !Array.isArray(content)) {
    return [];
  }
  
  const attachments: Attachment[] = [];
  
  for (const part of content) {
    if (part.type === 'image') {
      const url = typeof part.image === 'string' ? part.image : part.image.toString();
      attachments.push({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: 'image',
        url,
        mimeType: part.mediaType || 'image/jpeg',
        size: 0
      });
    } else if (part.type === 'file') {
      const url = typeof part.data === 'string' ? part.data : part.data.toString();
      attachments.push({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: part.name || 'file',
        url,
        mimeType: part.mediaType,
        size: 0
      });
    }
  }
  
  return attachments;
}
