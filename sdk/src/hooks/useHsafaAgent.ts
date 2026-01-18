/**
 * useHsafaAgent - The main headless hook for Hsafa Agent
 * 
 * This hook provides all the logic needed to integrate an AI agent into your custom UI.
 * It handles chat state, tool execution, message streaming, and more.
 * 
 * @example
 * ```tsx
 * function MyCustomChat() {
 *   const agent = useHsafaAgent({
 *     agentId: 'my-agent',
 *     baseUrl: 'http://localhost:3000',
 *     tools: {
 *       customTool: async (input) => {
 *         return { result: 'Custom tool executed!' };
 *       }
 *     }
 *   });
 * 
 *   return (
 *     <div>
 *       {agent.messages.map(msg => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *       <input 
 *         value={agent.input} 
 *         onChange={(e) => agent.setInput(e.target.value)}
 *         onKeyPress={(e) => e.key === 'Enter' && agent.sendMessage()}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { useHsafa } from '../providers/HsafaProvider';
import { createHsafaTransport } from '../components/hsafa-chat/utils/transport';
import { createBuiltInTools } from '../components/hsafa-chat/utils/builtInTools';
import { createBuiltInUI } from '../components/hsafa-chat/utils/builtInUI';
import { renderOrUpdateUserForm as renderOrUpdateUserFormUtil } from '../components/hsafa-chat/utils/renderUserForm';
import { useStreamingToolInput } from '../components/hsafa-chat/hooks/useStreamingToolInput';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

export interface UseHsafaAgentConfig {
  /** The agent name (references .hsafa/agents/{agentName}.json) */
  agentName: string;
  /** The agent configuration string (JSON format) */
  agentConfig: string;
  /** Base URL of your backend server */
  baseUrl?: string;
  /** Custom tools that the agent can use */
  tools?: Record<string, any>;
  /** Custom UI components for rendering tool results */
  uiComponents?: Record<string, React.ComponentType<any>>;
  /** Callback when a message starts */
  onStart?: (message: any) => void;
  /** Callback when a message finishes */
  onFinish?: (message: any) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Initial messages to load */
  initialMessages?: any[];
  /** Callback when messages change */
  onMessagesChange?: (messages: any[], chatId?: string) => void;
  /** Optional controlled chat id */
  controlledChatId?: string;
  /** Optional callback when chat id changes */
  onChatIdChange?: (chatId: string) => void;
  /** Optional templating parameters merged into request body for server-side templating */
  templateParams?: Record<string, any>;
}

export interface HsafaAgentAPI {
  // Core state
  /** Current input text */
  input: string;
  /** Set the input text */
  setInput: (value: string) => void;
  /** All chat messages */
  messages: any[];
  /** Whether the agent is currently processing */
  isLoading: boolean;
  /** Current chat status */
  status: 'idle' | 'submitted' | 'streaming' | 'error' | 'ready';
  /** Any error that occurred */
  error: Error | undefined;
  
  // Actions
  /** Send the current input as a message */
  sendMessage: (options?: { text?: string; files?: any[] }) => Promise<void>;
  /** Stop the current generation */
  stop: () => void;
  /** Clear all messages and start a new chat */
  newChat: () => void;
  /** Set messages directly (for loading history) */
  setMessages: (messages: any[]) => void;
  /** Notify that messages have changed (for edit operations) */
  notifyMessagesChange: () => void;
  
  // Advanced
  /** Direct access to the underlying chat API */
  chatApi: any;
  /** Current chat ID */
  chatId: string;
  /** Set the chat ID (for switching chats) */
  setChatId: (chatId: string) => void;
  /** All available tools (built-in + custom + dynamic page) */
  tools: Record<string, any>;
  /** All available UI components */
  uiComponents: Record<string, any>;
  
  // Form handling
  /** Ref to form host elements (for requestInput tool) */
  formHostRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
  /** Ref to form state (for requestInput tool) */
  formStateRef: React.MutableRefObject<Map<string, { submitted?: boolean; skipped?: boolean; values?: Record<string, any> }>>;
  /** Cleanup all active forms */
  cleanupForms: () => void;
  
