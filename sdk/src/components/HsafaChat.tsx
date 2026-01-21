import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChatHeader } from "./hsafa-chat/ChatHeader";
import { useFileUpload } from "../hooks/useFileUploadHook";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useHsafaAgent } from "../hooks/useHsafaAgent";
import { useChatStorage } from "../hooks/useChatStorage";
import { HsafaChatProps } from "../types/chat";
import { MessageList } from "./hsafa-chat";
import { ChatInput } from "./hsafa-chat";
import { PresetPrompts } from "./hsafa-chat";
import { createChatStorage, ChatMeta } from "../utils/chat-storage";
import { ChatHistoryModal } from "./hsafa-chat/ChatHistoryModal";
import { ChatHistorySidebar } from "./hsafa-chat/ChatHistorySidebar";
import { ConfirmEditModal } from "./hsafa-chat/ConfirmEditModal";
import { useHsafa } from "../providers/HsafaProvider";
import { FloatingChatButton } from "./FloatingChatButton";
import CursorController from "./web-controler/CursorController";

export function HsafaChat({
  agentName,
  agentConfig,
  theme,
  primaryColor,
  primaryColorDark,
  primaryColorLight,
  backgroundColor,
  borderColor,
  textColor,
  accentColor,
  errorColor,
  errorColorLight,
  errorColorDark,
  successColor,
  successColorLight,
  warningColor,
  warningColorLight,
  infoColor,
  infoColorLight,
  dangerColor,
  dangerColorLight,
  dangerColorDark,
  dir,
  lang,
  language,
  baseUrl = '',
  initialMessages = [],
  onMessagesChange,
  defaultOpen = true,
  floatingButtonPosition = { bottom: 24, right: 24 },
  
  HsafaTools = {},
  HsafaUI = {},
  componentAboveInput,
  editProcessContent,
  presetPrompts,
  onStart,
  onFinish,
  currentChat,
  onChatChanged,
  templateParams,
  fullPageChat = false,
  title,
  placeholder,
  emptyStateMessage,
  customStyles,
}: HsafaChatProps & { 
  baseUrl?: string;
  initialMessages?: any[];
  onMessagesChange?: (messages: any[], chatId?: string) => void;
  HsafaUI?: Record<string, React.ComponentType<any>>;
}) {
  const { dir: providerDir, theme: providerTheme, baseUrl: providerBaseUrl, setStreamingState, setChatOpenState } = useHsafa();
  const effectiveDir = (dir || providerDir || 'ltr') as 'rtl' | 'ltr';
  const isRTL = effectiveDir === 'rtl';
  const effectiveLang = (lang || language || 'en') as 'en' | 'ar';
  const isArabic = effectiveLang === 'ar';
  const effectiveTheme = (theme || providerTheme || 'dark');
  const effectiveBaseUrl = (baseUrl && baseUrl.length > 0) ? baseUrl : (providerBaseUrl || '');
  
  // Determine the primary color based on theme
  const effectivePrimaryColor = effectiveTheme === 'dark' 
    ? (primaryColorDark || primaryColor || '#ffffff')
    : (primaryColorLight || primaryColor || '#000000');
  
  const themeColors = {
    primaryColor: effectivePrimaryColor,
    backgroundColor: backgroundColor || (effectiveTheme === 'dark' ? '#0B0B0F' : '#FFFFFF'),
    borderColor: borderColor || (effectiveTheme === 'dark' ? '#2A2C33' : '#E5E7EB'),
    textColor: textColor || (effectiveTheme === 'dark' ? '#EDEEF0' : '#111827'),
    accentColor: accentColor || (effectiveTheme === 'dark' ? '#17181C' : '#F9FAFB'),
    mutedTextColor: effectiveTheme === 'dark' ? '#6f7276' : '#6B7280',
    inputBackground: effectiveTheme === 'dark' ? '#17181C' : '#F3F4F6',
    cardBackground: effectiveTheme === 'dark' ? '#121318' : '#FFFFFF',
    hoverBackground: effectiveTheme === 'dark' ? '#1c1e25' : '#F3F4F6',
    errorColor: errorColor || '#ef4444',
    errorColorLight: errorColorLight || (effectiveTheme === 'dark' ? '#fee2e2' : '#fef2f2'),
    errorColorDark: errorColorDark || '#991b1b',
    successColor: successColor || '#10b981',
    successColorLight: successColorLight || (effectiveTheme === 'dark' ? 'rgba(16,185,129,0.15)' : '#d1fae5'),
    warningColor: warningColor || '#eab308',
    warningColorLight: warningColorLight || (effectiveTheme === 'dark' ? 'rgba(234,179,8,0.15)' : '#fef3c7'),
    infoColor: infoColor || '#3b82f6',
    infoColorLight: infoColorLight || (effectiveTheme === 'dark' ? 'rgba(59,130,246,0.15)' : '#dbeafe'),
    dangerColor: dangerColor || '#ef4444',
    dangerColorLight: dangerColorLight || 'rgba(239, 68, 68, 0.1)',
    dangerColorDark: dangerColorDark || '#991b1b',
  };

  const resolvedColors = themeColors;
  const t = (key: string) => {
    const en: Record<string, string> = {
      'header.new': 'New',
      'header.history': 'History',
      'header.close': 'Close chat',
      'input.placeholder': placeholder || 'Ask your question...',
      'input.prompt': 'Prompt',
      'input.attachFiles': 'Attach files',
      'input.insertLink': 'Insert link',
      'input.send': 'Send',
      'input.stop': 'Stop',
      'input.uploadingFiles': 'Uploading files...',
      'input.previewImage': 'Preview image',
      'input.removeFile': 'Remove file',
      'messages.empty': emptyStateMessage || 'Start by sending a message to the agent.',
      'general.agent': title || 'Agent',
      'editor.cancel': 'Cancel',
      'editor.saveAndRegenerate': 'Save & Regenerate',
      'editor.clickToEdit': 'Click to edit',
      'prompts.suggested': 'Suggested Prompts',
      'prompts.showMore': 'Show more',
      'prompts.showLess': 'Show less',
      'history.search': 'Search',
      'history.noChatsFound': 'No chats found.',
      'history.untitledChat': 'Untitled chat',
      'history.deleteChat': 'Delete chat',
      'history.newChat': 'New chat',
      'editModal.title': 'Edit Message',
      'editModal.content': 'This will remove this message and all messages after it, and place its content in the input field for editing. Do you want to continue?',
      'editModal.submit': 'Edit',
      'editModal.cancel': 'Cancel',
      'assistant.thinking': 'Thinking',
      'assistant.finishThinking': 'Finish Thinking',
      'tool.inputting': 'Inputting',
      'tool.running': 'Running',
      'tool.error': 'Error',
      'tool.called': 'Called',
      'error.occurred': 'An error occurred:',
      'error.tryAgain': 'Please try again.',
      'error.refresh': 'Refresh',
      'error.failedSend': 'Failed to send message. Please try again.',
      'error.failedEdit': 'Failed to edit message. Please try again.',
    };

    const ar: Record<string, string> = {
      'header.new': 'جديد',
      'header.history': 'السجل',
      'header.close': 'إغلاق المحادثة',
      'input.placeholder': placeholder || 'اكتب سؤالك...',
      'input.prompt': 'الرسالة',
      'input.attachFiles': 'إرفاق ملفات',
      'input.insertLink': 'إدراج رابط',
      'input.send': 'إرسال',
      'input.stop': 'إيقاف',
      'input.uploadingFiles': 'جارٍ رفع الملفات...',
      'input.previewImage': 'معاينة الصورة',
      'input.removeFile': 'إزالة الملف',
      'messages.empty': emptyStateMessage || 'ابدأ بإرسال رسالة إلى الوكيل.',
      'general.agent': title || 'الوكيل',
      'editor.cancel': 'إلغاء',
      'editor.saveAndRegenerate': 'حفظ وإعادة التوليد',
      'editor.clickToEdit': 'انقر للتعديل',
      'prompts.suggested': 'اقتراحات جاهزة',
      'prompts.showMore': 'عرض المزيد',
      'prompts.showLess': 'عرض أقل',
      'history.search': 'بحث',
      'history.noChatsFound': 'لا توجد محادثات.',
      'history.untitledChat': 'محادثة بدون عنوان',
      'history.deleteChat': 'حذف المحادثة',
      'history.newChat': 'محادثة جديدة',
      'editModal.title': 'تعديل الرسالة',
      'editModal.content': 'سيؤدي هذا إلى حذف هذه الرسالة وكل الرسائل التي بعدها، ثم وضع محتواها في حقل الإدخال للتعديل. هل تريد المتابعة؟',
      'editModal.submit': 'تعديل',
      'editModal.cancel': 'إلغاء',
      'assistant.thinking': 'جارٍ التفكير',
      'assistant.finishThinking': 'انتهى التفكير',
      'tool.inputting': 'جارٍ الإدخال',
      'tool.running': 'قيد التشغيل',
      'tool.error': 'خطأ',
      'tool.called': 'تم الاستدعاء',
      'error.occurred': 'حدث خطأ:',
      'error.tryAgain': 'يرجى المحاولة مرة أخرى.',
      'error.refresh': 'تحديث',
      'error.failedSend': 'تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى.',
      'error.failedEdit': 'تعذر تعديل الرسالة. يرجى المحاولة مرة أخرى.',
    };

    const dict = isArabic ? ar : en;
    return dict[key] || en[key] || key;
  };

  // Use the agent hook for all agent-related logic
  const agent = useHsafaAgent({
    agentName,
    agentConfig,
    baseUrl: effectiveBaseUrl,
    tools: HsafaTools,
    uiComponents: HsafaUI,
    templateParams,
    controlledChatId: currentChat,
    onChatIdChange: currentChat === undefined
      ? (id: string) => {
          if (onChatChanged) onChatChanged(id);
        }
      : undefined,
    onStart: useCallback((message: any) => {
      if (onStart) onStart(message);
    }, [onStart]),
    onFinish: useCallback((message: any) => {
      if (onFinish) onFinish(message);
    }, [onFinish]),
    onError: useCallback((error: Error) => {
      console.error('Chat error:', error);
    }, []),
    initialMessages,
    onMessagesChange,
  });

  // Destructure what we need from agent
  const {
    input,
    setInput,
    messages: chatMessages,
    isLoading,
    status,
    error: chatError,
    sendMessage,
    stop,
    setMessages,
    notifyMessagesChange,
    chatId: internalChatId,
    setChatId: setInternalChatId,
    tools: allTools,
    uiComponents: allUI,
    formHostRef,
    formStateRef,
    cleanupForms: cleanupAllForms,
    onUISuccess: handleUISuccess,
    onUIError: handleUIError,
    chatApi,
  } = agent;

  // Use controlled chatId if provided, otherwise use internal state
  const chatId = currentChat !== undefined ? currentChat : internalChatId;
  
  // Wrapper for setChatId that calls onChatChanged if provided
  const setChatId = useCallback((newChatId: string) => {
    if (currentChat === undefined) {
      // Uncontrolled mode: update internal state
      setInternalChatId(newChatId);
    }
    // Always notify parent if callback provided
    if (onChatChanged) {
      onChatChanged(newChatId);
    }
  }, [currentChat, setInternalChatId, onChatChanged]);

  // Sync internal chatId with controlled prop when it changes externally
  useEffect(() => {
    if (currentChat !== undefined && currentChat !== internalChatId) {
      setInternalChatId(currentChat);
    }
  }, [currentChat, internalChatId, setInternalChatId]);

  // File upload hook
  const {
    attachments,
    uploading,
    fileInputRef,
    formatBytes,
    handleRemoveAttachment,
    handleFileSelection,
    clearAttachments,
    setAttachments,
  } = useFileUpload(effectiveBaseUrl);

  const [uploadError, setUploadError] = useState<string | null>(null);

  // Hsafa provider integration and header/history state
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const tmp = createChatStorage(agentName);
      return tmp.getShowChat() || Boolean(defaultOpen);
    } catch {
      return Boolean(defaultOpen);
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const historyBtnRef = useRef<HTMLButtonElement>(null);
  const historyPopupRef = useRef<HTMLDivElement>(null);
  const [openReasoningIds, setOpenReasoningIds] = useState<Set<string>>(new Set());
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<{ id: string; text: string; attachments: any[] } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useAutoScroll<HTMLDivElement>(isLoading);
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use chat storage hook for automatic persistence
  const chatStorage = useChatStorage({
    agentId: agentName,
    chatId,
    messages: chatMessages,
    isLoading,
    autoSave: true,
    autoRestore: false, // We handle restore manually to set chatId
  });
  
  // Keep reference to raw storage for UI preferences
  const storage = chatStorage.storage;

  const [chatHistory, setChatHistory] = useState<ChatMeta[]>([]);
  
  // Load chat history after hydration
  useEffect(() => {
    try {
      const history = storage.loadChatsIndex();
      setChatHistory(history);
    } catch {
      setChatHistory([]);
    }
  }, [storage, historyRefreshKey]);
  
  // On mount: restore last opened chat and its messages (uncontrolled only)
  const restoredOnMountRef = useRef<boolean>(false);
  const lastLoadedChatRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (restoredOnMountRef.current) return;
    if (currentChat !== undefined) {
      // Controlled mode: restore messages for the provided chatId without changing chatId
      try {
        const saved = storage.loadChat(currentChat);
        const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
        if (msgs.length > 0) { try { setMessages(msgs); } catch { /* ignore */ } }
        lastLoadedChatRef.current = currentChat;
      } catch { /* ignore */ }
      try { storage.setCurrentChatId(currentChat); } catch { /* ignore */ }
      restoredOnMountRef.current = true;
      return;
    }
    try {
      const savedId = storage.getCurrentChatId();
      if (savedId) {
        setChatId(savedId);
        const saved = storage.loadChat(savedId);
        const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
        try { setMessages(msgs); } catch { /* ignore */ }
        lastLoadedChatRef.current = savedId;
      }
    } catch { /* ignore */ }
    restoredOnMountRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat]);

  // In controlled mode: reload messages when currentChat changes (for switching)
  useEffect(() => {
    if (!restoredOnMountRef.current) return; // Wait for initial restore
    if (currentChat === undefined) return; // Only for controlled mode
    if (currentChat === lastLoadedChatRef.current) return; // Already loaded
    
    // Chat switched: load new chat's messages
    try {
      const saved = storage.loadChat(currentChat);
      const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
      try { setMessages(msgs); } catch { /* ignore */ }
      lastLoadedChatRef.current = currentChat;
      try { storage.setCurrentChatId(currentChat); } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, [currentChat, storage, setMessages]);

  // After restore: persist current chatId so it is used on next reload
  useEffect(() => {
    if (!restoredOnMountRef.current) return;
    try { storage.setCurrentChatId(chatId); } catch { /* ignore */ }
  }, [chatId, storage]);

  // Reflect streaming/open state via provider
  useEffect(() => {
    try { setStreamingState(chatId, isLoading); } catch { /* ignore */ }
    return () => {
      // Cleanup: remove streaming state when component unmounts or chatId changes
      try { setStreamingState(chatId, false); } catch { /* ignore */ }
    };
  }, [chatId, isLoading, setStreamingState]);

  useEffect(() => {
    try { setChatOpenState(chatId, isOpen); } catch { /* ignore */ }
    return () => {
      // Cleanup: remove open state when component unmounts or chatId changes
      try { setChatOpenState(chatId, false); } catch { /* ignore */ }
    };
  }, [chatId, isOpen, setChatOpenState]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && attachments.length === 0) return;
    if (isLoading) return;

    // Capture current state before clearing
    const currentAttachments = [...attachments];

    // Clear input and attachments immediately for better UX
    setInput('');
    clearAttachments();
    setUploadError(null);
    
    // Auto-focus input for next message
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    try {
      // Send message with proper format for Vercel AI SDK v5
      // FileUIPart uses 'url' field, convertToModelMessages will convert to 'data' for the model
      await sendMessage({
        text: trimmedInput,
        files: currentAttachments.map(att => ({
          type: 'file' as const,
          url: att.url,
          mediaType: att.mimeType || 'application/octet-stream',
          ...(att.name ? { name: att.name } : {}),
          ...(att.size ? { size: att.size } : {}),
        })),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setUploadError(t('error.failedSend'));
    }
  }, [input, attachments, isLoading, sendMessage, clearAttachments, t]);

  // Header actions handlers
  const handleNewChat = useCallback(() => {
    if (isLoading) return;
    cleanupAllForms();
    setInput('');
    clearAttachments();
    setUploadError(null);
    try { setMessages([]); } catch { /* ignore */ }
    const newId = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    // Reset the loaded chat ref so the new chat is tracked
    lastLoadedChatRef.current = newId;
    // Use storage hook to mark a new chat session; actual metadata is created on first send
    try {
      chatStorage.createNewChat(() => {
        setChatId(newId);
        try { storage.setCurrentChatId(newId); } catch { /* ignore */ }
      });
    } catch {
      // Fallback: still set id to avoid being stuck
      setChatId(newId);
      try { storage.setCurrentChatId(newId); } catch { /* ignore */ }
    }
  }, [isLoading, clearAttachments, storage, setMessages, setChatId, cleanupAllForms, chatStorage]);

  const handleToggleHistory = useCallback(() => {
    setHistoryOpen(v => !v);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try { storage.setShowChat(false); } catch { /* ignore */ }
  }, [storage]);


  // Handle file input change
  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleFileSelection(files, setUploadError);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection, fileInputRef]);

  // Auto-resize textarea effect for main input
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to initial value first
    textarea.style.height = '24px';
    // Force reflow
    textarea.offsetHeight;
    // Then calculate proper height
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 200); // max height of 200px
    textarea.style.height = `${newHeight}px`;
  }, [input]);


  const handleUserMessageClick = useCallback((message: any, id: string, text: string, attachments?: any[]) => {
    setMessageToEdit({ id, text, attachments: attachments || [] });
    setIsConfirmEditOpen(true);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (!messageToEdit || isLoading) return;
    
    try {
      // Find the message index
      const messageIndex = chatMessages.findIndex((m: any) => m.id === messageToEdit.id);
      if (messageIndex === -1) return;

      // Remove messages from the edited message onwards
      const updatedMessages = chatMessages.slice(0, messageIndex);
      try { setMessages(updatedMessages); } catch { /* ignore */ }
      
      // Set the message content in the main input
      setInput(messageToEdit.text);
      
      // Set the message attachments in the main input
      setAttachments(messageToEdit.attachments);
      
      // Close modal and reset state
      setIsConfirmEditOpen(false);
      setMessageToEdit(null);
      
      // Notify about messages change after edit
      notifyMessagesChange();
    } catch (error) {
      console.error('Failed to edit message:', error);
      setUploadError(t('error.failedEdit'));
    }
  }, [messageToEdit, isLoading, chatMessages, setMessages, setAttachments, notifyMessagesChange, t]);

  const handleCancelEdit = useCallback(() => {
    setIsConfirmEditOpen(false);
    setMessageToEdit(null);
  }, []);

  // Inject custom CSS with theme-aware variables
  const cssVariablesAndCustomStyles = `
    :root {
      --hsafa-theme: ${effectiveTheme};
      --hsafa-primary: ${resolvedColors.primaryColor};
      --hsafa-background: ${resolvedColors.backgroundColor};
      --hsafa-border: ${resolvedColors.borderColor};
      --hsafa-text: ${resolvedColors.textColor};
      --hsafa-accent: ${resolvedColors.accentColor};
      --hsafa-muted-text: ${resolvedColors.mutedTextColor};
      --hsafa-input-bg: ${resolvedColors.inputBackground};
      --hsafa-card-bg: ${resolvedColors.cardBackground};
      --hsafa-hover-bg: ${resolvedColors.hoverBackground};
      --hsafa-error: ${resolvedColors.errorColor};
      --hsafa-error-light: ${resolvedColors.errorColorLight};
      --hsafa-error-dark: ${resolvedColors.errorColorDark};
      --hsafa-success: ${resolvedColors.successColor};
      --hsafa-success-light: ${resolvedColors.successColorLight};
      --hsafa-warning: ${resolvedColors.warningColor};
      --hsafa-warning-light: ${resolvedColors.warningColorLight};
      --hsafa-info: ${resolvedColors.infoColor};
      --hsafa-info-light: ${resolvedColors.infoColorLight};
      --hsafa-danger: ${resolvedColors.dangerColor};
      --hsafa-danger-light: ${resolvedColors.dangerColorLight};
      --hsafa-danger-dark: ${resolvedColors.dangerColorDark};
    }
    .chat-history-item-with-border {
      border-top: 1px solid var(--border-color);
    }
    .chat-history-item {
      border-top: none;
    }
    ${customStyles || ''}
  `;

  // Full page chat layout (modern, centered UI like ChatGPT/Gemini)
  const fullPageLayout = (
    <div
      data-hsafa-chat="fullpage"
      data-hsafa-theme={effectiveTheme}
      data-hsafa-agent-id={agentName}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        backgroundColor: resolvedColors.backgroundColor,
        color: resolvedColors.textColor,
        overflow: 'hidden',
      }}
    >
      {/* Inject custom CSS */}
      {cssVariablesAndCustomStyles && (
        <style dangerouslySetInnerHTML={{ __html: cssVariablesAndCustomStyles }} />
      )}
      {/* Sidebar (Desktop) */}
      {!isMobile && (
        <ChatHistorySidebar
          isOpen={historyOpen}
          historySearch={historySearch}
          onSearchChange={setHistorySearch}
          chats={chatHistory}
          currentChatId={chatId}
          resolvedColors={resolvedColors as any}
          dir={effectiveDir}
          t={t}
          onChatSelect={(id) => {
            if (id && id !== chatId) {
              cleanupAllForms();
              setChatId(id);
              if (currentChat === undefined) {
                try {
                  storage.setCurrentChatId(id);
                } catch { /* ignore */ }
                try {
                  const saved = storage.loadChat(id);
                  const msgs = saved && Array.isArray((saved as any).messages) ? (saved as any).messages : [];
                  try {
                    setMessages(msgs);
                  } catch { /* ignore */ }
                } catch { /* ignore */ }
              }
            }
          }}
          onChatDelete={(id) => {
            try {
              storage.deleteChat(id);
              setHistoryRefreshKey((v) => v + 1);
              if (id === chatId) {
                handleNewChat();
              }
            } catch { /* ignore */ }
          }}
          onNewChat={handleNewChat}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {/* Main Content Column */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1, 
        minWidth: 0,
        position: 'relative'
      }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            // No border for cleaner look, or very subtle
            // borderBottom: `1px solid ${resolvedColors.borderColor}`,
            backgroundColor: resolvedColors.backgroundColor,
            minHeight: '60px',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Sidebar Toggle / History Button */}
            <button
              ref={historyBtnRef}
              onClick={handleToggleHistory}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: resolvedColors.mutedTextColor,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
                e.currentTarget.style.color = resolvedColors.textColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = resolvedColors.mutedTextColor;
              }}
              aria-label={t('header.history')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            
            <h1 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: resolvedColors.textColor }}>
              {t('general.agent')}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleNewChat}
              disabled={isLoading}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: resolvedColors.mutedTextColor,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = resolvedColors.hoverBackground;
                  e.currentTarget.style.color = resolvedColors.textColor;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = resolvedColors.mutedTextColor;
              }}
              aria-label={t('header.new')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Messages Container */}
          <div
            ref={scrollRef}
            className="chat-scroll-container"
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              scrollBehavior: 'smooth',
              ['--hsafa-primary' as any]: resolvedColors.primaryColor,
              ['--hsafa-border' as any]: resolvedColors.borderColor,
              ['--hsafa-card' as any]: resolvedColors.cardBackground,
              ['--hsafa-text' as any]: resolvedColors.textColor,
              ['--hsafa-muted' as any]: resolvedColors.mutedTextColor,
              ['--hsafa-bg' as any]: resolvedColors.backgroundColor,
              ['--hsafa-hover' as any]: resolvedColors.hoverBackground,
              ['--hsafa-input-bg' as any]: resolvedColors.inputBackground,
              ['--hsafa-accent' as any]: resolvedColors.accentColor,
            }}
          >
            <div
              style={{
                maxWidth: '768px',
                width: '100%',
                margin: '0 auto',
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
              }}
            >
              {chatMessages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '64px 0',
                  }}
                >
                  {presetPrompts && presetPrompts.length > 0 ? (
                    <PresetPrompts
                      prompts={presetPrompts}
                      onSelect={(prompt) => setInput(prompt)}
                      resolvedColors={resolvedColors as any}
                      disabled={isLoading}
                      dir={effectiveDir}
                      t={t}
                    />
                  ) : (
                    <div
                      style={{
                        padding: '64px 32px',
                        textAlign: 'center',
                        color: resolvedColors.mutedTextColor,
                        fontSize: '16px',
                      }}
                    >
                      {t('messages.empty')}
                    </div>
                  )}
                </div>
              ) : (
                <MessageList
                  chatMessages={chatMessages as any}
                  isLoading={isLoading}
                  openReasoningIds={openReasoningIds}
                  toggleReasoning={(id) =>
                    setOpenReasoningIds((prev) => {
                      const n = new Set(prev);
                      if (n.has(id)) {
                        n.delete(id);
                      } else {
                        n.add(id);
                      }
                      return n;
                    })
                  }
                  resolvedColors={resolvedColors as any}
                  t={t}
                  onUserMessageClick={handleUserMessageClick}
                  HsafaUI={allUI}
                  onUIError={handleUIError}
                  onUISuccess={handleUISuccess}
                  addToolResult={(payload: any) =>
                    (chatApi as any)?.addToolResult?.(payload)
                  }
                  editableMessageIcon={editProcessContent?.message_icon}
                  fullPage={true}
                  dir={effectiveDir}
                  theme={effectiveTheme}
                />
              )}
            </div>
          </div>

          {/* Input Area */}
          <div
            style={{
              // No border top for seamless look
              backgroundColor: resolvedColors.backgroundColor,
              padding: '0 24px 24px',
              position: 'relative',
              zIndex: 20,
            }}
          >
            <div
              style={{
                maxWidth: '768px',
                width: '100%',
                margin: '0 auto',
              }}
            >
              {componentAboveInput && React.createElement(componentAboveInput, {})}
              {uploadError && (
                <div
                  style={{
                    padding: '12px 16px',
                    marginBottom: '12px',
                    backgroundColor: resolvedColors.errorColor,
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{uploadError}</span>
                  <button
                    onClick={() => setUploadError(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: '2px',
                      fontSize: '20px',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {chatError && (
                <div
                  style={{
                    padding: '12px 16px',
                    marginBottom: '12px',
                    backgroundColor: resolvedColors.errorColor,
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{t('error.occurred')} {chatError.message || t('error.tryAgain')}</span>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      background: 'none',
                      border: '1px solid #fff',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {t('error.refresh')}
                  </button>
                </div>
              )}

              <ChatInput
                input={input}
                setInput={setInput}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
                isLoading={isLoading}
                uploading={uploading}
                attachments={attachments as any}
                formatBytes={formatBytes}
                handleRemoveAttachment={handleRemoveAttachment}
                onFileInputChange={onFileInputChange}
                onSend={handleSendMessage}
                onStop={() => stop()}
                status={status as 'ready' | 'streaming' | 'submitted' | 'error' | undefined}
                t={t}
                resolvedColors={resolvedColors as any}
                fullPage={true}
                dir={effectiveDir}
              />
            </div>
          </div>
        </div>
      </div>

      {/* History Modal (Mobile) */}
      {isMobile && (
        <ChatHistoryModal
          historyOpen={historyOpen}
          historySearch={historySearch}
          currentChatId={chatId}
          refreshKey={historyRefreshKey}
          resolvedColors={resolvedColors as any}
          onClose={() => setHistoryOpen(false)}
          onSearchChange={setHistorySearch}
          dir={effectiveDir}
          t={t}
          onChatSelect={(id) => {
            setHistoryOpen(false);
            if (id && id !== chatId) {
              cleanupAllForms();
              setChatId(id);
              if (currentChat === undefined) {
                try {
                  storage.setCurrentChatId(id);
                } catch { /* ignore */ }
                try {
                  const saved = storage.loadChat(id);
                  const msgs = saved && Array.isArray((saved as any).messages) ? (saved as any).messages : [];
                  try {
                    setMessages(msgs);
                  } catch { /* ignore */ }
                } catch { /* ignore */ }
              }
            }
          }}
          onChatDelete={(id) => {
            try {
              storage.deleteChat(id);
              setHistoryRefreshKey((v) => v + 1);
              if (id === chatId) {
                handleNewChat();
              }
            } catch { /* ignore */ }
          }}
          loadChatsIndex={() => chatHistory}
          historyPopupRef={historyPopupRef}
        />
      )}

      {/* Confirm Edit Modal */}
      <ConfirmEditModal
        isOpen={isConfirmEditOpen}
        resolvedColors={resolvedColors as any}
        t={t}
        editProcessContent={editProcessContent}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
        dir={effectiveDir}
        lang={effectiveLang}
      />

      {/* Animations */}
      <style>
        {`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          /* Markdown Table Styles */
          .chat-scroll-container .x-markdown-dark table,
          .chat-scroll-container .x-markdown-light table,
          .chat-scroll-container table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--hsafa-border);
            margin: 16px 0;
            font-size: 14px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          .chat-scroll-container th,
          .chat-scroll-container td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--hsafa-border);
            border-right: 1px solid var(--hsafa-border);
            line-height: 1.5;
          }
          .chat-scroll-container th:last-child,
          .chat-scroll-container td:last-child {
            border-right: none;
          }
          .chat-scroll-container tr:last-child td {
            border-bottom: none;
          }
          .chat-scroll-container th {
            background-color: var(--hsafa-hover);
            color: var(--hsafa-text);
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .chat-scroll-container td {
            background-color: transparent;
            color: var(--hsafa-text);
          }
          /* Row hover effect */
          .chat-scroll-container tr:hover td {
            background-color: var(--hsafa-hover);
            transition: background-color 0.15s ease;
          }
          /* Ensure code blocks don't overflow */
          .chat-scroll-container pre {
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;
            border: 1px solid var(--hsafa-border);
          }
        `}
      </style>
    </div>
  );

  const panel = (
    <div
      data-hsafa-chat="panel"
      data-hsafa-theme={effectiveTheme}
      data-hsafa-agent-id={agentName}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: "420px",
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        color: resolvedColors.textColor,
        gap: '16px',
        zIndex: 1000,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease-out, width 0.2s ease-out'
      }}
    >
     <ChatHeader 
      title={t('general.agent')}
      alwaysOpen={false}
      streaming={isLoading}
      dir={effectiveDir}
      resolvedColors={resolvedColors as any}
      onNew={handleNewChat}
      onToggleHistory={handleToggleHistory}
      onClose={handleClose}
      historyBtnRef={historyBtnRef}
      t={t as any}
    />

      {/* MessageList */}
      <div
        ref={scrollRef}
        className="chat-scroll-container"
        style={{
          flex: '1',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 4px 16px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          scrollBehavior: 'smooth',
          // Theme variables for inline forms and controls
          ['--hsafa-primary' as any]: (resolvedColors as any).primaryColor,
          ['--hsafa-border' as any]: (resolvedColors as any).borderColor,
          ['--hsafa-card' as any]: (resolvedColors as any).cardBackground,
          ['--hsafa-text' as any]: (resolvedColors as any).textColor,
          ['--hsafa-muted' as any]: (resolvedColors as any).mutedTextColor,
          ['--hsafa-bg' as any]: (resolvedColors as any).backgroundColor,
          ['--hsafa-hover' as any]: (resolvedColors as any).hoverBackground,
          ['--hsafa-input-bg' as any]: (resolvedColors as any).inputBackground,
          ['--hsafa-accent' as any]: (resolvedColors as any).accentColor,
        }}
      >
        {chatMessages.length === 0 ? (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '16px 0'
          }}>
            {presetPrompts && presetPrompts.length > 0 ? (
              <PresetPrompts
                prompts={presetPrompts}
                onSelect={(prompt) => setInput(prompt)}
                resolvedColors={resolvedColors as any}
                disabled={isLoading}
                dir={effectiveDir}
                t={t}
              />
            ) : (
              <div style={{ 
                padding: '32px', 
                textAlign: 'center', 
                color: resolvedColors.mutedTextColor,
                fontSize: '14px' 
              }}>
                {t('messages.empty')}
              </div>
            )}
          </div>
        ) : (
          <MessageList
            chatMessages={chatMessages as any}
            isLoading={isLoading}
            openReasoningIds={openReasoningIds}
            toggleReasoning={(id) =>
              setOpenReasoningIds((prev) => {
                const n = new Set(prev);
                if (n.has(id)) {
                  n.delete(id);
                } else {
                  n.add(id);
                }
                return n;
              })
            }
            resolvedColors={resolvedColors as any}
            t={t}
            onUserMessageClick={handleUserMessageClick}
            HsafaUI={allUI}
            onUIError={handleUIError}
            onUISuccess={handleUISuccess}
            addToolResult={(payload: any) => (chatApi as any)?.addToolResult?.(payload)}
            editableMessageIcon={editProcessContent?.message_icon}
            dir={effectiveDir}
            theme={effectiveTheme}
          />
        )}
      </div>

   

      {/* ChatInput */}
      <div style={{ position: 'sticky', bottom: '0', marginTop: 'auto', paddingBottom: '8px', }}>
           {/* Component Above Input */}
      {componentAboveInput && React.createElement(componentAboveInput, {})}
        {uploadError && (
          <div style={{ padding: '8px 12px', marginBottom: '8px', backgroundColor: resolvedColors.errorColor, color: '#fff', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}>×</button>
          </div>
        )}

        {chatError && (
          <div style={{ padding: '8px 12px', marginBottom: '8px', backgroundColor: resolvedColors.errorColor, color: '#fff', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t('error.occurred')} {chatError.message || t('error.tryAgain')}</span>
            <button onClick={() => window.location.reload()} style={{ background: 'none', border: '1px solid #fff', color: '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{t('error.refresh')}</button>
          </div>
        )}

        <ChatInput
          input={input}
          setInput={setInput}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          isLoading={isLoading}
          uploading={uploading}
          attachments={attachments as any}
          formatBytes={formatBytes}
          handleRemoveAttachment={handleRemoveAttachment}
          onFileInputChange={onFileInputChange}
          onSend={handleSendMessage}
          onStop={() => stop()}
          status={status as 'ready' | 'streaming' | 'submitted' | 'error' | undefined}
          t={t}
          resolvedColors={resolvedColors as any}
          dir={effectiveDir}
        />
      </div>

      {/* History Modal */}
      <ChatHistoryModal
        historyOpen={historyOpen}
        historySearch={historySearch}
        currentChatId={chatId}
        refreshKey={historyRefreshKey}
        resolvedColors={resolvedColors as any}
        onClose={() => setHistoryOpen(false)}
        onSearchChange={setHistorySearch}
        dir={effectiveDir}
        t={t}
        onChatSelect={(id) => {
          setHistoryOpen(false);
          if (id && id !== chatId) {
            cleanupAllForms();
            setChatId(id);
            // In controlled mode, messages will be loaded by the effect above
            // In uncontrolled mode, load messages here
            if (currentChat === undefined) {
              try { storage.setCurrentChatId(id); } catch { /* ignore */ }
              try {
                const saved = storage.loadChat(id);
                const msgs = (saved && Array.isArray((saved as any).messages)) ? (saved as any).messages : [];
                try { setMessages(msgs); } catch { /* ignore */ }
              } catch { /* ignore */ }
            }
          }
        }}
        onChatDelete={(id) => {
          try {
            storage.deleteChat(id);
            setHistoryRefreshKey((v) => v + 1);
            if (id === chatId) {
              handleNewChat();
            }
          } catch { /* ignore */ }
        }}
        loadChatsIndex={() => storage.loadChatsIndex()}
        historyPopupRef={historyPopupRef}
      />

      {/* Confirm Edit Modal */}
      <ConfirmEditModal
        isOpen={isConfirmEditOpen}
        resolvedColors={resolvedColors as any}
        t={t}
        dir={effectiveDir}
        lang={effectiveLang}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
        editProcessContent={editProcessContent}
      />

      {/* Animations */}
      <style>
        {`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          /* Markdown Table Styles */
          .chat-scroll-container .x-markdown-dark table,
          .chat-scroll-container .x-markdown-light table,
          .chat-scroll-container table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--hsafa-border);
            margin: 16px 0;
            font-size: 14px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          .chat-scroll-container th,
          .chat-scroll-container td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--hsafa-border);
            border-right: 1px solid var(--hsafa-border);
            line-height: 1.5;
          }
          .chat-scroll-container th:last-child,
          .chat-scroll-container td:last-child {
            border-right: none;
          }
          .chat-scroll-container tr:last-child td {
            border-bottom: none;
          }
          .chat-scroll-container th {
            background-color: var(--hsafa-hover);
            color: var(--hsafa-text);
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .chat-scroll-container td {
            background-color: transparent;
            color: var(--hsafa-text);
          }
          /* Row hover effect */
          .chat-scroll-container tr:hover td {
            background-color: var(--hsafa-hover);
            transition: background-color 0.15s ease;
          }
          /* Ensure code blocks don't overflow */
          .chat-scroll-container pre {
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;
            border: 1px solid var(--hsafa-border);
          }
        `}
      </style>
    </div>
  );

  // If fullPageChat mode, render full page layout directly
  if (fullPageChat) {
    return (
      <>
        <CursorController />
        {fullPageLayout}
      </>
    );
  }

  // Otherwise, render as floating panel
  if (typeof document !== 'undefined' && document.body) {
    return (
      <>
        <CursorController />
        {createPortal(panel, document.body)}
        <FloatingChatButton
          show={!isOpen}
          onClick={() => { setIsOpen(true); try { storage.setShowChat(true); } catch { /* ignore */ } }}
          resolvedColors={resolvedColors as any}
          floatingButtonPosition={floatingButtonPosition}
        />
      </>
    );
  }

  return panel;
}
