/**
 * Type definitions for the Hsafa SDK - minimal exports used across the SDK
 */

import React from 'react';

export type Attachment = {
  id: string;
  name?: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string | URL; mediaType?: string }
  | { type: 'file'; data: string | URL; mediaType: string; name?: string };

export type AssistantContentPart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName?: string; input?: unknown };

export type ChatMessage =
  | {
      id: string;
      role: 'user';
      content: string | UserContentPart[];
      createdAt?: number;
      // legacy
      text?: string;
      attachments?: Attachment[];
    }
  | {
      id: string;
      role: 'assistant';
      content?: string | AssistantContentPart[];
      items: any[];
      reasoning?: string;
      reasoningOpen?: boolean;
      mainAgentActions?: any[];
      mcpToolCalls?: Array<{ toolName: string; args: unknown; timestamp?: number; status?: string }>;
      mcpToolResults?: Record<string, unknown>;
      createdAt?: number;
    };

// Frontend tool configuration
export type HsafaTool = 
  | ((input: any) => any | Promise<any>)
  | {
      tool: (input: any) => any | Promise<any>;
      executeEachToken?: boolean;
    };

// Custom tool UI render props
export type CustomToolUIRenderProps = {
  toolName: string;
  toolCallId: string;
  input: any;
  output: any;
  status?: string;
  addToolResult: (result: any) => void;
};

export interface HsafaChatProps {
  agentName: string;
  agentConfig: string;
  theme?: 'dark' | 'light';
  primaryColor?: string;
  primaryColorDark?: string;
  primaryColorLight?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
  errorColor?: string;
  errorColorLight?: string;
  errorColorDark?: string;
  successColor?: string;
  successColorLight?: string;
  warningColor?: string;
  warningColorLight?: string;
  infoColor?: string;
  infoColorLight?: string;
  dangerColor?: string;
  dangerColorLight?: string;
  dangerColorDark?: string;
  width?: number | string;
  maxWidth?: number | string;
  height?: string;
  expandable?: boolean;
  alwaysOpen?: boolean;
  defaultOpen?: boolean;
  floatingButtonPosition?: {
    bottom?: number | string;
    right?: number | string;
    top?: number | string;
    left?: number | string;
  };
  placeholder?: string;
  title?: string;
  emptyStateMessage?: string;
  className?: string;
  chatContainerClassName?: string;
  customStyles?: string; // Custom CSS to inject for styling all components
  dir?: 'rtl' | 'ltr';
  lang?: 'en' | 'ar';
  language?: 'en' | 'ar';
  defaultReasoningOpen?: boolean;
  hideReasoningContent?: boolean;
  HsafaTools?: Record<string, HsafaTool>;
  
  // Customization props
  componentAboveInput?: React.ComponentType<any>;
  editProcessContent?: EditProcessContent;
  presetPrompts?: Array<{ label: string; prompt: string }>;
  
  // Message lifecycle callbacks
  onStart?: (message: any) => void;
  onFinish?: (message: any) => void;
  
  // Controlled chat state (optional)
  currentChat?: string;
  onChatChanged?: (chatId: string) => void;
  // Optional templating parameters to include in each request body
  templateParams?: Record<string, unknown>;
  
  // Full page chat mode (centered, modern UI like ChatGPT)
  fullPageChat?: boolean;
}

export type EditProcessContent = {
  title?: string;
  content?: string | React.ComponentType<any>;
  submit_button_label?: string;
  cancel_button_label?: string;
  icon?: React.ComponentType<any>; // Icon shown in the modal header
  message_icon?: React.ComponentType<any>; // Icon shown in the editable message
};

export type { Attachment as DefaultAttachment };

