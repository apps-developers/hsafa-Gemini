/**
 * Hsafa SDK - Headless Hooks
 * 
 * Import these hooks to build your own custom chat UI
 * while leveraging all Hsafa agent capabilities.
 */

export { useChatStorage } from './useChatStorage';
export type { 
  UseChatStorageConfig, 
  ChatStorageAPI, 
  ChatMetadata, 
  SavedChat 
} from './useChatStorage';

export { useMessageEditor } from './useMessageEditor';
export type { 
  UseMessageEditorConfig, 
  MessageEditorAPI 
} from './useMessageEditor';

export * from "./useAutoScroll";
export * from "./useFileUploadHook";
export * from "./useHsafaGateway";
export { useAutoScroll } from './useAutoScroll';
