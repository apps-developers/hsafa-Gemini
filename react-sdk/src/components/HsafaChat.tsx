 import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from "react-dom";
import { ChatHeader } from "./hsafa-chat/ChatHeader";
import { useFileUpload } from "../hooks/useFileUploadHook";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useHsafaGateway } from "../hooks/useHsafaGateway";
import { HsafaChatProps } from "../types/chat";
import { MessageList } from "./hsafa-chat";
import { ChatInput } from "./hsafa-chat";
import { PresetPrompts } from "./hsafa-chat";
import { ChatMeta } from "../utils/chat-storage";
import { ChatHistoryModal } from "./hsafa-chat/ChatHistoryModal";
import { ChatHistorySidebar } from "./hsafa-chat/ChatHistorySidebar";
import { ConfirmEditModal } from "./hsafa-chat/ConfirmEditModal";
import { useHsafa } from "../providers/HsafaProvider";
import { FloatingChatButton } from "./FloatingChatButton";
import CursorController from "./web-controler/CursorController";
import { createBuiltInUI } from "./hsafa-chat/utils/builtInUI";

export function HsafaChat({
  agentName,
  agentId,
  gatewayUrl,
  runId: providedRunId,
  senderId,
  senderName,
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
  const { dir: providerDir, theme: providerTheme, baseUrl: providerBaseUrl, setStreamingState } = useHsafa();
  const effectiveDir = (dir || providerDir || 'ltr') as 'rtl' | 'ltr';
  const isRTL = effectiveDir === 'rtl';
  const effectiveLang = (lang || language || 'en') as 'en' | 'ar';
  const isArabic = effectiveLang === 'ar';
  const effectiveTheme = (theme || providerTheme || 'dark');
  const effectiveBaseUrl = (baseUrl && baseUrl.length > 0) ? baseUrl : (providerBaseUrl || '');
  const effectiveGatewayUrl = (gatewayUrl && gatewayUrl.length > 0) ? gatewayUrl : effectiveBaseUrl;
  
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

  const configuredAgentId = typeof agentId === 'string' ? agentId : '';
  const hasValidGatewayConfig = Boolean(configuredAgentId && effectiveGatewayUrl);

  const CURRENT_RUN_KEY = `hsafa-current-run:${configuredAgentId || agentName}`;
  const HISTORY_OPEN_KEY = `hsafa-history-open:${configuredAgentId || agentName}`;

  // Built-in UI
  const builtInUI = useMemo(() => createBuiltInUI(), []);
  const allUI = useMemo(() => ({ ...builtInUI, ...HsafaUI }), [builtInUI, HsafaUI]);

  // Form state refs (shared between modes)
  const formHostRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const formStateRef = useRef<Map<string, { submitted?: boolean; skipped?: boolean; values?: Record<string, unknown> }>>(new Map());

  // Input state (managed here for gateway mode, managed by useHsafaAgent for legacy mode)
  const [gatewayInput, setGatewayInput] = useState('');

  // Chat ID state for gateway mode
  const [gatewayChatId, setGatewayChatId] = useState(() => 
    currentChat || `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  // Callbacks
  const onStartCallback = useCallback((message: unknown) => {
    if (onStart) onStart(message);
  }, [onStart]);

  const onFinishCallback = useCallback((message: unknown) => {
    if (onFinish) onFinish(message);
  }, [onFinish]);

  const onErrorCallback = useCallback((error: Error) => {
    console.error('Chat error:', error);
  }, []);

  // Gateway mode: useHsafaGateway hook (SDK is gateway-only)
  const gatewayAgent = useHsafaGateway({
    gatewayUrl: effectiveGatewayUrl,
    agentId: configuredAgentId,
    runId: providedRunId || currentChat,
    senderId,
    senderName,
    tools: HsafaTools as Record<string, (args: unknown) => Promise<unknown> | unknown>,
    onComplete: (text) => onFinishCallback({ text }),
    onError: onErrorCallback,
  });

  const input = gatewayInput;
  const setInput = setGatewayInput;
  const chatMessages = gatewayAgent.messages as unknown[];
  const isLoading = gatewayAgent.isStreaming;
  const status = gatewayAgent.status;
  const chatError = gatewayAgent.error;
  const stop = gatewayAgent.stop;
  const internalChatId = gatewayChatId;
  const chatApi = gatewayAgent;

  // Gateway mode sendMessage adapter
  const sendMessage = useCallback(async (options?: { text?: string; files?: unknown[] }) => {
    if (!hasValidGatewayConfig) return;
    const text = options?.text ?? gatewayInput;
    const files = (options?.files || []) as Array<{ url: string; mediaType: string; name?: string }>;
    await gatewayAgent.sendMessage(text, files.length > 0 ? files : undefined);
    if (!options?.text) setGatewayInput('');
    onStartCallback({ role: 'user', content: text });
  }, [hasValidGatewayConfig, gatewayInput, gatewayAgent, onStartCallback]);

  // Notify messages change
  const notifyMessagesChange = useCallback(() => {
    if (onMessagesChange) {
      onMessagesChange(chatMessages, internalChatId);
    }
  }, [onMessagesChange, chatMessages, internalChatId]);

  // Cleanup forms
  const cleanupAllForms = useCallback(() => {
    formHostRef.current.forEach((el) => { try { el.remove(); } catch { /* ignore cleanup errors */ } });
    formHostRef.current.clear();
    formStateRef.current.clear();
  }, []);

  // UI tool handlers
  const handleUISuccess = useCallback((toolCallId: string, toolName: string) => {
    gatewayAgent.addToolResult({
      tool: toolName,
      toolCallId,
      output: { status: 'ok', rendered: true, component: toolName },
    });
  }, [gatewayAgent]);

  const handleUIError = useCallback((toolCallId: string, toolName: string, error: Error) => {
    gatewayAgent.addToolResult({
      tool: toolName,
      toolCallId,
      state: 'output-error',
      errorText: error?.message || String(error),
    });
  }, [gatewayAgent]);

  // Use controlled chatId if provided, otherwise use internal state
  const chatId = currentChat !== undefined ? currentChat : internalChatId;

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

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    return Boolean(defaultOpen);
  });
  const [historyOpen, setHistoryOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HISTORY_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
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

  const [chatHistory, setChatHistory] = useState<ChatMeta[]>([]);
  
  const loadRunsRef = useRef(gatewayAgent.loadRuns);
  loadRunsRef.current = gatewayAgent.loadRuns;
  
  useEffect(() => {
    if (!hasValidGatewayConfig) {
      setChatHistory([]);
      return;
    }

    loadRunsRef.current().then(runs => {
      const history: ChatMeta[] = runs.map(run => ({
        id: run.id,
        title: `Run ${run.id.slice(0, 8)}`,
        createdAt: new Date(run.createdAt).getTime(),
        updatedAt: run.completedAt ? new Date(run.completedAt).getTime() : new Date(run.createdAt).getTime(),
      }));
      setChatHistory(history);
    }).catch(() => setChatHistory([]));
  }, [hasValidGatewayConfig, historyRefreshKey]);
  
  const restoredOnMountRef = useRef<boolean>(false);

  // Store gateway methods in refs to avoid dependency issues
  const attachToRunRef = useRef(gatewayAgent.attachToRun);
  attachToRunRef.current = gatewayAgent.attachToRun;
  const resetRef = useRef(gatewayAgent.reset);
  resetRef.current = gatewayAgent.reset;
  const deleteRunRef = useRef(gatewayAgent.deleteRun);
  deleteRunRef.current = gatewayAgent.deleteRun;
  
  useEffect(() => {
    if (!hasValidGatewayConfig) return;
    if (!gatewayAgent.isReady) return;
    if (restoredOnMountRef.current) return;

    restoredOnMountRef.current = true;
    if (providedRunId || currentChat) return;

    try {
      const savedRunId = localStorage.getItem(CURRENT_RUN_KEY);
      if (savedRunId) {
        attachToRunRef.current(savedRunId);
        setGatewayChatId(savedRunId);
      }
    } catch { /* ignore */ }
  }, [hasValidGatewayConfig, gatewayAgent.isReady, CURRENT_RUN_KEY, providedRunId, currentChat]);

  // Refresh chat list when a new run is created
  const prevRunIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasValidGatewayConfig) return;
    const currentRunId = gatewayAgent.runId;
    // If runId changed from null to a value, a new run was created
    if (currentRunId && prevRunIdRef.current === null) {
      setHistoryRefreshKey((v) => v + 1);
      try { localStorage.setItem(CURRENT_RUN_KEY, currentRunId); } catch { /* ignore */ }
    }
    prevRunIdRef.current = currentRunId;
  }, [hasValidGatewayConfig, gatewayAgent.runId, CURRENT_RUN_KEY]);

  // Persist current runId so it is used on next reload
  useEffect(() => {
    if (!hasValidGatewayConfig) return;
    try {
      if (gatewayAgent.runId) {
        localStorage.setItem(CURRENT_RUN_KEY, gatewayAgent.runId);
      }
    } catch { /* ignore */ }
  }, [hasValidGatewayConfig, gatewayAgent.runId, CURRENT_RUN_KEY]);

  // Persist history open/close state
  useEffect(() => {
    try { localStorage.setItem(HISTORY_OPEN_KEY, String(historyOpen)); } catch { /* ignore */ }
  }, [HISTORY_OPEN_KEY, historyOpen]);

  // Reflect streaming/open state via provider
  useEffect(() => {
    try { setStreamingState(chatId, isLoading); } catch { /* ignore */ }
    return () => {
      // Cleanup: remove streaming state when component unmounts or chatId changes
      try { setStreamingState(chatId, false); } catch { /* ignore */ }
    };
  }, [chatId, isLoading, setStreamingState]);

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

    resetRef.current();
    try { localStorage.removeItem(CURRENT_RUN_KEY); } catch { /* ignore */ }
    setGatewayChatId(`chat_${Date.now()}`);
  }, [isLoading, CURRENT_RUN_KEY, clearAttachments, cleanupAllForms, resetRef, setInput]);

  const handleHistorySelect = useCallback((id: string, closeHistory: boolean) => {
    if (!id) return;
    if (closeHistory) setHistoryOpen(false);
    cleanupAllForms();

    if (id !== gatewayAgent.runId) {
      attachToRunRef.current(id);
      setGatewayChatId(id);
      try { localStorage.setItem(CURRENT_RUN_KEY, id); } catch { /* ignore */ }
      if (onChatChanged) onChatChanged(id);
    }
  }, [CURRENT_RUN_KEY, cleanupAllForms, gatewayAgent.runId, onChatChanged]);

  const handleHistoryDelete = useCallback(async (id: string) => {
    try {
      await deleteRunRef.current(id);
      if (id === gatewayAgent.runId) {
        handleNewChat();
      }
      setHistoryRefreshKey((v) => v + 1);
    } catch { /* ignore */ }
  }, [gatewayAgent.runId, handleNewChat]);

  const handleToggleHistory = useCallback(() => {
    setHistoryOpen(v => !v);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);


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
    void textarea.offsetHeight;
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
  }, [messageToEdit, isLoading, setAttachments, notifyMessagesChange, t, setInput]);

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
          onChatSelect={(id) => handleHistorySelect(id, false)}
          onChatDelete={handleHistoryDelete}
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
            // No border top for cleaner look, or very subtle
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
                      resolvedColors={resolvedColors}
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
          onChatSelect={(id) => handleHistorySelect(id, true)}
          onChatDelete={handleHistoryDelete}
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
        onChatSelect={(id) => handleHistorySelect(id, true)}
        onChatDelete={handleHistoryDelete}
        loadChatsIndex={() => chatHistory}
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
          onClick={() => { setIsOpen(true); }}
          resolvedColors={resolvedColors as any}
          floatingButtonPosition={floatingButtonPosition}
        />
      </>
    );
  }

  return panel;
}
