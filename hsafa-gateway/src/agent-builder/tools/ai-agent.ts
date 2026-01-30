import { createAgentUIStream, type ToolExecutionOptions } from 'ai';
import type { AiAgentExecution } from '../types';
import { validateAgentConfig } from '../parser';
import { buildAgent } from '../builder';

function extractTextFromModelMessageContent(content: unknown): string | null {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    const texts: string[] = [];

    for (const part of content) {
      if (typeof part === 'string') {
        texts.push(part);
        continue;
      }

      if (part && typeof part === 'object' && 'text' in (part as Record<string, unknown>)) {
        const t = (part as Record<string, unknown>).text;
        if (typeof t === 'string') texts.push(t);
      }
    }

    const joined = texts.join('');
    return joined.length > 0 ? joined : null;
  }

  if (content && typeof content === 'object' && 'text' in (content as Record<string, unknown>)) {
    const t = (content as Record<string, unknown>).text;
    return typeof t === 'string' ? t : null;
  }

  return null;
}

function modelMessagesToUiMessages(messages: ToolExecutionOptions['messages'], idPrefix: string): unknown[] {
  const uiMessages: unknown[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as any;

    if (msg && typeof msg === 'object' && Array.isArray(msg.parts) && typeof msg.role === 'string') {
      uiMessages.push(msg);
      continue;
    }

    const role = msg?.role;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') continue;

    const text = extractTextFromModelMessageContent(msg?.content);
    if (!text) continue;

    uiMessages.push({
      id: `${idPrefix}-ctx-${i}`,
      role,
      parts: [{ type: 'text', text }],
    });
  }

  return uiMessages;
}

export function executeAiAgent(
  execution: AiAgentExecution,
  input: unknown,
  options?: ToolExecutionOptions
): Promise<unknown> | AsyncIterable<unknown> {
  if (execution.stream) {
    return streamAiAgent(execution, input, options);
  }

  return runAiAgent(execution, input, options);
}

