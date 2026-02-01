// Export all components
export * from "./components/Button";
export * from "./components/FloatingChatButton";
export { XMarkdownRenderer } from "./components/XMarkdownRenderer";
export type { XMarkdownRendererProps } from "./components/XMarkdownRenderer";

// Export hooks (whitelisted only)
export * from "./hooks/useAutoScroll";
export * from "./hooks/useFileUploadHook";

// NEW: Gateway hook - simple integration with Hsafa Gateway
export { useHsafaGateway } from "./hooks/useHsafaGateway";
export type { 
  UseHsafaGatewayConfig, 
  HsafaGatewayAPI,
  GatewayMessage,
  ToolCall,
  ToolResult,
} from "./hooks/useHsafaGateway";

export { useHsafaAction } from "./hooks/useHsafaAction";
export { useHsafaComponent } from "./hooks/useHsafaComponent";

export { useChatStorage } from "./hooks/useChatStorage";
export type { 
  UseChatStorageConfig, 
  ChatStorageAPI, 
  ChatMetadata, 
  SavedChat 
} from "./hooks/useChatStorage";

export { useMessageEditor } from "./hooks/useMessageEditor";
export type { 
  UseMessageEditorConfig, 
  MessageEditorAPI 
} from "./hooks/useMessageEditor";

// Export types
export type { ButtonProps } from "./components/Button";

// Providers
export { HsafaProvider, useHsafa } from "./providers/HsafaProvider";

// Chat UI
export { HsafaChat } from "./components/HsafaChat";
export { ContentContainer } from "./components/ContentContainer";
export type { ContentContainerProps } from "./components/ContentContainer";
export type { 
  HsafaChatProps,
  CustomToolUIRenderProps,
  Attachment,
  HsafaTool,
  ChatMessage,
  EditProcessContent
} from "./types/chat";

// Component Registry
export { componentRegistry } from "./utils/component-registry";
export type { UIComponentProps } from "./utils/component-registry";

// Web Controller Tools (for AI agent interaction)
export {
  getDomComponents,
  guideCursor,
  controlCursor,
  FillActiveInput,
  CursorController
} from "./components/web-controler";
export type {
  DomComponent,
  GetDomComponentsOptions,
  GetDomComponentsResult,
  GuideCursorOptions,
  FillInputOptions,
  FillResult,
  GuideAction,
  GuideTarget,
  Anchor,
  GuideOptions,
  GuideStep,
  GuideStepResult,
  GuideRunResult
} from "./components/web-controler";

