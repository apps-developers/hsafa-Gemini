import type { ToolExecutionOptions } from 'ai';
import type { AiAgentExecution } from '../types';
import { validateAgentConfig } from '../parser';
import { buildAgent } from '../builder';

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

    const generateArgs: GenerateArgs = includeContext
      ? ({
          prompt: [
            ...(options?.messages ?? []),
            { role: 'user', content: prompt },
          ],
          abortSignal: signal,
        } as unknown as GenerateArgs)
      : ({ prompt, abortSignal: signal } as unknown as GenerateArgs);

    const result = await agent.generate(generateArgs);

    return {
      success: true,
      agentId: config.agent.name,
      response: result.text,
      duration: Date.now() - started,
      includeContext,
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

  let response = '';

  try {
    type StreamArgs = Parameters<typeof agent.stream>[0];

    const streamArgs: StreamArgs = includeContext
      ? ({
          prompt: [
            ...(options?.messages ?? []),
            { role: 'user', content: prompt },
          ],
          abortSignal: signal,
        } as unknown as StreamArgs)
      : ({ prompt, abortSignal: signal } as unknown as StreamArgs);

    const streamResult = await agent.stream(streamArgs);

    const uiStream = streamResult.toUIMessageStream({
      sendReasoning: true,
      sendSources: true,
      sendStart: true,
      sendFinish: true,
    });

    for await (const chunk of uiStream as AsyncIterable<unknown>) {
      const chunkObj = chunk && typeof chunk === 'object' ? (chunk as Record<string, unknown>) : undefined;
      const chunkType = chunkObj?.type;
      if (chunkType === 'text-delta') {
        const d = String(chunkObj?.delta ?? '');
        if (d) response += d;
      }

      yield {
        success: true,
        agentId: config.agent.name,
        status: 'streaming',
        response,
        duration: Date.now() - started,
        includeContext,
        done: false,
        chunk,
      };
    }

    // Final tool result (last yield is the one the model will receive).
    yield {
      success: true,
      agentId: config.agent.name,
      status: 'done',
      response,
      duration: Date.now() - started,
      includeContext,
      done: true,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