  // UI tool handling
  /** Callback when a UI component renders successfully */
  onUISuccess: (toolCallId: string, toolName: string) => void;
  /** Callback when a UI component encounters an error */
  onUIError: (toolCallId: string, toolName: string, error: Error) => void;
}

export function useHsafaAgent(config: UseHsafaAgentConfig): HsafaAgentAPI {
  const {
    agentName,
    agentConfig,
    baseUrl: configBaseUrl = '',
    tools: customTools = {},
    uiComponents: customUIComponents = {},
    onStart,
    onFinish,
    onError,
    initialMessages = [],
    onMessagesChange,
    controlledChatId,
    onChatIdChange,
    templateParams,
  } = config;

  const { baseUrl: providerBaseUrl, setCurrentChatId } = useHsafa();
  const effectiveBaseUrl = (configBaseUrl && configBaseUrl.length > 0) ? configBaseUrl : (providerBaseUrl || '');

  const [input, setInput] = useState<string>('');
  
  // Generate chat ID for the session (internal, can be controlled via props)
  const [internalChatId, setInternalChatId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const chatId = controlledChatId ?? internalChatId;
  const setChatId = useCallback((newChatId: string) => {
    if (controlledChatId === undefined) {
      setInternalChatId(newChatId);
    }
    if (onChatIdChange) onChatIdChange(newChatId);
  }, [controlledChatId, onChatIdChange]);
  
  useEffect(() => {
    try { setCurrentChatId(chatId); } catch {}
    return () => { try { setCurrentChatId(undefined as any); } catch {} };
  }, [chatId, setCurrentChatId]);

  // Configure transport to fetch from the correct endpoint
  const transport = useMemo(() => createHsafaTransport(effectiveBaseUrl, agentName, agentConfig, chatId, templateParams), [effectiveBaseUrl, agentName, agentConfig, chatId, templateParams]);
  
  // Memoize callbacks to prevent infinite loops
  const onFinishCallback = useCallback((payload: any) => {
    console.log('Message finished:', payload);
    let assistantMessageId: string | undefined = payload?.message?.id;
    if (!assistantMessageId && Array.isArray(payload?.messages)) {
      for (let i = payload.messages.length - 1; i >= 0; i--) {
        const m = payload.messages[i];
        if (m && m.role === 'assistant' && m.id) { assistantMessageId = m.id; break; }
      }
    }
    onFinish?.({
      ...payload,
      chatId,
      assistantMessageId,
    });
  }, [onFinish, chatId]);

  const onErrorCallback = useCallback((error: Error) => {
    console.error('Chat error:', error);
    onError?.(error);
  }, [onError]);

  // Built-in Web Controller Tools
  const builtInTools: Record<string, any> = useMemo(() => createBuiltInTools(), []);

  // Merge built-in tools and user-provided tools
  const allTools: Record<string, any> = useMemo(() => ({
    ...builtInTools,
    ...customTools,
  }), [builtInTools, customTools]);

  // Built-in UI Components
  const builtInUI: Record<string, any> = useMemo(() => createBuiltInUI(), []);

  // Merge built-in UI with user-provided UI components
  const allUI: Record<string, any> = useMemo(() => ({
    ...builtInUI,
    ...customUIComponents,
  }), [builtInUI, customUIComponents]);

  const formHostRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const formStateRef = useRef<Map<string, { submitted?: boolean; skipped?: boolean; values?: Record<string, any> }>>(new Map());
  
  const cleanupAllForms = useCallback(() => {
    try {
      formHostRef.current.forEach((el) => { try { el.remove(); } catch {} });
      formHostRef.current.clear();
      formStateRef.current.clear();
    } catch {}
  }, []);
  
  const renderOrUpdateUserForm = useCallback((input: any, toolCallId: string) => {
    renderOrUpdateUserFormUtil(
      input,
      toolCallId,
      formHostRef.current,
      formStateRef.current,
      (payload) => (chatApiRef.current as any).addToolResult(payload),
      undefined
    );
  }, []);

  // Ref to chatApi to use inside callbacks created before chatApi is defined
  const chatApiRef = useRef<any>(null);
  
  // Track UI tool calls that haven't sent results yet
  const pendingUIToolsRef = useRef<Set<string>>(new Set());

  // Handler for UI component errors - reports back to agent
  const handleUIError = useCallback((toolCallId: string, toolName: string, error: Error) => {
    console.error(`UI Error [${toolName}]:`, error);
    if (chatApiRef.current && pendingUIToolsRef.current.has(toolCallId)) {
      pendingUIToolsRef.current.delete(toolCallId);
      (chatApiRef.current as any).addToolResult({
        tool: toolName,
        toolCallId: toolCallId,
        state: 'output-error',
        errorText: error?.message || String(error),
      });
    }
  }, []);
  
  // Handler for UI component success - reports back to agent
  const handleUISuccess = useCallback((toolCallId: string, toolName: string) => {
    if (chatApiRef.current && pendingUIToolsRef.current.has(toolCallId)) {
      pendingUIToolsRef.current.delete(toolCallId);
      (chatApiRef.current as any).addToolResult({
        tool: toolName,
        toolCallId: toolCallId,
        output: {
          status: 'ok',
          rendered: true,
          component: toolName,
          logs: [],
        },
      });
    }
  }, []);

  // Helper to extract actual tool function (supports both function and object with tool property)
  const getToolFunction = useCallback((toolName: string) => {
    const toolConfig = allTools[toolName];
    if (!toolConfig) return null;
    
    // If it's an object with a tool property, extract the function
    if (typeof toolConfig === 'object' && 'tool' in toolConfig) {
      return toolConfig.tool;
    }
    
    // Otherwise, it's the function itself
    return typeof toolConfig === 'function' ? toolConfig : null;
  }, [allTools]);

  // useChat hook from Vercel AI SDK v5
  const chatApi = useChat({
    transport,
    onFinish: onFinishCallback,
    onError: onErrorCallback,
    experimental_throttle: 10,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Removed sendAutomaticallyWhen to prevent infinite loops with Claude models
    // Tool results will still trigger continuation via explicit addToolResult calls
    async onToolCall({ toolCall }) {
      // Handle custom frontend tools
      const toolFn = getToolFunction(toolCall.toolName);

      // Special: requestInput renders a form and waits for user; no immediate tool result
      if (toolCall.toolName === 'requestInput') {
        try {
          renderOrUpdateUserForm(toolCall.input, toolCall.toolCallId);
        } catch (e) {
          console.error('requestInput render error', e);
        }
        return;
      }

      // Special: UI tools — check if this is a UI tool
      const isUiTool = toolCall.toolName === 'ui';
      const inputObj: any = toolCall?.input as any;
      const toolNameIsUIComponent = allUI && toolCall.toolName in allUI;
      
      if (isUiTool || toolNameIsUIComponent) {
        // Track this UI tool call as pending
        pendingUIToolsRef.current.add(toolCall.toolCallId);
        return;
      }

      if (!toolFn) return;

      try {
        const result = await toolFn(toolCall.input);
        (chatApi as any).addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: result,
        });
      } catch (err: any) {
        (chatApi as any).addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: err?.message || String(err),
        });
      }
    },
  });
  
  const { messages: chatMessages, sendMessage, status, stop, error: chatError } = chatApi;
  chatApiRef.current = chatApi;

  const appliedInitialMessagesForChatRef = useRef<Set<string>>(new Set());

  useStreamingToolInput(chatMessages as any[], allTools, renderOrUpdateUserForm);

  // Hydrate request_input form states from persisted messages
  useEffect(() => {
    try {
      const seenIds = new Set<string>();
      const pendingRenders: Array<{ input: any; toolCallId: string }> = [];
      chatMessages.forEach((message: any) => {
        if (message.role !== 'assistant') return;
        (message.parts || []).forEach((part: any) => {
          const toolName = part?.toolName || (typeof part?.type === 'string' && part.type.startsWith('tool-') ? String(part.type.replace(/^tool-/, '')) : undefined);
          if (toolName !== 'requestInput') return;
          const toolCallId = part?.toolCallId || '';
          if (!toolCallId) return;
          seenIds.add(toolCallId);
          const out = part?.output;
          if (out && (out.submitted || out.skipped || out.values)) {
            const hydrated = {
              submitted: !!out.submitted,
              skipped: !!out.skipped,
              values: out.values || undefined,
            };
            formStateRef.current.set(toolCallId, hydrated);
          }
          const inVal = part?.input || part?.args || {};
          pendingRenders.push({ input: inVal, toolCallId });
        });
      });

      formHostRef.current.forEach((_, key) => {
        if (!seenIds.has(key)) {
          const node = formHostRef.current.get(key);
          try { node?.remove(); } catch {}
          formHostRef.current.delete(key);
          formStateRef.current.delete(key);
        }
      });

      if (pendingRenders.length > 0) {
        const raf = requestAnimationFrame(() => {
          pendingRenders.forEach(({ input, toolCallId }) => {
            try { renderOrUpdateUserForm(input, toolCallId); } catch {}
          });
        });
        return () => cancelAnimationFrame(raf);
      }
    } catch {}
  }, [chatMessages, renderOrUpdateUserForm]);

  // Load initial messages if provided
  useEffect(() => {
    if (!initialMessages || initialMessages.length === 0) return;
    if (chatMessages.length !== 0) return;
    if (appliedInitialMessagesForChatRef.current.has(chatId)) return;

    appliedInitialMessagesForChatRef.current.add(chatId);
    try {
      (chatApi as any)?.setMessages?.(initialMessages);
    } catch {}
  }, [initialMessages, chatMessages.length, chatId, chatApi]);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Create a callback that can be called externally to notify about message changes
  const notifyMessagesChange = useCallback(() => {
    if (onMessagesChange) {
      onMessagesChange(chatMessages, chatId);
    }
  }, [onMessagesChange, chatMessages, chatId]);

  // Send message handler
  const handleSendMessage = useCallback(async (options?: { text?: string; files?: any[] }) => {
    const messageText = options?.text !== undefined ? options.text : input;
    const messageFiles = options?.files || [];
    
    const trimmedInput = messageText.trim();
    if (!trimmedInput && messageFiles.length === 0) return;
    if (isLoading) return;

    // Clear input if using default input
    if (options?.text === undefined) {
      setInput('');
    }

    try {
      // Call onStart when user sends a message
      if (onStart) {
        // Create a temporary user message object for the callback
        const userMessage = {
          role: 'user',
          content: trimmedInput,
          createdAt: Date.now(),
          chatId,
        };
        onStart(userMessage);
      }

      await sendMessage({
        text: trimmedInput,
        files: messageFiles,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [input, isLoading, sendMessage, onStart, chatId]);

  // New chat handler
  const handleNewChat = useCallback(() => {
    if (isLoading) return;
    cleanupAllForms();
    setInput('');
    try { (chatApi as any)?.setMessages?.([]); } catch {}
    const newId = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setChatId(newId);
  }, [isLoading, chatApi, cleanupAllForms, setChatId]);

  // Set messages handler
  const handleSetMessages = useCallback((messages: any[]) => {
    try { (chatApi as any)?.setMessages?.(messages); } catch {}
  }, [chatApi]);

  return {
    // Core state
    input,
    setInput,
    messages: chatMessages,
    isLoading,
    status,
    error: chatError,
    
    // Actions
    sendMessage: handleSendMessage,
    stop,
    newChat: handleNewChat,
    setMessages: handleSetMessages,
    notifyMessagesChange,
    
    // Advanced
    chatApi,
    chatId,
    setChatId,
    tools: allTools,
    uiComponents: allUI,
    
    // Form handling
    formHostRef,
    formStateRef,
    cleanupForms: cleanupAllForms,
    
    // UI tool handling
    onUISuccess: handleUISuccess,
    onUIError: handleUIError,
  };
}