async function runAiAgent(
  execution: AiAgentExecution,
  input: unknown,
  options?: ToolExecutionOptions
): Promise<unknown> {
  const started = Date.now();
  const config = validateAgentConfig(execution.agentConfig);
  const { agent } = await buildAgent({ config });

  const includeContext = execution.includeContext ?? false;
  const timeoutMs = execution.timeout ?? 30000;

  const prompt =
    input && typeof input === 'object' && 'prompt' in (input as Record<string, unknown>)
      ? String((input as Record<string, unknown>).prompt ?? '')
      : '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.abortSignal) {
    if (options.abortSignal.aborted) controller.abort();
    else options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const signal = controller.signal;

  try {
    type GenerateArgs = Parameters<typeof agent.generate>[0];

    // Determine the messages to send to the agent
    const contextMessages =
      includeContext && options?.messages ? (options.messages as any[]) : [];
    
    // Construct the user message object for the "messages" array return value
    const userMessage = {
      id: options?.toolCallId || String(Date.now()), // Or generate a new ID
      role: 'user',
      parts: [{ type: 'text', text: prompt }],
    };

    const generateArgs: GenerateArgs = includeContext
      ? ({
          prompt: [
            ...contextMessages,
            { role: 'user', content: prompt },
          ],
          abortSignal: signal,
        } as unknown as GenerateArgs)
      : ({ prompt, abortSignal: signal } as unknown as GenerateArgs);

    const result = await agent.generate(generateArgs);

    // Transform steps into UI Message Parts
    const parts: any[] = [];
    
    if (result.steps) {
      for (const step of result.steps) {
        parts.push({ type: 'step-start' });

        // Handle tool calls
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const toolCall of step.toolCalls) {
            // Find corresponding result if available (assuming sequential steps or result access)
            // Note: toolResults are usually available in the step or we can infer them.
            // In 'ai' SDK, step usually contains toolCalls. The definition of a "step" in ToolLoopAgent
                // might separate the call and the result into different steps or same step? 
            // Actually, toolCalls are in one step, results might be in the next? 
            // Wait, standard StepResult has `toolCalls` and `toolResults`.
            
            // Let's assume standard StepResult structure where toolResults might be present.
            // If they are not in the SAME step, we might need to look ahead. 
            // However, typical `ai` SDK `generateText` returns steps where each step has the *model's* output (tool calls) 
            // and the *subsequent* tool execution results? 
            // Actually, `steps` array contains the turns. 
            // Let's check if we can access tool results easily.
            // `step.toolResults` should exist if the tools were executed.
            
            // Wait, checking `ToolLoopAgent` result type.
            // It returns `GenerateTextResult`.
            // `GenerateTextResult` has `steps`. Each step has `toolCalls` and `toolResults`.
            
            // Finding the result for this tool call
            // Since we are iterating steps, we should check `step.toolResults`.
             const toolResult = (step as any).toolResults?.find((r: any) => r.toolCallId === toolCall.toolCallId);

             parts.push({
               type: `tool-${toolCall.toolName}`,
               toolCallId: toolCall.toolCallId,
               state: 'output-available', // Since this is a completed run
               input: (toolCall as any).args,
               output: toolResult?.result,
               // We can add validation or error handling if result is missing/error
             });
          }
        }

        // Handle text
        if (step.text) {
             parts.push({
               type: 'text',
               text: step.text,
               state: 'done',
             });
        }
      }
    } else {
        // Fallback if no steps (shouldn't happen with ToolLoopAgent, but for safety)
        parts.push({
            type: 'text',
            text: result.text,
            state: 'done'
        });
    }

    // Construct the assistant message
    const assistantMessage = {
      id: String(Date.now() + 1), // Generate distinct ID
      role: 'assistant',
      parts,
    };

    return {
      message: assistantMessage,
      messages: [...contextMessages, userMessage, assistantMessage],
      isAbort: false,
      isDisconnect: false,
      isError: false,
      finishReason: result.finishReason,
      // Leaving original fields just in case? Or replacing entirely? 
      // User request implies replacing the shape.
      // But I should probably keep `success` wrapper if the caller expects it?
      // The caller is `ai-agent` tool.
      // The tool result is `unknown`.
      // The user wants the response of the tool to be this shape.
      // So I will return strictly the requested shape.
    };
  } catch (error: any) {
      // Return error state if failed?
     return {
        isError: true,
        error: error.message,
         // We might want to return partial messages if possible, but here we just fail.
     };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function* streamAiAgent(
  execution: AiAgentExecution,
  input: unknown,
  options?: ToolExecutionOptions
): AsyncIterable<unknown> {
  const config = validateAgentConfig(execution.agentConfig);
  const { agent } = await buildAgent({ config });
  const includeContext = execution.includeContext ?? false;
  const timeoutMs = execution.timeout ?? 30000;

  const prompt =
    input && typeof input === 'object' && 'prompt' in (input as Record<string, unknown>)
      ? String((input as Record<string, unknown>).prompt ?? '')
      : '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.abortSignal) {
    if (options.abortSignal.aborted) controller.abort();
    else options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const signal = controller.signal;

  try {
    const idPrefix = options?.toolCallId || String(Date.now());
    const contextUiMessages =
      includeContext && options?.messages && options.messages.length > 0
        ? modelMessagesToUiMessages(options.messages, idPrefix)
        : [];

    const uiStream = await createAgentUIStream({
      agent,
      uiMessages: [
        ...contextUiMessages,
        {
          id: `${idPrefix}-prompt`,
          role: 'user',
          parts: [{ type: 'text', text: prompt }],
        },
      ],
      abortSignal: signal,
      timeout: timeoutMs,
      sendReasoning: true,
      sendSources: true,
      sendStart: true,
      sendFinish: true,
    });

    for await (const chunk of uiStream) {
      yield chunk;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
