import { ChatMessage, Attachment } from '../types/chat';
import { buildUserContent, joinUrl } from './file-upload';

export interface StreamingContext {
  agentId: string;
  baseUrl?: string;
  currentChatId: string | null;
  actionExecMap: Record<string, boolean>;
  assistantMsgId?: string;
  calledFinalActions: Set<string>;
  actionParamsHistory: Map<string, any[]>;
  actionExecutionStatus: Map<string, 'executing' | 'executed' | any>;
  hasChatRecord: boolean;
  pendingFirstTitle?: string | null;
  setCurrentChatId: (id: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setActionStatuses: (statuses: Map<string, 'executing' | 'executed'>) => void;
  setError: (error: string | null) => void;
  upsertChatMeta: (meta: any) => void;
  saveChat: (data: any) => void;
  saveCurrentChatId: (id: string) => void;
  processActions: (items: any[], trigger: 'partial' | 'final') => void;
}

export function buildMessageHistory(messages: ChatMessage[]): any[] {
  const history: any[] = [];
  const processedMessages = new Set<string>();

  messages.forEach(m => {
    if (m.role === 'user') {
      const previousAttachments = Array.isArray(m.attachments) ? m.attachments : [];
      const content = buildUserContent(m.text ?? '', previousAttachments);
      history.push({ role: 'user' as const, content });
      processedMessages.add(m.id);
    } else {
      // Skip if already processed
      if (processedMessages.has(m.id)) return;

      // Build assistant message content as array
      const contentParts: any[] = [];

      // Add reasoning as ReasoningPart if available
      if (m.reasoning) {
        contentParts.push({
          type: 'reasoning',
          text: m.reasoning
        });
      }

      // Add MCP tool calls as ToolCallPart
      if (m.mcpToolCalls && m.mcpToolCalls.length > 0) {
        m.mcpToolCalls.forEach((call: any, index: number) => {
          // Generate unique toolCallId based on message id and call index
          const toolCallId = `${m.id}_tool_${index}`;
          contentParts.push({
            type: 'tool-call',
            toolCallId,
            toolName: call.toolName,
            input: call.args
          });

          // Add corresponding tool result message if available
          if (m.mcpToolResults && m.mcpToolResults[call.toolName]) {
            history.push({
              role: 'tool',
              content: [{
                type: 'tool-result',
                toolCallId,
                toolName: call.toolName,
                output: m.mcpToolResults[call.toolName],
                isError: call.status === 'failed'
              }]
            });
          }
        });
      }

      // Add response content as TextPart
      let responseText = '';
      if (Array.isArray(m.items) && m.items.length > 0) {
        const textItems = m.items.filter(item => typeof item === 'string');
        if (textItems.length > 0) {
          responseText = textItems.join('\n');
        } else {
          // Handle structured items (actions, UI components, etc.)
          responseText = JSON.stringify({ items: m.items }, null, 2);
        }
      }

      if (responseText) {
        contentParts.push({
          type: 'text',
          text: responseText
        });
      }

      // Only add assistant message if it has content parts
      if (contentParts.length > 0) {
        history.push({
          role: 'assistant' as const,
          content: contentParts.length === 1 && contentParts[0].type === 'text'
            ? contentParts[0].text // Use string content for simple text-only responses
            : contentParts // Use array content for complex responses with tools/reasoning
        });
      }

      processedMessages.add(m.id);
    }
  });

  return history;
}

export async function handleSendMessage(
  userText: string,
  attachments: Attachment[],
  messages: ChatMessage[],
  context: StreamingContext
) {
  const {
    agentId,
    baseUrl,
    currentChatId,
    setCurrentChatId,
    setMessages,
    setError,
    upsertChatMeta,
    saveChat,
    saveCurrentChatId,
    processActions,
    hasChatRecord,
    pendingFirstTitle
  } = context;

  if (!agentId || !userText.trim()) return;

  setError(null);

  const userId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const assistantId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const attachmentsCopy: Attachment[] = attachments.map(att => ({ ...att }));
  const newUser = { id: userId, role: 'user' as const, content: userText, text: userText, attachments: attachmentsCopy };
  const newAssistant = { id: assistantId, role: 'assistant' as const, items: [], reasoning: '', reasoningOpen: false, mcpToolCalls: [], mcpToolResults: {} };
  const newMessages: ChatMessage[] = [...messages, newUser, newAssistant];

  const history = buildMessageHistory(messages);
  const userContent = buildUserContent(userText, attachmentsCopy);
  history.push({ role: 'user' as const, content: userContent });
  setMessages(newMessages);

  try {
    const payload: any = {
      prompt: userText,
      chatId: currentChatId ?? undefined,
      messages: history,
    };

    setMessages(prev => prev.map(m => (m.id === assistantId || m.id === userId ? { ...m, requestParams: payload } as any : m)));

    const res = await fetch(joinUrl(baseUrl, `/api/run/${agentId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => '');
      throw new Error(t || `Request failed with ${res.status}`);
    }

    return {
      reader: res.body.getReader(),
      decoder: new TextDecoder(),
      assistantId,
      newMessages
    };
  } catch (e: any) {
    setError(String(e?.message ?? e));
    throw e;
  }
}

export function processStreamingEvent(
  evt: any,
  assistantId: string,
  context: StreamingContext
) {
  const {
    currentChatId,
    setCurrentChatId,
    setMessages,
    actionExecMap,
    assistantMsgId,
    calledFinalActions,
    actionParamsHistory,
    actionExecutionStatus,
    setActionStatuses,
    hasChatRecord,
    pendingFirstTitle,
    upsertChatMeta,
    saveChat,
    saveCurrentChatId,
    processActions,
    agentId
  } = context;

  if (evt?.type === 'meta') {
    // Capture execution preferences and assistant message id
    if (evt.actionExecuteMap && typeof evt.actionExecuteMap === 'object') {
      Object.assign(actionExecMap, evt.actionExecuteMap);
    }
    if (evt.assistantMessageId) {
      context.assistantMsgId = String(evt.assistantMessageId);
      calledFinalActions.clear();
      // Reset action tracking for new message
      actionParamsHistory.clear();
      actionExecutionStatus.clear();
      setActionStatuses(new Map());
    }
    if (evt.chatId && !currentChatId) {
      setCurrentChatId(evt.chatId);
      context.hasChatRecord = true;
      const title = (pendingFirstTitle || 'New chat').slice(0, 80);
      const now = Date.now();
      upsertChatMeta({ id: evt.chatId, title, createdAt: now, updatedAt: now });
      saveChat({ id: evt.chatId, messages: [], agentId });
      saveCurrentChatId(evt.chatId);
    }
    return;
  }

  if (evt?.type === 'reasoning') {
    const chunk = String(evt.text ?? '');
    setMessages(prev => prev.map(m => (m.id === assistantId && m.role === 'assistant' ? { ...m, reasoning: (m.reasoning ?? '') + chunk } : m)));
    return;
  }

  if (evt?.type === 'tool-call') {
    // Handle MCP tool calls - mark as running
    const toolName = evt.toolName;
    const args = evt.args;
    setMessages(prev => prev.map(m =>
      m.id === assistantId && m.role === 'assistant' ? {
        ...m,
        mcpToolCalls: [...((m as any).mcpToolCalls || []), { toolName, args, timestamp: Date.now(), status: 'running' }]
      } : m
    ));
    return;
  }

  if (evt?.type === 'tool-result') {
    // Handle MCP tool results - mark tool as completed
    const toolName = evt.toolName;
    const result = evt.result;
    setMessages(prev => prev.map(m =>
      m.id === assistantId && m.role === 'assistant' ? {
        ...m,
        mcpToolCalls: ((m as any).mcpToolCalls || []).map((call: any) =>
          call.toolName === toolName ? { ...call, status: 'completed' } : call
        ),
        mcpToolResults: {...((m as any).mcpToolResults || {}), [toolName]: result}
      } : m
    ));
    return;
  }

  if (evt?.type === 'partial' || evt?.type === 'final') {
    const val = evt.value;
    if (val && Array.isArray(val.items)) {
      setMessages(prev => prev.map(m => (m.id === assistantId && m.role === 'assistant' ? { ...m, items: val.items } : m)));
      // Process actions based on trigger and executeOnStream preference
      processActions(val.items, evt.type === 'partial' ? 'partial' : 'final');
    }
    if (evt?.type === 'final') {
      setMessages(prev => prev.map(m => (m.id === assistantId && m.role === 'assistant' ? { ...m, reasoningOpen: false } : m)));
    }
    return;
  }

  if (evt?.type === 'usage') {
    const tokens = evt?.value?.reasoningTokens;
    if (typeof tokens === 'number') {
      setMessages(prev => prev.map(m => (m.id === assistantId && m.role === 'assistant' ? { ...m, reasoningTokens: tokens } : m)));
    }
    return;
  }

  if (evt?.type === 'error') {
    context.setError(String(evt.error ?? 'Unknown error'));
    return;
  }
}
