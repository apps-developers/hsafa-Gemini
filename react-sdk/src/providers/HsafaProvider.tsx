import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Handler function for custom actions that can be triggered by the AI agent
 */
export type HsafaActionHandler = (params: any, meta: {
  /** Name of the action being called */
  name: string;
  /** When the action is being triggered */
  trigger: 'partial' | 'final' | 'params_complete';
  /** Index of the action in the sequence */
  index: number;
  /** ID of the assistant message that triggered this action */
  assistantMessageId?: string;
  /** ID of the current chat session */
  chatId?: string;
}) => Promise<any> | any;

/**
 * Configuration options for the Hsafa SDK
 */
export interface HsafaConfig {
  /** Base URL for agent API calls, e.g. "" (same origin) or "https://example.com" */
  baseUrl?: string;
  /** Default text direction for SDK components */
  dir?: 'ltr' | 'rtl';
  /** Default theme for SDK components */
  theme?: 'dark' | 'light';
}

/**
 * Context value provided by HsafaProvider
 */
export interface HsafaContextValue extends HsafaConfig {
  /** Registered custom actions */
  actions: Map<string, HsafaActionHandler>;
  /** Registered custom components */
  components: Map<string, React.ComponentType<any>>;
  /** Register a custom action handler */
  registerAction: (name: string, handler: HsafaActionHandler) => () => void;
  /** Unregister a custom action handler */
  unregisterAction: (name: string, handler?: HsafaActionHandler) => void;
  /** Register a custom component */
  registerComponent: (name: string, component: React.ComponentType<any>) => () => void;
  /** Unregister a custom component */
  unregisterComponent: (name: string, component?: React.ComponentType<any>) => void;
  /** Global streaming state - true if any chat is streaming */
  isAnyStreaming: boolean;
  /** Set streaming state for a specific chat instance */
  setStreamingState: (chatId: string, isStreaming: boolean) => void;
  /** Global chat open state - true if any chat is open */
  isAnyChatOpen: boolean;
  /** Set chat open state for a specific chat instance */
  setChatOpenState: (chatId: string, isOpen: boolean) => void;
  /** Currently active chat id (set by HsafaChat) */
  currentChatId?: string;
  /** Setter for current chat id */
  setCurrentChatId: (chatId: string) => void;
}

const HsafaContext = createContext<HsafaContextValue | undefined>(undefined);

/**
 * Props for the HsafaProvider component
 */
export interface HsafaProviderProps extends HsafaConfig {
  /** Child components that will have access to the Hsafa context */
  children: React.ReactNode;
}

/**
 * Provider component that sets up the Hsafa context for the SDK.
 * Wrap your app or chat components with this provider to enable Hsafa functionality.
 * 
 * @example
 * ```tsx
 * <HsafaProvider baseUrl="https://api.example.com">
 *   <HsafaChat agentId="my-agent" />
 * </HsafaProvider>
 * ```
 */
export function HsafaProvider({ baseUrl, dir = 'ltr', theme = 'dark', children }: HsafaProviderProps) {
  const [actions, setActions] = useState<Map<string, HsafaActionHandler>>(new Map());
  const [components, setComponents] = useState<Map<string, React.ComponentType<any>>>(new Map());
  const [streamingStates, setStreamingStates] = useState<Map<string, boolean>>(new Map());
  const [chatOpenStates, setChatOpenStates] = useState<Map<string, boolean>>(new Map());
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);

  const registerAction = useCallback((name: string, handler: HsafaActionHandler) => {
    setActions(prev => {
      const next = new Map(prev);
      next.set(String(name), handler);
      return next;
    });
    return () => {
      setActions(prev => {
        const next = new Map(prev);
        const existing = next.get(String(name));
        if (!handler || existing === handler) next.delete(String(name));
        return next;
      });
    };
  }, []);

  const unregisterAction = useCallback((name: string, handler?: HsafaActionHandler) => {
    setActions(prev => {
      const next = new Map(prev);
      const existing = next.get(String(name));
      if (!handler || existing === handler) next.delete(String(name));
      return next;
    });
  }, []);

  const registerComponent = useCallback((name: string, component: React.ComponentType<any>) => {
    setComponents(prev => {
      const next = new Map(prev);
      next.set(String(name), component);
      return next;
    });
    return () => {
      setComponents(prev => {
        const next = new Map(prev);
        const existing = next.get(String(name));
        if (!component || existing === component) next.delete(String(name));
        return next;
      });
    };
  }, []);

  const unregisterComponent = useCallback((name: string, component?: React.ComponentType<any>) => {
    setComponents(prev => {
      const next = new Map(prev);
      const existing = next.get(String(name));
      if (!component || existing === component) next.delete(String(name));
      return next;
    });
  }, []);

  const setStreamingState = useCallback((chatId: string, isStreaming: boolean) => {
    setStreamingStates(prev => {
      const next = new Map(prev);
      if (isStreaming) {
        next.set(chatId, true);
      } else {
        next.delete(chatId);
      }
      return next;
    });
  }, []);

  const setChatOpenState = useCallback((chatId: string, isOpen: boolean) => {
    setChatOpenStates(prev => {
      const next = new Map(prev);
      next.set(chatId, isOpen);
      return next;
    });
  }, []);


  const isAnyStreaming = useMemo(() => {
    return Array.from(streamingStates.values()).some(state => state);
  }, [streamingStates]);

  const isAnyChatOpen = useMemo(() => {
    return Array.from(chatOpenStates.values()).some(state => state);
  }, [chatOpenStates]);

  const value: HsafaContextValue = useMemo(() => ({
    baseUrl,
    dir,
    theme,
    actions,
    components,
    registerAction,
    unregisterAction,
    registerComponent,
    unregisterComponent,
    isAnyStreaming,
    setStreamingState,
    isAnyChatOpen,
    setChatOpenState,
    currentChatId,
    setCurrentChatId,
  }), [baseUrl, dir, theme, actions, components, registerAction, unregisterAction, registerComponent, unregisterComponent, isAnyStreaming, setStreamingState, isAnyChatOpen, setChatOpenState, currentChatId]);

  return (
    <HsafaContext.Provider value={value}>
      {children}
    </HsafaContext.Provider>
  );
}

/**
 * Hook to access the Hsafa context.
 * Must be used within a HsafaProvider.
 *
 * @returns The Hsafa context value with actions, components, and configuration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { registerAction, baseUrl } = useHsafa();
 *   return <div>My Component</div>;
 * }
 * ```
 */
export function useHsafa(): HsafaContextValue {
  const ctx = useContext(HsafaContext);
  if (!ctx) return {
    baseUrl: undefined,
    actions: new Map(),
    components: new Map(),
    registerAction: () => () => undefined,
    unregisterAction: () => undefined,
    registerComponent: () => () => undefined,
    unregisterComponent: () => undefined,
    isAnyStreaming: false,
    setStreamingState: () => undefined,
    isAnyChatOpen: false,
    setChatOpenState: () => undefined,
    currentChatId: undefined,
    setCurrentChatId: () => undefined,
  };
  return ctx;
}
