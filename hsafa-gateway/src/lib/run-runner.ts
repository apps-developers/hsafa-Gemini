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

    const isGoToSpaceRun = !!(run.metadata as any)?.originSmartSpaceId;

    const built = await buildAgent({
      config,
      runContext: {
        runId,
        agentEntityId: run.agentEntityId,
        smartSpaceId: run.smartSpaceId,
        agentId: run.agentId,
        isGoToSpaceRun,
      },
    });

    // Load space members + triggering entity + agent display name for run context
    const [spaceMembers, smartSpace, triggeredByEntity, agentEntity] = await Promise.all([
      prisma.smartSpaceMembership.findMany({
        where: { smartSpaceId: run.smartSpaceId },
        include: { entity: { select: { id: true, displayName: true, type: true, metadata: true } } },
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
      prisma.entity.findUnique({
        where: { id: run.agentEntityId },
        select: { displayName: true },
      }),
    ]);

    const agentDisplayName = agentEntity?.displayName || 'AI Assistant';

    // ──────────────────────────────────────────────────────────────────────
    // goToSpace child runs: v3 Clean Execution Model
    // - System prompt with origin + target context (no real conversation turns)
    // - Single user message: "Go ahead."
    // ──────────────────────────────────────────────────────────────────────
    let modelMessages;

    if (isGoToSpaceRun) {
      const meta = run.metadata as any;
      const instruction = meta?.instruction || '';
      const originSmartSpaceId = meta?.originSmartSpaceId;
      const originSmartSpaceName = meta?.originSmartSpaceName || originSmartSpaceId;

      // Load origin space context: members + recent messages
      const [originMembers, originMessages] = await Promise.all([
        originSmartSpaceId
          ? prisma.smartSpaceMembership.findMany({
              where: { smartSpaceId: originSmartSpaceId },
              include: { entity: { select: { id: true, displayName: true, type: true, metadata: true } } },
            })
          : [],
        originSmartSpaceId
          ? prisma.smartSpaceMessage.findMany({
              where: { smartSpaceId: originSmartSpaceId },
              orderBy: { seq: 'desc' },
              take: 10,
              select: {
                role: true,
                content: true,
                entityId: true,
                entity: { select: { displayName: true, type: true } },
              },
            }).then((msgs) => msgs.reverse())
          : [],
      ]);

      // Load target space recent messages (for context in system prompt)
      const targetMessages = await prisma.smartSpaceMessage.findMany({
        where: { smartSpaceId: run.smartSpaceId },
        orderBy: { seq: 'desc' },
        take: 15,
        select: {
          role: true,
          content: true,
          entityId: true,
          entity: { select: { displayName: true, type: true } },
        },
      }).then((msgs) => msgs.reverse());

      // Format messages as "Name: text" for system prompt
      const formatMsgLine = (m: { content: string | null; entityId: string; entity: { displayName: string | null; type: string } | null }) => {
        const name = m.entityId === run.agentEntityId
          ? agentDisplayName
          : (m.entity?.displayName || 'Unknown');
        return `${name}: ${m.content || '(empty)'}`;
      };

      // Build the v3 isolated system prompt
      const systemParts: string[] = [];

      systemParts.push(`You are ${agentDisplayName}.`);
      systemParts.push('');
      systemParts.push(
        'You are a single entity that operates across multiple spaces. You move between ' +
        'spaces to talk to people, just like a person walks between rooms. You are NOT ' +
        'a message relay, NOT a notification system, and NOT executing a dispatched task. ' +
        'You are simply continuing your own natural flow of conversation.'
      );

      // Origin context
      systemParts.push('');
      systemParts.push('======================================================================');
      systemParts.push('WHERE YOU JUST WERE');
      systemParts.push('======================================================================');
      systemParts.push('');
      systemParts.push(`You were just in a space called "${originSmartSpaceName}".`);

      if (originMembers.length > 0) {
        systemParts.push('');
        systemParts.push('Participants in that space:');
        for (const m of originMembers) {
          systemParts.push(`- ${m.entity.displayName || 'Unknown'} (${m.entity.type})`);
        }
      }

      if (originMessages.length > 0) {
        systemParts.push('');
        systemParts.push('Here is what was said there recently (most recent last):');
        for (const m of originMessages) {
          systemParts.push(formatMsgLine(m));
        }
      }

      // Target context
      systemParts.push('');
      systemParts.push('======================================================================');
      systemParts.push('WHERE YOU ARE NOW');
      systemParts.push('======================================================================');
      systemParts.push('');
      systemParts.push(`You are now in a space called "${smartSpace?.name || run.smartSpaceId}".`);

      if (spaceMembers.length > 0) {
        systemParts.push('');
        systemParts.push('Participants in this space:');
        for (const m of spaceMembers) {
          systemParts.push(`- ${m.entity.displayName || 'Unknown'} (${m.entity.type})`);
        }
      }

      if (targetMessages.length > 0) {
        systemParts.push('');
        systemParts.push('Here is the recent conversation in this space (most recent last):');
        for (const m of targetMessages) {
          systemParts.push(formatMsgLine(m));
        }
      }

      // Task (placed last for maximum model attention)
      systemParts.push('');
      systemParts.push('======================================================================');
      systemParts.push('WHAT TO DO');
      systemParts.push('======================================================================');
      systemParts.push('');
      systemParts.push(`Based on your conversation in "${originSmartSpaceName}", you need to:`);
      systemParts.push('');
      systemParts.push(instruction);
      systemParts.push('');
      systemParts.push('RULES:');
      systemParts.push('- Address the people in THIS space directly. You are talking TO them, not ABOUT them.');
      systemParts.push(`- Speak naturally as yourself. You remember being in "${originSmartSpaceName}" — use that context to speak with full understanding, not like you're reading from a script.`);
      systemParts.push('- Do NOT say things like "I was asked to tell you" or "I have a message for you" or "Just a heads up." You are not delivering a message. You are talking to people you know, about something you know, because you were part of the original conversation.');
      systemParts.push('- Do NOT narrate what you are doing. Do not say "I am here to inform you" or "I am passing along information." Just say what needs to be said.');
      systemParts.push('- If the task requires action (e.g., scheduling, creating something), do it yourself using your available tools. Do not suggest that someone else do it.');
      systemParts.push(`- If you need to reference what was said in "${originSmartSpaceName}", do it naturally, for example "Husam mentioned..." — not "I received a task from ${originSmartSpaceName}."`);
      systemParts.push('');
      systemParts.push(`Your next response will be posted as a new message in "${smartSpace?.name || run.smartSpaceId}", visible to all participants.`);

      const goToSystemPrompt = systemParts.join('\n');

      // v3: Only system prompt + "Go ahead." — no real conversation turns
      const aiSdkUiMessages = [
        { role: 'system' as const, parts: [{ type: 'text' as const, text: goToSystemPrompt }] },
        { role: 'user' as const, parts: [{ type: 'text' as const, text: 'Go ahead.' }] },
      ];

      modelMessages = await convertToModelMessages(aiSdkUiMessages as any);

    } else {
      // ──────────────────────────────────────────────────────────────────────
      // Normal run: load conversation history as real turns
      // ──────────────────────────────────────────────────────────────────────

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

      // Inject available spaces so the agent always knows where it can goToSpace
      const agentMemberships = await prisma.smartSpaceMembership.findMany({
        where: { entityId: run.agentEntityId },
        include: {
          smartSpace: {
            select: {
              id: true,
              name: true,
              memberships: {
                include: { entity: { select: { displayName: true, type: true, metadata: true } } },
              },
            },
          },
        },
      });

      if (agentMemberships.length > 1) {
        contextParts.push('');
        contextParts.push('You are a member of the following spaces. You can use goToSpace to go to any of them:');
        for (const membership of agentMemberships) {
          const sp = membership.smartSpace;
          const isCurrent = sp.id === run.smartSpaceId;
          const members = sp.memberships
            .map((m) => {
              const name = m.entity.displayName || 'Unknown';
              const meta = m.entity.metadata as Record<string, unknown> | null;
              const metaStr = meta && Object.keys(meta).length > 0
                ? ` [${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(', ')}]`
                : '';
              return `${name} (${m.entity.type})${metaStr}`;
            })
            .join(', ');
          contextParts.push(`- "${sp.name || sp.id}" (id: ${sp.id})${isCurrent ? ' [CURRENT]' : ''} — Members: ${members}`);
        }
      }

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

      modelMessages = await convertToModelMessages(aiSdkUiMessages as any);
    }

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
    // Skip triggering for goToSpace child runs — they are isolated task runs, not conversations
    if (!isGoToSpaceRun) {
      const triggerDepth = (run.metadata as any)?.triggerDepth ?? 0;
      await triggerAgentsInSmartSpace({
        smartSpaceId: run.smartSpaceId,
        senderEntityId: run.agentEntityId,
        triggerDepth,
      });
    }
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
