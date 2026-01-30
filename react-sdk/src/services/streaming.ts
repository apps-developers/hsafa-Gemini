/**
 * Streaming service for handling agent communication
 */

import { ChatMessage, Attachment } from '../types/chat';
import { joinUrl } from '../utils/file';
import { genId } from '../utils/time';

export interface StreamingOptions {
  baseUrl?: string;
  agentId: string;
  onMessage: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  onError: (error: string) => void;
  onStreaming: (streaming: boolean) => void;
  onMeta: (meta: any) => void;
  processActions: (items: any[], trigger: 'partial' | 'final') => void;
  signal?: AbortSignal;
}

export class StreamingService {
  private buildMessageHistory(messages: ChatMessage[]): any[] {
    const history: any[] = [];
    const processedMessages = new Set<string>();

    messages.forEach(m => {
      if (m.role === 'user') {
        const previousAttachments = Array.isArray(m.attachments) ? m.attachments : [];
        const baseText = typeof m.content === 'string' ? m.content : (m.text ?? '');
        const content = Array.isArray(m.content)
          ? m.content
          : this.buildUserContent(baseText, previousAttachments);
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

  private buildUserContent(text: string, attachments: Attachment[]): any[] {
    const parts: any[] = [];
    const t = (text || '').trim();
    if (t) parts.push({ type: 'text', text: t });
    for (const a of (attachments || [])) {
      const mt = a.mimeType || 'application/octet-stream';
      if (mt.startsWith('image/')) {
        parts.push({ type: 'image', image: new URL(a.url), mediaType: mt });
      } else {
        parts.push({ type: 'file', data: a.url, mediaType: mt, name: a.name });
      }
    }
    return parts;
  }

  async sendMessage(
    userText: string,
    attachments: Attachment[],
    messages: ChatMessage[],
    currentChatId: string | null,
    options: StreamingOptions
  ): Promise<{ userId: string; assistantId: string }> {
    const userId = genId();
    const assistantId = genId();
    
    const newUser: ChatMessage = { 
      id: userId, 
      role: 'user', 
      content: userText,
      text: userText, 
      attachments: [...attachments] 
    };
    const newAssistant: ChatMessage = { 
      id: assistantId, 
      role: 'assistant', 
      items: [], 
      reasoning: '', 
      reasoningOpen: false, 
      mcpToolCalls: [], 
      mcpToolResults: {} 
    };
    
    const newMessages: ChatMessage[] = [...messages, newUser, newAssistant];
    options.onMessage(newMessages);

    // Build history
    const history = this.buildMessageHistory(messages);
    
    // Add current user message with attachments
    const userContent = this.buildUserContent(userText, attachments);
    history.push({ role: 'user' as const, content: userContent });

    const payload = {
      prompt: userText,
      chatId: currentChatId ?? undefined,
      messages: history,
    };

    // Update messages with request params
    options.onMessage(newMessages.map(m => 
      (m.id === assistantId || m.id === userId) 
        ? { ...m, requestParams: payload } as any 
        : m
    ));

    options.onStreaming(true);

    try {
      const res = await fetch(joinUrl(options.baseUrl, `/api/run/${options.agentId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: options.signal,
      });

      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Request failed with ${res.status}`);
      }

      await this.processStream(res.body, assistantId, options);
      
    } catch (e: any) {
      options.onError(String(e?.message ?? e));
    } finally {
      options.onStreaming(false);
    }

    return { userId, assistantId };
  }

  private async processStream(
    body: ReadableStream<Uint8Array>,
    assistantId: string,
    options: StreamingOptions
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      let idx;
      
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        
        try {
          const evt = JSON.parse(line);
          await this.handleStreamEvent(evt, assistantId, options);
        } catch {
          // ignore malformed lines
        }
      }
    }
  }

  private async handleStreamEvent(evt: any, assistantId: string, options: StreamingOptions): Promise<void> {
    if (evt?.type === 'meta') {
      options.onMeta(evt);
      return;
    }

    if (evt?.type === 'reasoning') {
      const chunk = String(evt.text ?? '');
      options.onMessage(prevMessages => 
        prevMessages.map(m => 
          m.id === assistantId && m.role === 'assistant' 
            ? { ...m, reasoning: (m.reasoning ?? '') + chunk } 
            : m
        )
      );
      return;
    }

    if (evt?.type === 'tool-call') {
      const toolName = evt.toolName;
      const args = evt.args;
      options.onMessage(prevMessages => 
        prevMessages.map(m =>
          m.id === assistantId && m.role === 'assistant' ? {
            ...m,
            mcpToolCalls: [...((m as any).mcpToolCalls || []), { toolName, args, timestamp: Date.now(), status: 'running' }]
          } : m
        )
      );
      return;
    }

    if (evt?.type === 'tool-result') {
      const toolName = evt.toolName;
      const result = evt.result;
      options.onMessage(prevMessages => 
        prevMessages.map(m =>
          m.id === assistantId && m.role === 'assistant' ? {
            ...m,
            mcpToolCalls: ((m as any).mcpToolCalls || []).map((call: any) =>
              call.toolName === toolName ? { ...call, status: 'completed' } : call
            ),
            mcpToolResults: {...((m as any).mcpToolResults || {}), [toolName]: result}
          } : m
        )
      );
      return;
    }

    if (evt?.type === 'partial' || evt?.type === 'final') {
      const val = evt.value;
      if (val && Array.isArray(val.items)) {
        options.onMessage(prevMessages => 
          prevMessages.map(m => 
            m.id === assistantId && m.role === 'assistant' 
              ? { ...m, items: val.items } 
              : m
          )
        );
        // Process actions based on trigger and executeOnStream preference
        options.processActions(val.items, evt.type === 'partial' ? 'partial' : 'final');
      }
      if (evt?.type === 'final') {
        options.onMessage(prevMessages => 
          prevMessages.map(m => 
            m.id === assistantId && m.role === 'assistant' 
              ? { ...m, reasoningOpen: false } 
              : m
          )
        );
      }
      return;
    }

    if (evt?.type === 'usage') {
      const tokens = evt?.value?.reasoningTokens;
      if (typeof tokens === 'number') {
        options.onMessage(prevMessages => 
          prevMessages.map(m => 
            m.id === assistantId && m.role === 'assistant' 
              ? { ...m, reasoningTokens: tokens } 
              : m
          )
        );
      }
      return;
    }

    if (evt?.type === 'error') {
      options.onError(String(evt.error ?? 'Unknown error'));
      return;
    }
  }

  async editMessage(
    messageId: string,
    newText: string,
    messages: ChatMessage[],
    currentChatId: string | null,
    options: StreamingOptions
  ): Promise<void> {
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1 || messages[idx].role !== 'user') {
      return;
    }

    const base = messages.slice(0, idx);
    const updatedUser: ChatMessage = { id: messageId, role: 'user', content: newText, text: newText };
    const assistantId = genId();
    const newMessages: ChatMessage[] = [
      ...base,
      updatedUser,
      { id: assistantId, role: 'assistant', items: [], reasoning: '', reasoningOpen: false, mcpToolCalls: [], mcpToolResults: {} },
    ];
    
    options.onMessage(newMessages);
    options.onStreaming(true);

    try {
      const history = this.buildMessageHistory(base);
      history.push({ role: 'user' as const, content: newText });
      
      const payload = {
        prompt: newText,
        chatId: currentChatId ?? undefined,
        messages: history,
      };

      options.onMessage(newMessages.map(m => 
        (m.id === assistantId || m.id === messageId) 
          ? { ...m, requestParams: payload } as any 
          : m
      ));

      const res = await fetch(joinUrl(options.baseUrl, `/api/run/${options.agentId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: options.signal,
      });

      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Request failed with ${res.status}`);
      }

      await this.processStream(res.body, assistantId, options);
      
    } catch (e: any) {
      options.onError(String(e?.message ?? e));
    } finally {
      options.onStreaming(false);
    }
  }
}
