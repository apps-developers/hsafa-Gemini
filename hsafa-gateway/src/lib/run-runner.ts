import { Prisma } from '@prisma/client';
import { convertToModelMessages } from 'ai';
import { parse as parsePartialJson, STR, OBJ, ARR, NUM, BOOL, NULL } from 'partial-json';
import { prisma } from './db.js';
import { createEmitEvent, handleRunError, type EmitEventFn } from './run-events.js';
import { buildAgent, AgentBuildError } from '../agent-builder/builder.js';
import type { AgentConfig } from '../agent-builder/types.js';
import { emitSmartSpaceEvent } from './smartspace-events.js';
import { createSmartSpaceMessage } from './smartspace-db.js';
import { toUiMessageFromSmartSpaceMessage, toAiSdkUiMessages } from './message-converters.js';
import { triggerAgentsInSmartSpace } from './agent-trigger.js';

// Allow all partial JSON types for tool input streaming
const PARTIAL_JSON_ALLOW = STR | OBJ | ARR | NUM | BOOL | NULL;

/**
 * Run Runner - Full Streaming
 * 
 * Streams ALL AI response events to Redis/SmartSpace:
 * - Text: `text-start` / `text-delta` / `text-end`
 * - Reasoning: `reasoning-start` / `reasoning-delta` / `reasoning-end`
 * - Tools: `tool-input-start` / `tool-input-delta` / `tool-input-available` / `tool-output-available`
 * - Lifecycle: `start` / `finish` / `run.started` / `run.completed` / `run.failed`
 * 
 * Node.js clients can subscribe to SmartSpace stream, see tool-input-available,
 * execute tools locally, and POST results back to /tool-results endpoint.
 */

