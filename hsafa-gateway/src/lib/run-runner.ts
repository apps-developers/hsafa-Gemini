import { Prisma } from '@prisma/client';
import { convertToModelMessages } from 'ai';
import { prisma } from './db.js';
import { createEmitEvent, handleRunError, type EmitEventFn } from './run-events.js';
import { buildAgent, AgentBuildError } from '../agent-builder/builder.js';
import { closeMCPClients, type MCPClientWrapper } from '../agent-builder/mcp-resolver.js';
import type { AgentConfig } from '../agent-builder/types.js';
import { emitSmartSpaceEvent } from './smartspace-events.js';
import { createSmartSpaceMessage } from './smartspace-db.js';

function toUiMessageFromSmartSpaceMessage(m: {
  id: string;
  role: string;
  content: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  const meta = (m.metadata ?? null) as Record<string, unknown> | null;
  const ui = meta && typeof meta === 'object' ? (meta as any).uiMessage : null;
  if (ui && typeof ui === 'object') {
    return ui;
  }

  return {
    id: m.id,
    role: m.role,
    parts: [{ type: 'text', text: m.content ?? '' }],
  };
}

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

  const emitEvent: EmitEventFn = async (type, payload) => {
    await emitRunEvent(type, payload);
    await emitSmartSpaceEvent(run.smartSpaceId, type, payload, {
      runId,
      agentEntityId: run.agentEntityId,
    });
  };

  let mcpClients: MCPClientWrapper[] | undefined;

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
    mcpClients = built.mcpClients;

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
    const modelMessages = await convertToModelMessages(uiMessages as any);

    const streamResult = await built.agent.stream({ messages: modelMessages });

    let stepIndex = 0;

    for await (const part of streamResult.fullStream) {
      switch (part.type) {
        case 'start-step':
          stepIndex++;
          await emitEvent('step.start', { step: stepIndex });
          break;

        case 'text-delta':
          await emitEvent('text.delta', { delta: part.text });
          break;

        case 'reasoning-start':
          await emitEvent('reasoning.start', {});
          break;

        case 'reasoning-delta':
          await emitEvent('reasoning.delta', { delta: part.text });
          break;

        case 'tool-input-start':
          await emitEvent('tool.input.start', {
            toolCallId: part.id,
            toolName: part.toolName,
          });
          break;

        case 'tool-input-delta':
          await emitEvent('tool.input.delta', {
            toolCallId: part.id,
            delta: part.delta,
          });
          break;

        case 'tool-call': {
          const input = 'input' in part ? part.input : {};

          const toolConfig = config.tools?.find((t) => t.name === part.toolName);
          const executionTarget =
            toolConfig && typeof (toolConfig as any).executionTarget === 'string'
              ? ((toolConfig as any).executionTarget as 'server' | 'client' | 'external')
              : 'server';

          await emitEvent('tool.call', {
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            args: input,
            executionTarget,
          });

          const assistantToolCallMessage = {
            id: `msg-${Date.now()}-assistant-toolcall`,
            role: 'assistant',
            parts: [
              {
                type: 'tool-call',
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input,
                state: 'input-available',
              },
            ],
          };

          await emitEvent('message.assistant', {
            message: assistantToolCallMessage,
          });

          let targetClientId: string | null = null;
          if (executionTarget === 'client' && run.triggeredById) {
            const targetClient = await prisma.client.findFirst({
              where: { entityId: run.triggeredById },
              orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
              select: { id: true },
            });
            targetClientId = targetClient?.id ?? null;
          }

          await prisma.toolCall.create({
            data: {
              runId,
              seq: BigInt(stepIndex),
              callId: part.toolCallId,
              toolName: part.toolName,
              args: input as Prisma.InputJsonValue,
              executionTarget,
              targetClientId,
              status: 'requested',
            },
          });

          if (executionTarget !== 'server') {
            await createSmartSpaceMessage({
              smartSpaceId: run.smartSpaceId,
              entityId: run.agentEntityId,
              role: 'assistant',
              content: null,
              metadata: { uiMessage: assistantToolCallMessage } as unknown as Prisma.InputJsonValue,
              runId,
            });

            await emitSmartSpaceEvent(
              run.smartSpaceId,
              'smartSpace.message',
              { message: assistantToolCallMessage },
              { runId, agentEntityId: run.agentEntityId }
            );

            await prisma.run.update({
              where: { id: runId },
              data: { status: 'waiting_tool' },
            });

            await emitEvent('run.waiting_tool', {
              status: 'waiting_tool',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              executionTarget,
              targetClientId,
            });

            if (executionTarget === 'client' && targetClientId) {
              const { dispatchToolCallToClient } = await import('./websocket.js');
              await dispatchToolCallToClient(targetClientId, {
                runId,
                callId: part.toolCallId,
                toolName: part.toolName,
                args: input as Record<string, unknown>,
              });

              await prisma.toolCall.update({
                where: { runId_callId: { runId, callId: part.toolCallId } },
                data: { status: 'dispatched' },
              });
            }

            return;
          }

          break;
        }

        case 'tool-result': {
          const output = 'output' in part ? part.output : null;

          await emitEvent('tool.result', {
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            result: output,
          });

          await emitEvent('message.tool', {
            message: {
              id: `msg-${Date.now()}-tool-${part.toolCallId}`,
              role: 'tool',
              parts: [
                {
                  type: 'tool-result',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  output,
                  state: 'output-available',
                },
              ],
            },
          });

          await prisma.toolCall.update({
            where: { runId_callId: { runId, callId: part.toolCallId } },
            data: { status: 'completed', completedAt: new Date() },
          });

          await prisma.toolResult.upsert({
            where: { runId_callId: { runId, callId: part.toolCallId } },
            create: {
              runId,
              callId: part.toolCallId,
              result: (output ?? {}) as Prisma.InputJsonValue,
              source: 'server',
            },
            update: {
              result: (output ?? {}) as Prisma.InputJsonValue,
            },
          });

          break;
        }

        case 'finish-step':
          await emitEvent('step.finish', {
            step: stepIndex,
            finishReason: part.finishReason,
            usage: part.usage,
          });
          break;

        case 'finish':
          await emitEvent('stream.finish', {
            finishReason: part.finishReason,
            usage: part.totalUsage,
          });
          break;

        case 'error':
          await emitEvent('stream.error', {
            error: part.error instanceof Error ? part.error.message : String(part.error),
          });
          break;
      }
    }

    const finalText = await streamResult.text;

    await prisma.run.update({
      where: { id: runId },
      data: { status: 'completed', completedAt: new Date() },
    });

    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      parts: [{ type: 'text', text: finalText }],
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
    await emitEvent('run.completed', { status: 'completed', text: finalText });
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
  } finally {
    if (mcpClients && mcpClients.length > 0) {
      await closeMCPClients(mcpClients);
    }
  }
}
