/**
 * useChatStorage - Hook for managing chat history persistence
 * 
 * This hook provides utilities for saving and loading chat conversations
 * to/from localStorage. It handles chat metadata, message persistence,
 * and chat history management.
 * 
 * @example
 * ```tsx
 * function MyChat() {
 *   const agent = useHsafaAgent({ agentId: 'my-agent' });
 *   const storage = useChatStorage({
 *     agentId: 'my-agent',
 *     chatId: agent.chatId,
 *     messages: agent.messages,
 *     isLoading: agent.isLoading,
 *   });
 * 
 *   return (
 *     <div>
 *       <button onClick={() => {
 *         const chat = storage.loadChat(chatId);
 *         if (chat) agent.setMessages(chat.messages);
 *       }}>
 *         Load Chat
 *       </button>
 *       <select onChange={(e) => storage.switchToChat(e.target.value, agent.setMessages)}>
 *         {storage.chatList.map(chat => (
 *           <option key={chat.id} value={chat.id}>{chat.title}</option>
 *         ))}
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createChatStorage } from '../utils/chat-storage';

export interface UseChatStorageConfig {
  /** The agent ID (used as storage namespace) */
  agentId: string;
  /** Current chat ID */
  chatId: string;
  /** Current messages to auto-save */
  messages: any[];
  /** Whether chat is currently loading (skip saving during load) */
  isLoading?: boolean;
  /** Whether to auto-save messages (default: true) */
  autoSave?: boolean;
  /** Whether to auto-restore last chat on mount (default: true) */
  autoRestore?: boolean;
}

export interface ChatMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface SavedChat {
  id: string;
  messages: any[];
  agentId: string;
}

export interface ChatStorageAPI {
  /** List of all saved chats */
  chatList: ChatMetadata[];
  /** Current chat metadata */
  currentChatMeta: ChatMetadata | null;
  /** Refresh the chat list */
  refreshChatList: () => void;
  /** Load a specific chat */
  loadChat: (chatId: string) => SavedChat | null;
  /** Save the current chat */
  saveCurrentChat: () => void;
  /** Delete a chat */
  deleteChat: (chatId: string) => void;
  /** Switch to a different chat */
  switchToChat: (chatId: string, setMessages: (messages: any[]) => void) => void;
  /** Create a new chat */
  createNewChat: (onNewChat: () => void) => void;
  /** Search chats by title */
  searchChats: (query: string) => ChatMetadata[];
  /** The underlying storage utility */
  storage: ReturnType<typeof createChatStorage>;
}

