/**
 * Local storage utilities for chat history management
 */

export type ChatMeta = { 
  id: string; 
  title: string; 
  createdAt: number; 
  updatedAt: number; 
};

export type ChatData = { 
  id: string; 
  messages: any[]; 
  agentId?: string; 
};

export class ChatStorage {
  private agentId: string;
  private LS_PREFIX: string;
  private chatsIndexKey: string;
  private currentChatKey: string;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.LS_PREFIX = `hsafaChat_${agentId}`;
    this.chatsIndexKey = `${this.LS_PREFIX}.chats`;
    this.currentChatKey = `${this.LS_PREFIX}.currentChatId`;
  }

  private chatKey(id: string): string {
    return `${this.LS_PREFIX}.chat.${id}`;
  }

  loadChatsIndex(): ChatMeta[] {
    try {
      const raw = localStorage.getItem(this.chatsIndexKey);
      return raw ? JSON.parse(raw) : [];
    } catch { 
      return []; 
    }
  }

  saveChatsIndex(list: ChatMeta[]): void {
    try { 
      localStorage.setItem(this.chatsIndexKey, JSON.stringify(list)); 
    } catch {}
  }

  loadChat(id: string): ChatData | null {
    try { 
      const raw = localStorage.getItem(this.chatKey(id)); 
      return raw ? JSON.parse(raw) : null; 
    } catch { 
      return null; 
    }
  }

  saveChat(data: ChatData): void {
    try { 
      localStorage.setItem(this.chatKey(data.id), JSON.stringify(data)); 
    } catch {}
  }

  upsertChatMeta(meta: ChatMeta): void {
    const list = this.loadChatsIndex();
    const idx = list.findIndex(x => x.id === meta.id);
    if (idx >= 0) list[idx] = meta; 
    else list.unshift(meta);
    this.saveChatsIndex(list);
  }

  deleteChatMeta(id: string): void {
    const list = this.loadChatsIndex();
    const next = list.filter(x => x.id !== id);
    this.saveChatsIndex(next);
  }

  deleteChatData(id: string): void {
    try { 
      localStorage.removeItem(this.chatKey(id)); 
    } catch {}
  }

  deleteChat(id: string): void {
    this.deleteChatData(id);
    this.deleteChatMeta(id);
  }

  getCurrentChatId(): string | null {
    try {
      return localStorage.getItem(this.currentChatKey);
    } catch {
      return null;
    }
  }

  setCurrentChatId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(this.currentChatKey, id);
      } else {
        localStorage.removeItem(this.currentChatKey);
      }
    } catch {}
  }
}
