import { Prisma } from '@prisma/client';
import { convertToModelMessages } from 'ai';
import { parse as parsePartialJson, STR, OBJ, ARR, NUM, BOOL, NULL } from 'partial-json';
import { prisma } from './db.js';
import { createEmitEvent, handleRunError, type EmitEventFn } from './run-events.js';
import { buildAgent, AgentBuildError } from '../agent-builder/builder.js';
import { closeMCPClients } from '../agent-builder/mcp-resolver.js';
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
      metadata: true,
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

    const built = await buildAgent({
      config,
      runContext: {
        runId,
        agentEntityId: run.agentEntityId,
        smartSpaceId: run.smartSpaceId,
        agentId: run.agentId,
      },
    });

    // Load messages WITH entity info so we can tag sender identity
    const messages = await prisma.smartSpaceMessage.findMany({
      where: { smartSpaceId: run.smartSpaceId },
      orderBy: { seq: 'asc' },
      take: 50,
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        entityId: true,
        entity: { select: { displayName: true, type: true } },
      },
    });

    // Load space members + triggering entity for run context
    const [spaceMembers, smartSpace, triggeredByEntity] = await Promise.all([
      prisma.smartSpaceMembership.findMany({
        where: { smartSpaceId: run.smartSpaceId },
        include: { entity: { select: { id: true, displayName: true, type: true } } },
      }),
      prisma.smartSpace.findUnique({
        where: { id: run.smartSpaceId },
        select: { name: true },
      }),
      run.triggeredById
        ? prisma.entity.findUnique({
            where: { id: run.triggeredById },
            select: { displayName: true, type: true },
          })
        : null,
    ]);

    // Build run context system message
    const contextParts: string[] = [];

    if (smartSpace?.name) {
      contextParts.push(`You are operating in SmartSpace "${smartSpace.name}".`);
    }

    if (triggeredByEntity) {
      const name = triggeredByEntity.displayName || 'Unknown';
      contextParts.push(`This run was triggered by a message from ${name} (${triggeredByEntity.type}).`);
    }

    if (spaceMembers.length > 0) {
      const memberList = spaceMembers
        .map((m) => `${m.entity.displayName || 'Unknown'} (${m.entity.type})`)
        .join(', ');
      contextParts.push(`Members of this space: ${memberList}.`);
    }

    contextParts.push('Messages from other participants are prefixed with [Name] for identification. Do NOT prefix your own responses with your name or any tag.');

    // Tag messages with sender identity
    // - user/system messages: always tagged
    // - assistant messages from OTHER agents: tagged so this agent can tell them apart
    // - assistant messages from THIS agent: not tagged (the agent knows those are its own)
    const taggedUiMessages = messages.map((m) => {
      const base = toUiMessageFromSmartSpaceMessage(m);
      const isOwnMessage = m.entityId === run.agentEntityId;
      const shouldTag =
        (m.role === 'user' || m.role === 'system' || (m.role === 'assistant' && !isOwnMessage))
        && m.entity?.displayName;

      if (shouldTag) {
        const senderTag = `[${m.entity!.displayName}]`;
        if (Array.isArray(base.parts)) {
          const parts = base.parts.map((p: any, i: number) => {
            if (i === 0 && p.type === 'text' && typeof p.text === 'string') {
              return { ...p, text: `${senderTag} ${p.text}` };
            }
            return p;
          });
          return { ...base, parts };
        }
      }
      return base;
    });

    const aiSdkUiMessages = toAiSdkUiMessages(taggedUiMessages as any);

    // Prepend run context as a system message if we have context
    if (contextParts.length > 0) {
      aiSdkUiMessages.unshift({
        role: 'system',
        parts: [{ type: 'text', text: contextParts.join('\n') }],
      });
    }

    const modelMessages = await convertToModelMessages(aiSdkUiMessages as any);

    const streamResult = await built.agent.stream({ messages: modelMessages });

    // State for streaming
    const messageId = `msg-${runId}-${Date.now()}`;
    let textId: string | null = null;
    let reasoningId: string | null = null;
    let currentReasoningText = ''; // Current reasoning block accumulator
    let currentTextContent = '';   // Current text block accumulator
    const toolArgsAccumulator = new Map<string, string>(); // toolCallId -> accumulated args text
    const orderedParts: Array<{ type: string; [key: string]: unknown }> = [];

    // Flush current reasoning block into orderedParts
    const flushReasoning = () => {
      if (currentReasoningText) {
        orderedParts.push({ type: 'reasoning', text: currentReasoningText });
        currentReasoningText = '';
      }
    };
    // Flush current text block into orderedParts
    const flushText = () => {
      if (currentTextContent) {
        orderedParts.push({ type: 'text', text: currentTextContent });
        currentTextContent = '';
      }
    };

    await emitEvent('start', { messageId });

    // Stream ALL events to Redis
    for await (const part of streamResult.fullStream) {
      const t = part.type as string;

      // Text streaming (AI SDK v6: text-delta has .text)
      if (t === 'text-delta') {
        const delta = (part as any).text || (part as any).textDelta || '';
        if (!delta) continue;
        if (!textId) {
          textId = `text-${messageId}-${Date.now()}`;
          await emitEvent('text-start', { id: textId });
        }
        currentTextContent += delta;
        await emitEvent('text-delta', { id: textId, delta });
      }
      else if (t === 'text-end') {
        if (textId) { await emitEvent('text-end', { id: textId }); textId = null; }
        flushText();
      }
      // Reasoning streaming (AI SDK v6: reasoning-delta has .text)
      else if (t === 'reasoning' || t === 'reasoning-delta') {
        const delta = (part as any).text || (part as any).textDelta || (part as any).delta || '';
        if (!delta) continue;
        if (!reasoningId) {
          reasoningId = `reasoning-${messageId}-${Date.now()}`;
          await emitEvent('reasoning-start', { id: reasoningId });
        }
        currentReasoningText += delta;
        await emitEvent('reasoning-delta', { id: reasoningId, delta });
      }
      else if (t === 'reasoning-end') {
        if (reasoningId) { await emitEvent('reasoning-end', { id: reasoningId }); reasoningId = null; }
        flushReasoning();
      }
      // Tool input streaming start (AI SDK v6: tool-input-start with .id, .toolName)
      else if (t === 'tool-input-start') {
        const { id, toolName } = part as any;
        toolArgsAccumulator.set(id, '');
        await emitEvent('tool-input-start', { toolCallId: id, toolName });
      }
      // Tool input args delta (AI SDK v6: tool-input-delta with .id, .delta)
      else if (t === 'tool-input-delta') {
        const { id, delta: argsDelta } = part as any;
        if (argsDelta) {
          const accumulated = (toolArgsAccumulator.get(id) || '') + argsDelta;
          toolArgsAccumulator.set(id, accumulated);
          
          let partialInput: unknown = null;
          try {
            partialInput = parsePartialJson(accumulated, PARTIAL_JSON_ALLOW);
          } catch {
            // Malformed JSON - emit null for partialInput
          }
          
          await emitEvent('tool-input-delta', {
            toolCallId: id,
            delta: argsDelta,
            accumulated,
            partialInput,
          });
        }
      }
      // Tool input end
      else if (t === 'tool-input-end') {
        // No action needed, tool-call follows
      }
      // Tool call complete (AI SDK v6: .input instead of .args)
      else if (t === 'tool-call') {
        const { toolCallId, toolName, input } = part as any;
        
        // Close & flush text/reasoning blocks if open (preserves order)
        if (textId) { await emitEvent('text-end', { id: textId }); textId = null; }
        flushText();
        if (reasoningId) { await emitEvent('reasoning-end', { id: reasoningId }); reasoningId = null; }
        flushReasoning();
        
        await emitEvent('tool-input-available', { toolCallId, toolName, input });
        
        orderedParts.push({ type: 'tool-call', toolCallId, toolName, args: input });
      }
      // Tool result (AI SDK v6: .output instead of .result)
      else if (t === 'tool-result') {
        const { toolCallId, toolName, output } = part as any;
        await emitEvent('tool-output-available', { toolCallId, toolName, output });
        orderedParts.push({ type: 'tool-result', toolCallId, toolName, result: output });
      }
      // Tool error
      else if (t === 'tool-error') {
        const { toolCallId, toolName, error } = part as any;
        console.error(`[Run ${runId}] Tool error: ${toolName}`, error);
        await emitEvent('tool-error', { toolCallId, toolName, error: error instanceof Error ? error.message : String(error) });
      }
      // Stream finish — flush any remaining open blocks
      else if (t === 'finish') {
        if (textId) { await emitEvent('text-end', { id: textId }); textId = null; }
        flushText();
        if (reasoningId) { await emitEvent('reasoning-end', { id: reasoningId }); reasoningId = null; }
        flushReasoning();
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

    // Clean up MCP clients after streaming completes
    if (built.mcpClients.length > 0) {
      await closeMCPClients(built.mcpClients);
    }

    // Flush any remaining blocks that weren't closed by a finish event
    flushReasoning();
    flushText();

    // orderedParts now contains all parts in correct streaming order
    const finalParts = orderedParts;
    const finalText = finalParts.find(p => p.type === 'text')?.text as string | undefined;

    await prisma.run.update({
      where: { id: runId },
      data: { status: 'completed', completedAt: new Date() },
    });

    const assistantMessage = {
      id: messageId,
      role: 'assistant',
      parts: finalParts.length > 0 ? finalParts : [{ type: 'text', text: finalText ?? '' }],
    };

    const dbMessage = await createSmartSpaceMessage({
      smartSpaceId: run.smartSpaceId,
      entityId: run.agentEntityId,
      role: 'assistant',
      content: finalText,
      metadata: { uiMessage: assistantMessage } as unknown as Prisma.InputJsonValue,
      runId,
    });

    // Use DB record ID so SSE event message IDs match messages.list() results
    const emittedMessage = { ...assistantMessage, id: dbMessage.id };

    await emitSmartSpaceEvent(
      run.smartSpaceId,
      'smartSpace.message',
      { message: emittedMessage },
      { runId, agentEntityId: run.agentEntityId }
    );

    await emitEvent('message.assistant', { message: emittedMessage });
    
    // Emit finish with full message
    await emitEvent('finish', { messageId, message: assistantMessage });
    
    await emitEvent('run.completed', { status: 'completed', text: finalText });

    // Trigger other agents in the SmartSpace (agent message triggers other agents)
    const triggerDepth = (run.metadata as any)?.triggerDepth ?? 0;
    
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