export function useChatStorage(config: UseChatStorageConfig): ChatStorageAPI {
  const {
    agentId,
    chatId,
    messages,
    isLoading = false,
    autoSave = true,
    autoRestore = true,
  } = config;

  const storage = useMemo(() => createChatStorage(agentId), [agentId]);
  
  const [chatList, setChatList] = useState<ChatMetadata[]>([]);
  const [currentChatMeta, setCurrentChatMeta] = useState<ChatMetadata | null>(null);
  
  const createdChatRef = useRef<boolean>(false);
  const restoredOnMountRef = useRef<boolean>(false);

  // Refresh chat list from storage
  const refreshChatList = useCallback(() => {
    try {
      const chats = storage.loadChatsIndex();
      setChatList(chats);
      const current = chats.find(c => c.id === chatId);
      setCurrentChatMeta(current || null);
    } catch (error) {
      console.error('Failed to refresh chat list:', error);
    }
  }, [storage, chatId]);

  // Load chat list on mount and when chatId changes
  useEffect(() => {
    refreshChatList();
  }, [refreshChatList]);

  // Auto-restore last chat on mount
  useEffect(() => {
    if (!autoRestore || restoredOnMountRef.current) return;
    
    try {
      const savedId = storage.getCurrentChatId();
      if (savedId) {
        createdChatRef.current = true;
      }
    } catch (error) {
      console.error('Failed to restore chat:', error);
    }
    
    restoredOnMountRef.current = true;
  }, [storage, autoRestore]);

  // Auto-save messages when they change
  useEffect(() => {
    if (!autoSave || messages.length === 0) return;

    // Create chat metadata on first user message
    if (!createdChatRef.current) {
      const firstUser = messages.find((m: any) => m.role === 'user');
      if (firstUser) {
        let titleSource = '';
        if (Array.isArray((firstUser as any).parts)) {
          const textPart = (firstUser as any).parts.find((p: any) => p && p.type === 'text');
          titleSource = textPart && typeof textPart.text === 'string' ? textPart.text : '';
        }
        const title = (titleSource || 'New chat').slice(0, 80);
        const now = Date.now();
        
        try {
          storage.upsertChatMeta({ id: chatId, title, createdAt: now, updatedAt: now });
          storage.saveChat({ id: chatId, messages: messages as any, agentId } as any);
          storage.setCurrentChatId(chatId);
          createdChatRef.current = true;
          refreshChatList();
        } catch (error) {
          console.error('Failed to create chat:', error);
        }
      }
    } else if (!isLoading) {
      // Update existing chat
      const now = Date.now();
      try {
        storage.saveChat({ id: chatId, messages: messages as any, agentId } as any);
        const metas = storage.loadChatsIndex();
        const found = metas.find((m) => m.id === chatId);
        if (found) {
          storage.upsertChatMeta({ ...found, updatedAt: now });
          refreshChatList();
        }
      } catch (error) {
        console.error('Failed to save chat:', error);
      }
    }
  }, []);

  // Save chat on stream completion
  const wasLoadingRef = useRef<boolean>(false);
  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      return;
    }
    if (wasLoadingRef.current && autoSave) {
      wasLoadingRef.current = false;
      try {
        const now = Date.now();
        // Always persist the latest messages for this chat
        storage.saveChat({ id: chatId, messages: messages as any, agentId } as any);

        // Upsert metadata; if it doesn't exist yet, create it now
        const metas = storage.loadChatsIndex();
        const found = metas.find((m) => m.id === chatId);
        if (found) {
          storage.upsertChatMeta({ ...found, updatedAt: now });
        } else {
          // Create metadata on the first successful turn (after user sends a message)
          let titleSource = '';
          const firstUser = Array.isArray(messages)
            ? (messages as any[]).find((m: any) => m && m.role === 'user')
            : undefined;
          if (firstUser && Array.isArray((firstUser as any).parts)) {
            const textPart = (firstUser as any).parts.find((p: any) => p && p.type === 'text');
            titleSource = textPart && typeof textPart.text === 'string' ? textPart.text : '';
          }
          const title = (titleSource || 'New chat').slice(0, 80);
          storage.upsertChatMeta({ id: chatId, title, createdAt: now, updatedAt: now });
          try { storage.setCurrentChatId(chatId); } catch {}
          createdChatRef.current = true;
        }

        refreshChatList();
      } catch (error) {
        console.error('Failed to save chat on completion:', error);
      }
    }
  }, [isLoading, messages, chatId, agentId, storage, autoSave, refreshChatList]);

  // Load a specific chat
  const loadChat = useCallback((chatId: string): SavedChat | null => {
    try {
      const chat = storage.loadChat(chatId);
      if (!chat) return null;
      
      // Ensure agentId is present
      return {
        id: chat.id,
        messages: chat.messages,
        agentId: chat.agentId || agentId, // Use current agentId if not present
      };
    } catch (error) {
      console.error('Failed to load chat:', error);
      return null;
    }
  }, [storage, agentId]);

  // Save current chat manually
  const saveCurrentChat = useCallback(() => {
    if (messages.length === 0) return;
    
    try {
      const now = Date.now();
      storage.saveChat({ id: chatId, messages: messages as any, agentId } as any);
      const metas = storage.loadChatsIndex();
      const found = metas.find((m) => m.id === chatId);
      if (found) {
        storage.upsertChatMeta({ ...found, updatedAt: now });
        refreshChatList();
      }
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  }, [storage, chatId, messages, agentId, refreshChatList]);

  // Delete a chat
  const deleteChat = useCallback((chatId: string) => {
    try {
      storage.deleteChat(chatId);
      refreshChatList();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }, [storage, refreshChatList]);

  // Switch to a different chat
  const switchToChat = useCallback((newChatId: string, setMessages: (messages: any[]) => void) => {
    if (newChatId === chatId) return;
    
    try {
      createdChatRef.current = true;
      storage.setCurrentChatId(newChatId);
      const saved = storage.loadChat(newChatId);
      const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
      setMessages(msgs);
      refreshChatList();
    } catch (error) {
      console.error('Failed to switch chat:', error);
    }
  }, [storage, chatId, refreshChatList]);

  // Create a new chat
  const createNewChat = useCallback((onNewChat: () => void) => {
    createdChatRef.current = false;
    onNewChat();
  }, []);

  // Search chats
  const searchChats = useCallback((query: string): ChatMetadata[] => {
    if (!query.trim()) return chatList;
    
    const lowerQuery = query.toLowerCase();
    return chatList.filter(chat => 
      chat.title.toLowerCase().includes(lowerQuery)
    );
  }, [chatList]);

  return {
    chatList,
    currentChatMeta,
    refreshChatList,
    loadChat,
    saveCurrentChat,
    deleteChat,
    switchToChat,
    createNewChat,
    searchChats,
    storage,
  };
}