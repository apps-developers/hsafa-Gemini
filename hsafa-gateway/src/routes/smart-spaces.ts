import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/db.js';
import { createSmartSpaceMessage } from '../lib/smartspace-db.js';
import { emitSmartSpaceEvent } from '../lib/smartspace-events.js';
import { toSSEEvent } from '../lib/run-events.js';
import { triggerAgentsInSmartSpace } from '../lib/agent-trigger.js';
import { generatePublicKey, generateSecretKey } from '../lib/keys.js';
import { requireAuth, requireGatewayAdmin, requireSpaceAdmin, requireMembership } from '../middleware/auth.js';

export const smartSpacesRouter: ExpressRouter = Router();

smartSpacesRouter.post('/', requireGatewayAdmin(), async (req, res) => {
  try {
    const { name, description, visibility, isPrivate, metadata } = req.body;

    const privateFlag =
      typeof isPrivate === 'boolean' ? isPrivate : typeof visibility === 'string' ? visibility === 'private' : false;

    const smartSpace = await prisma.smartSpace.create({
      data: {
        name: typeof name === 'string' ? name : null,
        description: typeof description === 'string' ? description : null,
        isPrivate: privateFlag,
        publicKey: generatePublicKey(),
        secretKey: generateSecretKey(),
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
      },
    });

    return res.status(201).json({ smartSpace });
  } catch (error) {
    console.error('[POST /api/smart-spaces] Error:', error);
    return res.status(500).json({
      error: 'Failed to create smart space',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.get('/', requireAuth(), async (req, res) => {
  try {
    const { entityId, limit = '50', offset = '0' } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 200);
    const skip = parseInt(offset as string) || 0;

    // JWT users: only see spaces they're a member of
    if (req.auth?.method === 'public_key_jwt') {
      const jwtEntityId = req.auth.entityId!;
      const memberships = await prisma.smartSpaceMembership.findMany({
        where: { entityId: jwtEntityId },
        orderBy: { joinedAt: 'desc' },
        take,
        skip,
        include: { smartSpace: true },
      });

      return res.json({ smartSpaces: memberships.map((m) => m.smartSpace) });
    }

    // Admin/secret key: can filter by entityId or list all
    if (entityId && typeof entityId === 'string') {
      const memberships = await prisma.smartSpaceMembership.findMany({
        where: { entityId },
        orderBy: { joinedAt: 'desc' },
        take,
        skip,
        include: { smartSpace: true },
      });

      return res.json({ smartSpaces: memberships.map((m) => m.smartSpace) });
    }

    const smartSpaces = await prisma.smartSpace.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return res.json({ smartSpaces });
  } catch (error) {
    console.error('[GET /api/smart-spaces] Error:', error);
    return res.status(500).json({
      error: 'Failed to list smart spaces',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.get('/:smartSpaceId', requireAuth(), requireMembership(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;

    const smartSpace = await prisma.smartSpace.findUnique({ where: { id: smartSpaceId } });
    if (!smartSpace) return res.status(404).json({ error: 'SmartSpace not found' });

    return res.json({ smartSpace });
  } catch (error) {
    console.error('[GET /api/smart-spaces/:smartSpaceId] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch smart space',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.patch('/:smartSpaceId', requireSpaceAdmin(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;
    const { name, description, isPrivate, visibility, metadata } = req.body;

    const privateFlag =
      typeof isPrivate === 'boolean' ? isPrivate : typeof visibility === 'string' ? visibility === 'private' : undefined;

    const smartSpace = await prisma.smartSpace.update({
      where: { id: smartSpaceId },
      data: {
        name: typeof name === 'string' ? name : undefined,
        description: typeof description === 'string' ? description : undefined,
        isPrivate: privateFlag,
        metadata: metadata !== undefined ? ((metadata ?? null) as Prisma.InputJsonValue) : undefined,
      },
    });

    return res.json({ smartSpace });
  } catch (error) {
    console.error('[PATCH /api/smart-spaces/:smartSpaceId] Error:', error);
    return res.status(500).json({
      error: 'Failed to update smart space',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.delete('/:smartSpaceId', requireSpaceAdmin(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;
    await prisma.smartSpace.delete({ where: { id: smartSpaceId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/smart-spaces/:smartSpaceId] Error:', error);
    return res.status(500).json({
      error: 'Failed to delete smart space',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.post('/:smartSpaceId/members', requireSpaceAdmin(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;
    const { entityId, role } = req.body;

    if (!entityId || typeof entityId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: entityId' });
    }

    const membership = await prisma.smartSpaceMembership.create({
      data: {
        smartSpaceId,
        entityId,
        role: typeof role === 'string' ? role : null,
      },
    });

    await emitSmartSpaceEvent(smartSpaceId, 'smartSpace.member.joined', { entityId, role: membership.role ?? null });

    return res.status(201).json({ membership });
  } catch (error) {
    console.error('[POST /api/smart-spaces/:smartSpaceId/members] Error:', error);
    return res.status(500).json({
      error: 'Failed to add member',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.get('/:smartSpaceId/members', requireAuth(), requireMembership(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;

    const members = await prisma.smartSpaceMembership.findMany({
      where: { smartSpaceId },
      orderBy: { joinedAt: 'asc' },
      include: { entity: true },
    });

    return res.json({ members });
  } catch (error) {
    console.error('[GET /api/smart-spaces/:smartSpaceId/members] Error:', error);
    return res.status(500).json({
      error: 'Failed to list members',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.patch('/:smartSpaceId/members/:entityId', requireSpaceAdmin(), async (req, res) => {
  try {
    const { smartSpaceId, entityId } = req.params;
    const { role } = req.body;

    const membership = await prisma.smartSpaceMembership.update({
      where: { smartSpaceId_entityId: { smartSpaceId, entityId } },
      data: {
        role: typeof role === 'string' ? role : undefined,
      },
    });

    return res.json({ membership });
  } catch (error) {
    console.error('[PATCH /api/smart-spaces/:smartSpaceId/members/:entityId] Error:', error);
    return res.status(500).json({
      error: 'Failed to update member',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.delete('/:smartSpaceId/members/:entityId', requireSpaceAdmin(), async (req, res) => {
  try {
    const { smartSpaceId, entityId } = req.params;

    await prisma.smartSpaceMembership.delete({
      where: { smartSpaceId_entityId: { smartSpaceId, entityId } },
    });

    await emitSmartSpaceEvent(smartSpaceId, 'smartSpace.member.left', { entityId });

    return res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/smart-spaces/:smartSpaceId/members/:entityId] Error:', error);
    return res.status(500).json({
      error: 'Failed to remove member',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Post a message to a SmartSpace.
 * 
 * Supports messages from ANY entity type:
 * - Human entities (users) - triggers agent runs
 * - Agent entities (AI agents) - no auto-trigger (they post via run-runner)
 * - System entities (servers, services) - can optionally trigger agents
 * 
 * The role is automatically determined from the entity type,
 * or can be explicitly set via the `role` field.
 */
smartSpacesRouter.post('/:smartSpaceId/messages', requireAuth(), requireMembership(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;
    const { content, entityId: bodyEntityId, metadata, role: explicitRole, triggerAgents = true } = req.body;

    // For JWT auth: auto-resolve entityId from token (prevents impersonation)
    // For secret key auth: use entityId from body
    const entityId = req.auth?.method === 'public_key_jwt' 
      ? req.auth.entityId 
      : bodyEntityId;

    if (!entityId || typeof entityId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: entityId' });
    }

    if (content != null && typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid field: content (must be string or null)' });
    }

    // Look up the entity to determine type and role
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, type: true, displayName: true },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Determine role based on entity type (or use explicit role if provided)
    // - human -> 'user'
    // - agent -> 'assistant'
    // - system -> 'system'
    const roleMap: Record<string, string> = {
      human: 'user',
      agent: 'assistant',
      system: 'system',
    };
    const role = explicitRole || roleMap[entity.type] || 'user';

    const messageRecord = await createSmartSpaceMessage({
      smartSpaceId,
      entityId,
      role,
      content: content ?? null,
      metadata: (metadata ?? null) as Prisma.InputJsonValue,
    });

    const uiMessage = {
      id: messageRecord.id,
      role,
      parts: [{ type: 'text', text: content ?? '' }],
      // Include entity info for clients to render appropriately
      entityId: entity.id,
      entityType: entity.type,
      entityName: entity.displayName,
    };

    // Emit events with full entity context
    const eventContext = { 
      entityId: entity.id, 
      entityType: entity.type as 'human' | 'agent' | 'system',
    };
    
    await emitSmartSpaceEvent(smartSpaceId, 'smartSpace.message', { message: uiMessage }, eventContext);
    await emitSmartSpaceEvent(smartSpaceId, `message.${role}`, { message: uiMessage }, eventContext);

    // Trigger agent runs for ALL messages (human, system, AND other agents)
    // Uses centralized trigger function with loop protection
    let createdRuns: Array<{ runId: string; agentEntityId: string }> = [];
    
    if (triggerAgents) {
      createdRuns = await triggerAgentsInSmartSpace({
        smartSpaceId,
        senderEntityId: entityId,
        triggerDepth: 0, // Initial message starts at depth 0
      });
    }

    const serializedMessage = {
      ...messageRecord,
      seq: messageRecord.seq.toString(),
      entityType: entity.type,
      entityName: entity.displayName,
    };

    return res.status(201).json({ message: serializedMessage, runs: createdRuns });
  } catch (error) {
    console.error('[POST /api/smart-spaces/:smartSpaceId/messages] Error:', error);
    return res.status(500).json({
      error: 'Failed to post message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.get('/:smartSpaceId/messages', requireAuth(), requireMembership(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;
    const { afterSeq, beforeSeq, limit = '50' } = req.query;

    const after = typeof afterSeq === 'string' ? BigInt(afterSeq) : null;
    const before = typeof beforeSeq === 'string' ? BigInt(beforeSeq) : null;

    const where: Prisma.SmartSpaceMessageWhereInput = {
      smartSpaceId,
      ...(after ? { seq: { gt: after } } : {}),
      ...(before ? { seq: { lt: before } } : {}),
    };

    const messages = await prisma.smartSpaceMessage.findMany({
      where,
      orderBy: { seq: 'desc' },
      take: Math.min(parseInt(limit as string) || 50, 200),
    });

    const serialized = messages
      .map((m) => ({
        ...m,
        seq: m.seq.toString(),
      }))
      .reverse();

    return res.json({ messages: serialized });
  } catch (error) {
    console.error('[GET /api/smart-spaces/:smartSpaceId/messages] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch messages',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

smartSpacesRouter.get('/:smartSpaceId/stream', requireAuth(), requireMembership(), async (req: Request, res: Response) => {
  const { smartSpaceId } = req.params;
  const afterSeqRaw = req.query.afterSeq as string | undefined;
  const since = req.query.since as string | undefined;
  const lastEventId = req.headers['last-event-id'] as string | undefined;

  const afterSeq = afterSeqRaw ? Number(afterSeqRaw) : undefined;

  const streamKey = `smartSpace:${smartSpaceId}:stream`;
  const notifyChannel = `smartSpace:${smartSpaceId}:notify`;

  const startId = since || lastEventId || '$';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let isActive = true;

  req.on('close', () => {
    isActive = false;
  });

  try {
    res.write(`: Connected to smart space ${smartSpaceId}\n\n`);

    let lastSeenId = startId;
    if (startId === '$') {
      const last = await redis.xrevrange(streamKey, '+', '-', 'COUNT', 1);
      lastSeenId = Array.isArray(last) && last.length > 0 ? last[0][0] : '0-0';
    }

    const existingEvents = startId === '$' ? null : await redis.xread('STREAMS', streamKey, startId);

    if (existingEvents && existingEvents.length > 0) {
      for (const [, messages] of existingEvents) {
        for (const [id, fields] of messages) {
          if (!isActive) break;

          const event = toSSEEvent(id, fields);
          const payload = event.data as any;
          const seq = typeof payload?.seq === 'number' ? payload.seq : undefined;
          if (afterSeq != null && seq != null && seq <= afterSeq) {
            lastSeenId = id;
            continue;
          }

          res.write(`id: ${id}\n`);
          res.write(`event: hsafa\n`);
          res.write(`data: ${JSON.stringify(event)}\n\n`);

          lastSeenId = id;
        }
      }
    }

    const subscriber = redis.duplicate();

    subscriber.on('message', async (channel: string) => {
      if (channel !== notifyChannel || !isActive) return;

      const newEvents = await redis.xread('STREAMS', streamKey, lastSeenId);
      if (newEvents && newEvents.length > 0) {
        for (const [, messages] of newEvents) {
          for (const [id, fields] of messages) {
            if (!isActive) break;

            const event = toSSEEvent(id, fields);
            const payload = event.data as any;
            const seq = typeof payload?.seq === 'number' ? payload.seq : undefined;
            if (afterSeq != null && seq != null && seq <= afterSeq) {
              lastSeenId = id;
              continue;
            }

            res.write(`id: ${id}\n`);
            res.write(`event: hsafa\n`);
            res.write(`data: ${JSON.stringify(event)}\n\n`);

            lastSeenId = id;
          }
        }
      }
    });

    await subscriber.subscribe(notifyChannel);

    const keepAliveInterval = setInterval(() => {
      if (isActive) {
        res.write(': keepalive\n\n');
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 30000);

    req.on('close', async () => {
      isActive = false;
      clearInterval(keepAliveInterval);
      await subscriber.unsubscribe(notifyChannel);
      await subscriber.quit();
    });
  } catch (error) {
    console.error('[GET /api/smart-spaces/:smartSpaceId/stream] Error:', error);
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
    );
    res.end();
  }
});

/**
 * Submit a tool result from an external client (Node.js, browser, etc.)
 * 
 * Flow:
 * 1. Client subscribes to SmartSpace stream
 * 2. Client sees `tool-input-available` event with {toolCallId, toolName, input}
 * 3. Client executes tool locally
 * 4. Client POSTs result here
 * 5. Gateway emits `tool-output-available` and resumes agent if needed
 */
smartSpacesRouter.post('/:smartSpaceId/tool-results', requireAuth(), requireMembership(), async (req, res) => {
  try {
    const { smartSpaceId } = req.params;
    const { runId, toolCallId, result, source = 'client' } = req.body;

    if (!runId || typeof runId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: runId' });
    }
    if (!toolCallId || typeof toolCallId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: toolCallId' });
    }

    // Verify run belongs to this SmartSpace
    const run = await prisma.run.findUnique({
      where: { id: runId },
      select: { smartSpaceId: true, agentEntityId: true },
    });
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    if (run.smartSpaceId !== smartSpaceId) {
      return res.status(400).json({ error: 'Run does not belong to this SmartSpace' });
    }

    // Emit tool-output-available to SmartSpace stream
    await emitSmartSpaceEvent(
      smartSpaceId,
      'tool-output-available',
      { toolCallId, output: result, source },
      { runId, entityId: run.agentEntityId, entityType: 'agent' }
    );

    return res.json({ success: true, toolCallId });
  } catch (error) {
    console.error('[POST /api/smart-spaces/:smartSpaceId/tool-results] Error:', error);
    return res.status(500).json({
      error: 'Failed to submit tool result',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
