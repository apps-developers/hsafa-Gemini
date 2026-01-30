import { ChatMessage } from '../types/chat';

export interface ChatMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatData {
  id: string;
  messages: ChatMessage[];
  agentId?: string;
}

export function createChatStorage(agentId: string) {
  const LS_PREFIX = `hsafaChat_${agentId}`;
  const chatsIndexKey = `${LS_PREFIX}.chats`;
  const chatKey = (id: string) => `${LS_PREFIX}.chat.${id}`;
  const currentChatKey = `${LS_PREFIX}.currentChatId`;
  const showChatKey = `${LS_PREFIX}.showChat`;

  const loadChatsIndex = (): ChatMeta[] => {
    // Check if we're on the server side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(chatsIndexKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const saveChatsIndex = (list: ChatMeta[]) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(chatsIndexKey, JSON.stringify(list)); } catch {}
  };

  const loadChat = (id: string): ChatData | null => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    try { 
      const raw = localStorage.getItem(chatKey(id)); 
      return raw ? JSON.parse(raw) : null; 
    } catch { return null; }
  };

  const saveChat = (data: ChatData) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(chatKey(data.id), JSON.stringify(data)); } catch {}
  };

  const upsertChatMeta = (meta: ChatMeta) => {
    const list = loadChatsIndex();
    const idx = list.findIndex(x => x.id === meta.id);
    if (idx >= 0) list[idx] = meta; else list.unshift(meta);
    saveChatsIndex(list);
  };

  const deleteChatMeta = (id: string) => {
    const list = loadChatsIndex();
    const next = list.filter(x => x.id !== id);
    saveChatsIndex(next);
  };

  const deleteChatData = (id: string) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(chatKey(id)); } catch {}
  };

  const deleteChat = (id: string) => {
    deleteChatData(id);
    deleteChatMeta(id);
  };

  const getShowChat = (): boolean => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true;
    try {
      const savedShow = localStorage.getItem(showChatKey);
      return savedShow === null ? true : savedShow === 'true';
    } catch { return true; }
  };

  const setShowChat = (value: boolean) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(showChatKey, String(value)); } catch {}
  };

  const getCurrentChatId = (): string | null => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    return localStorage.getItem(currentChatKey);
  };

  const setCurrentChatId = (chatId: string) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(currentChatKey, chatId); } catch {}
  };

  const clearCurrentChatId = () => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(currentChatKey); } catch {}
  };

  return {
    loadChatsIndex,
    saveChatsIndex,
    loadChat,
    saveChat,
    upsertChatMeta,
    deleteChatMeta,
    deleteChatData,
    deleteChat,
    getShowChat,
    setShowChat,
    getCurrentChatId,
    setCurrentChatId,
    clearCurrentChatId
  };
}

export function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