export async function executeRun(runId: string): Promise<void> {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      id: true,
      smartSpaceId: true,
      agentEntityId: true,
      agentId: true,
      triggeredById: true,
      status: true,
      startedAt: true,
    },
  });

  if (!run) {
    return;
  }

  const { emitEvent: emitRunEvent } = await createEmitEvent(runId);

  // Event context includes entity info for multi-entity support
  // All subscribers can see which entity (agent) produced each event
  const eventContext = {
    runId,
    entityId: run.agentEntityId,
    entityType: 'agent' as const,
    agentEntityId: run.agentEntityId, // backwards compat
  };

  const emitEvent: EmitEventFn = async (type, payload) => {
    await emitRunEvent(type, payload);
    try {
      await emitSmartSpaceEvent(run.smartSpaceId, type, payload, eventContext);
    } catch (err) {
      console.error(`[run-runner] emitSmartSpaceEvent FAILED for ${type}:`, err);
    }
  };

  try {
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'canceled') {
      return;
    }

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: 'running',
        startedAt: run.startedAt ?? new Date(),
      },
    });

    await emitEvent('run.started', { status: 'running' });

    const agent = await prisma.agent.findUnique({
      where: { id: run.agentId },
      select: { configJson: true },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const config = agent.configJson as unknown as AgentConfig;

    const built = await buildAgent({ config });

    const messages = await prisma.smartSpaceMessage.findMany({
      where: { smartSpaceId: run.smartSpaceId },
      orderBy: { seq: 'asc' },
      take: 50,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
      },
    });

    const uiMessages = messages.map(toUiMessageFromSmartSpaceMessage);
    const aiSdkUiMessages = toAiSdkUiMessages(uiMessages as any);
    const modelMessages = await convertToModelMessages(aiSdkUiMessages as any);

    const streamResult = await built.agent.stream({ messages: modelMessages });

    // State for streaming
    const messageId = `msg-${runId}-${Date.now()}`;
    let textId: string | null = null;
    let reasoningId: string | null = null;
    const toolArgsAccumulator = new Map<string, string>(); // toolCallId -> accumulated args text
    const toolParts: Array<{ type: string; [key: string]: unknown }> = [];

    await emitEvent('start', { messageId });

    // Stream ALL events to Redis
    for await (const part of streamResult.fullStream) {
      const t = part.type as string;

      // Text streaming
      if (t === 'text-delta') {
        const delta = (part as any).text || (part as any).textDelta || '';
        if (!delta) continue;
        if (!textId) {
          textId = `text-${messageId}-${Date.now()}`;
          await emitEvent('text-start', { id: textId });
        }
        await emitEvent('text-delta', { id: textId, delta });
      }
      // Reasoning streaming
      else if (t === 'reasoning') {
        const delta = (part as any).text || '';
        if (!delta) continue;
        if (!reasoningId) {
          reasoningId = `reasoning-${messageId}-${Date.now()}`;
          await emitEvent('reasoning-start', { id: reasoningId });
        }
        await emitEvent('reasoning-delta', { id: reasoningId, delta });
      }
      // Tool call streaming start
      else if (t === 'tool-call-streaming-start') {
        const { toolCallId, toolName } = part as any;
        toolArgsAccumulator.set(toolCallId, '');
        await emitEvent('tool-input-start', { toolCallId, toolName });
      }
      // Tool call args delta (streaming structured JSON partials)
      else if (t === 'tool-call-delta') {
        const { toolCallId, argsTextDelta } = part as any;
        if (argsTextDelta) {
          const accumulated = (toolArgsAccumulator.get(toolCallId) || '') + argsTextDelta;
          toolArgsAccumulator.set(toolCallId, accumulated);
          
          // Parse partial JSON using partial-json library
          // This gives us valid partial objects even from incomplete JSON
          let partialInput: unknown = null;
          try {
            partialInput = parsePartialJson(accumulated, PARTIAL_JSON_ALLOW);
          } catch {
            // Malformed JSON - emit null for partialInput
          }
          
          // Emit structured partial - clients always get valid partial JSON
          await emitEvent('tool-input-delta', {
            toolCallId,
            delta: argsTextDelta,        // raw text delta
            accumulated,                  // raw accumulated text
            partialInput,                 // VALID partial JSON object
          });
        }
      }
      // Tool call complete - full input available
      else if (t === 'tool-call') {
        const { toolCallId, toolName, args } = part as any;
        
        // Close text/reasoning blocks if open
        if (textId) { await emitEvent('text-end', { id: textId }); textId = null; }
        if (reasoningId) { await emitEvent('reasoning-end', { id: reasoningId }); reasoningId = null; }
        
        // Emit full structured input - clients can execute this tool
        await emitEvent('tool-input-available', { toolCallId, toolName, input: args });
        
        // Track for final message
        toolParts.push({ type: 'tool-call', toolCallId, toolName, args });
      }
      // Tool result - output available
      else if (t === 'tool-result') {
        const { toolCallId, toolName, result } = part as any;
        await emitEvent('tool-output-available', { toolCallId, toolName, output: result });
        toolParts.push({ type: 'tool-result', toolCallId, toolName, result });
      }
      // Stream finish
      else if (t === 'finish') {
        if (textId) await emitEvent('text-end', { id: textId });
        if (reasoningId) await emitEvent('reasoning-end', { id: reasoningId });
      }
      // Error
      else if (t === 'error') {
        const err = (part as any).error;
        await emitEvent('stream.error', { error: err instanceof Error ? err.message : String(err) });
      }
      // Other events (sources, files, steps) - emit as-is for full visibility
      else if (t === 'source-url' || t === 'source-document') {
        await emitEvent(t, part as any);
      }
    }

    // Use AI SDK's built-in accumulation (no manual tracking needed)
    const finalText = await streamResult.text;
    const finalReasoning = await streamResult.reasoning;

    // Build final message using SDK values + tool parts
    const finalParts: Array<{ type: string; [key: string]: unknown }> = [];
    if (finalReasoning) {
      finalParts.push({ type: 'reasoning', text: finalReasoning });
    }
    if (finalText) {
      finalParts.push({ type: 'text', text: finalText });
    }
    // Add tool calls and results to message parts
    finalParts.push(...toolParts);

    await prisma.run.update({
      where: { id: runId },
      data: { status: 'completed', completedAt: new Date() },
    });

    const assistantMessage = {
      id: messageId,
      role: 'assistant',
      parts: finalParts.length > 0 ? finalParts : [{ type: 'text', text: finalText }],
    };

    await createSmartSpaceMessage({
      smartSpaceId: run.smartSpaceId,
      entityId: run.agentEntityId,
      role: 'assistant',
      content: finalText,
      metadata: { uiMessage: assistantMessage } as unknown as Prisma.InputJsonValue,
      runId,
    });

    await emitSmartSpaceEvent(
      run.smartSpaceId,
      'smartSpace.message',
      { message: assistantMessage },
      { runId, agentEntityId: run.agentEntityId }
    );

    await emitEvent('message.assistant', { message: assistantMessage });
    
    // Emit finish with full message
    await emitEvent('finish', { messageId, message: assistantMessage });
    
    await emitEvent('run.completed', { status: 'completed', text: finalText });

    // Trigger other agents in the SmartSpace (agent message triggers other agents)
    // Get triggerDepth from run metadata for loop protection
    const runMetadata = await prisma.run.findUnique({
      where: { id: runId },
      select: { metadata: true },
    });
    const triggerDepth = (runMetadata?.metadata as any)?.triggerDepth ?? 0;
    
    await triggerAgentsInSmartSpace({
      smartSpaceId: run.smartSpaceId,
      senderEntityId: run.agentEntityId,
      triggerDepth,
    });
  } catch (error) {
    if (error instanceof AgentBuildError) {
      await emitRunEvent('agent.build.error', { error: error.message });
    }

    await handleRunError(runId, error, emitRunEvent);

    try {
      await emitSmartSpaceEvent(run.smartSpaceId, 'run.failed', {
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // ignore
    }
  }
}
