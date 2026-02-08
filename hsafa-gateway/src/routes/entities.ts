import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { toSSEEvent } from '../lib/run-events.js';
import { requireSecretKey } from '../middleware/auth.js';

export const entitiesRouter: ExpressRouter = Router();

entitiesRouter.post('/', requireSecretKey(), async (req, res) => {
  try {
    const { type, externalId, displayName, metadata } = req.body;

    if (type !== 'human' && type !== 'system') {
      return res.status(400).json({ error: 'Invalid type (must be human|system)' });
    }

    const extId = typeof externalId === 'string' ? externalId : null;

    // If externalId provided, upsert to avoid unique-constraint errors on re-registration
    if (extId) {
      const entity = await prisma.entity.upsert({
        where: { externalId: extId },
        create: {
          type,
          externalId: extId,
          displayName: typeof displayName === 'string' ? displayName : null,
          metadata: (metadata ?? null) as Prisma.InputJsonValue,
        },
        update: {
          displayName: typeof displayName === 'string' ? displayName : undefined,
          metadata: metadata !== undefined ? ((metadata ?? null) as Prisma.InputJsonValue) : undefined,
        },
      });
      return res.status(200).json({ entity });
    }

    const entity = await prisma.entity.create({
      data: {
        type,
        externalId: null,
        displayName: typeof displayName === 'string' ? displayName : null,
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
      },
    });

    return res.status(201).json({ entity });
  } catch (error) {
    console.error('[POST /api/entities] Error:', error);
    return res.status(500).json({
      error: 'Failed to create entity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

entitiesRouter.post('/agent', requireSecretKey(), async (req, res) => {
  try {
    const { agentId, externalId, displayName, metadata } = req.body;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: agentId' });
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { id: true } });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const entity = await prisma.entity.upsert({
      where: { agentId },
      create: {
        type: 'agent',
        agentId,
        externalId: typeof externalId === 'string' ? externalId : null,
        displayName: typeof displayName === 'string' ? displayName : null,
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
      },
      update: {
        displayName: typeof displayName === 'string' ? displayName : undefined,
        metadata: metadata !== undefined ? ((metadata ?? null) as Prisma.InputJsonValue) : undefined,
      },
    });

    return res.status(200).json({ entity });
  } catch (error) {
    console.error('[POST /api/entities/agent] Error:', error);
    return res.status(500).json({
      error: 'Failed to create agent entity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

entitiesRouter.get('/', requireSecretKey(), async (req, res) => {
  try {
    const { type, limit = '50', offset = '0' } = req.query;

    const where: Prisma.EntityWhereInput = {};
    if (typeof type === 'string' && (type === 'human' || type === 'agent' || type === 'system')) {
      (where as any).type = type;
    }

    const entities = await prisma.entity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string) || 50, 200),
      skip: parseInt(offset as string) || 0,
    });

    return res.json({ entities });
  } catch (error) {
    console.error('[GET /api/entities] Error:', error);
    return res.status(500).json({
      error: 'Failed to list entities',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

entitiesRouter.get('/:entityId', requireSecretKey(), async (req, res) => {
  try {
    const { entityId } = req.params;

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    return res.json({ entity });
  } catch (error) {
    console.error('[GET /api/entities/:entityId] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch entity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

entitiesRouter.patch('/:entityId', requireSecretKey(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const { displayName, metadata } = req.body;

    const entity = await prisma.entity.update({
      where: { id: entityId },
      data: {
        displayName: typeof displayName === 'string' ? displayName : undefined,
        metadata: metadata !== undefined ? ((metadata ?? null) as Prisma.InputJsonValue) : undefined,
      },
    });

    return res.json({ entity });
  } catch (error) {
    console.error('[PATCH /api/entities/:entityId] Error:', error);
    return res.status(500).json({
      error: 'Failed to update entity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

entitiesRouter.delete('/:entityId', requireSecretKey(), async (req, res) => {
  try {
    const { entityId } = req.params;

    await prisma.entity.delete({ where: { id: entityId } });

    return res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/entities/:entityId] Error:', error);
    return res.status(500).json({
      error: 'Failed to delete entity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Entity Stream (subscribeAll) - SSE endpoint for Node.js services.
 * 
 * Subscribes to events from ALL SmartSpaces this entity is a member of
 * via a single SSE connection. Requires secret key + entityId.
 *
 * Usage:
 *   GET /api/entities/:entityId/stream
 *   Headers: x-secret-key: sk_...
 */
entitiesRouter.get('/:entityId/stream', requireSecretKey(), async (req: Request, res: Response) => {
  const { entityId } = req.params;

  try {
    // Verify entity exists
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });

    if (!entity) {
      res.status(404).json({ error: 'Entity not found' });
      return;
    }

    // Get all spaces this entity is a member of
    const memberships = await prisma.smartSpaceMembership.findMany({
      where: { entityId },
      select: { smartSpaceId: true },
    });

    const spaceIds = memberships.map((m) => m.smartSpaceId);

    if (spaceIds.length === 0) {
      res.status(200).json({ message: 'Entity is not a member of any SmartSpace' });
      return;
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let isActive = true;
    req.on('close', () => { isActive = false; });

    res.write(`: Connected entity ${entityId} to ${spaceIds.length} space(s)\n\n`);

    // Subscribe to notify channels for all spaces
    const subscriber = redis.duplicate();
    const channels = spaceIds.map((id) => `smartSpace:${id}:notify`);
    const spaceIdSet = new Set(spaceIds);

    // Track last seen ID per space
    const lastSeenIds: Record<string, string> = {};
    for (const id of spaceIds) {
      const streamKey = `smartSpace:${id}:stream`;
      const last = await redis.xrevrange(streamKey, '+', '-', 'COUNT', 1);
      lastSeenIds[id] = Array.isArray(last) && last.length > 0 ? last[0][0] : '0-0';
    }

    subscriber.on('message', async (channel: string) => {
      if (!isActive) return;

      // Extract spaceId from channel: smartSpace:<id>:notify
      const parts = channel.split(':');
      const spaceId = parts[1];
      if (!spaceId || !spaceIdSet.has(spaceId)) return;

      const streamKey = `smartSpace:${spaceId}:stream`;
      const lastId = lastSeenIds[spaceId] || '0-0';

      const newEvents = await redis.xread('STREAMS', streamKey, lastId);
      if (newEvents && newEvents.length > 0) {
        for (const [, messages] of newEvents) {
          for (const [id, fields] of messages) {
            if (!isActive) break;

            const event = toSSEEvent(id, fields);
            // Include smartSpaceId in the event for routing
            const enriched = { ...event, smartSpaceId: spaceId };

            res.write(`id: ${spaceId}:${id}\n`);
            res.write(`event: hsafa\n`);
            res.write(`data: ${JSON.stringify(enriched)}\n\n`);

            lastSeenIds[spaceId] = id;
          }
        }
      }
    });

    for (const ch of channels) {
      await subscriber.subscribe(ch);
    }

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
      for (const ch of channels) {
        await subscriber.unsubscribe(ch);
      }
      await subscriber.quit();
    });
  } catch (error) {
    console.error('[GET /api/entities/:entityId/stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to start entity stream',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
    }
  }
});
