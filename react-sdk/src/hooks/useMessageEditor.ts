/**
 * useMessageEditor - Hook for editing and regenerating messages
 * 
 * This hook provides functionality to edit user messages and regenerate
 * responses from a specific point in the conversation.
 * 
 * @example
 * ```tsx
 * function MyChat() {
 *   const agent = useHsafaAgent({ agentId: 'my-agent' });
 *   const editor = useMessageEditor({
 *     messages: agent.messages,
 *     isLoading: agent.isLoading,
 *     sendMessage: agent.sendMessage,
 *     setMessages: agent.setMessages,
 *   });
 * 
 *   return (
 *     <div>
 *       {agent.messages.map(msg => (
 *         <div key={msg.id}>
 *           {editor.isEditing(msg.id) ? (
 *             <div>
 *               <textarea 
 *                 value={editor.editingText} 
 *                 onChange={(e) => editor.setEditingText(e.target.value)}
 *               />
 *               <button onClick={() => editor.saveEdit(msg.id)}>Save</button>
 *               <button onClick={editor.cancelEdit}>Cancel</button>
 *             </div>
 *           ) : (
 *             <div>
 *               {msg.content}
 *               <button onClick={() => editor.startEdit(msg.id, msg.content)}>
 *                 Edit
 *               </button>
 *             </div>
 *           )}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { useHsafa } from '../providers/HsafaProvider';

export interface UseMessageEditorConfig {
  /** Current messages array */
  messages: any[];
  /** Whether chat is currently loading */
  isLoading: boolean;
  /** Function to send a message */
  sendMessage: (options: { text: string; files?: any[] }) => Promise<void>;
  /** Function to update messages array */
  setMessages: (messages: any[]) => void;
  /** Base URL for file uploads (if editing messages with attachments) */
  baseUrl?: string;
}

export interface MessageEditorAPI {
  /** ID of the message currently being edited */
  editingMessageId: string | null;
  /** Current edit text */
  editingText: string;
  /** Set the edit text */
  setEditingText: (text: string) => void;
  /** Attachments for the edited message */
  editAttachments: any[];
  /** Set edit attachments */
  setEditAttachments: (attachments: any[]) => void;
  /** Whether files are currently uploading */
  editUploading: boolean;
  /** Start editing a message */
  startEdit: (messageId: string, text: string, attachments?: any[]) => void;
  /** Cancel editing */
  cancelEdit: () => void;
  /** Save the edit and regenerate from that point */
  saveEdit: (messageId: string) => Promise<void>;
  /** Check if a message is being edited */
  isEditing: (messageId: string) => boolean;
  /** Add attachments to the edit */
  addEditAttachments: (files: FileList) => Promise<void>;
  /** Remove an attachment from the edit */
  removeEditAttachment: (id: string) => void;
}

export function useMessageEditor(config: UseMessageEditorConfig): MessageEditorAPI {
  const {
    messages,
    isLoading,
    sendMessage,
    setMessages,
    baseUrl,
  } = config;

  const { baseUrl: providerBaseUrl } = useHsafa();
  const effectiveBaseUrl = baseUrl || providerBaseUrl || '';

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editAttachments, setEditAttachments] = useState<any[]>([]);
  const [editUploading, setEditUploading] = useState(false);

  // Start editing a message
  const startEdit = useCallback((messageId: string, text: string, attachments: any[] = []) => {
    setEditingMessageId(messageId);
    setEditingText(text);
    setEditAttachments(attachments);
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingText('');
    setEditAttachments([]);
  }, []);

  // Save edit and regenerate
  const saveEdit = useCallback(async (messageId: string) => {
    if (isLoading) return;
    
    try {
      // Find the message index
      const messageIndex = messages.findIndex((m: any) => m.id === messageId);
      if (messageIndex === -1) return;

      // Create updated messages array (keep messages up to the edited one)
      const updatedMessages = messages.slice(0, messageIndex);
      
      // Clear the current messages and set to the point before the edited message
      setMessages(updatedMessages);
      
      // Send the edited message
      await sendMessage({
        text: editingText.trim(),
        files: editAttachments.map(att => ({
          type: 'file' as const,
          url: att.url,
          mediaType: att.mimeType || 'application/octet-stream',
          ...(att.name ? { name: att.name } : {}),
          ...(att.size ? { size: att.size } : {}),
        })),
      });

      // Reset edit state
      cancelEdit();
    } catch (error) {
      console.error('Failed to save edit:', error);
      throw error;
    }
  }, [isLoading, messages, sendMessage, editingText, editAttachments, setMessages, cancelEdit]);

  // Check if a message is being edited
  const isEditing = useCallback((messageId: string) => {
    return editingMessageId === messageId;
  }, [editingMessageId]);

  // Add attachments to edit
  const addEditAttachments = useCallback(async (files: FileList) => {
    if (!effectiveBaseUrl) {
      console.warn('baseUrl not provided, cannot upload attachments');
      return;
    }

    setEditUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} is too large (max 25MB)`);
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${effectiveBaseUrl}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
          id: data.url || `${Date.now()}-${Math.random()}`,
          name: file.name,
          url: data.url,
          mimeType: file.type,
          size: file.size,
        };
      });
      
      const newAttachments = await Promise.all(uploadPromises);
      setEditAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Failed to upload files:', error);
      throw error;
    } finally {
      setEditUploading(false);
    }
  }, [effectiveBaseUrl]);

  // Remove attachment from edit
  const removeEditAttachment = useCallback((id: string) => {
    setEditAttachments(prev => prev.filter(att => att.id !== id));
  }, []);

  return {
    editingMessageId,
    editingText,
    setEditingText,
    editAttachments,
    setEditAttachments,
    editUploading,
    startEdit,
    cancelEdit,
    saveEdit,
    isEditing,
    addEditAttachments,
    removeEditAttachment,
  };
}
