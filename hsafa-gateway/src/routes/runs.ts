import { Router, Request, Response, type Router as ExpressRouter } from 'express';
import { Prisma } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/db.js';
import { createEmitEvent, toSSEEvent } from '../lib/run-events.js';
import { executeRun } from '../lib/run-runner.js';
import { submitToolResult } from '../lib/tool-results.js';
import { emitSmartSpaceEvent } from '../lib/smartspace-events.js';
import { requireAuth, requireSecretKey } from '../middleware/auth.js';

export const runsRouter: ExpressRouter = Router();

// GET /api/runs - List runs (debugging/history)
runsRouter.get('/', requireSecretKey(), async (req: Request, res: Response) => {
  try {
    const { agentId, agentEntityId, smartSpaceId, status, limit = '50', offset = '0' } = req.query;

    const where: Prisma.RunWhereInput = {};
    if (typeof agentId === 'string') where.agentId = agentId;
    if (typeof agentEntityId === 'string') where.agentEntityId = agentEntityId;
    if (typeof smartSpaceId === 'string') where.smartSpaceId = smartSpaceId;
    if (typeof status === 'string') (where as any).status = status;

    const runs = await prisma.run.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string) || 50, 100),
      skip: parseInt(offset as string) || 0,
      select: {
        id: true,
        status: true,
        smartSpaceId: true,
        agentEntityId: true,
        agentId: true,
        createdAt: true,
        completedAt: true,
      },
    });

    res.json({ runs });
  } catch (error) {
    console.error('List runs error:', error);
    res.status(500).json({
      error: 'Failed to list runs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/runs - Create a new run (debugging)
runsRouter.post('/', requireSecretKey(), async (req: Request, res: Response) => {
  try {
    const { smartSpaceId, agentEntityId, agentId, triggeredById, parentRunId, metadata, start = true } = req.body;

    if (!smartSpaceId || typeof smartSpaceId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: smartSpaceId' });
    }
    if (!agentEntityId || typeof agentEntityId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: agentEntityId' });
    }

    let finalAgentId: string | null = typeof agentId === 'string' ? agentId : null;
    if (!finalAgentId) {
      const entity = await prisma.entity.findUnique({
        where: { id: agentEntityId },
        select: { agentId: true, type: true },
      });
      if (!entity || entity.type !== 'agent' || !entity.agentId) {
        return res.status(400).json({ error: 'agentEntityId must reference an agent Entity with agentId set' });
      }
      finalAgentId = entity.agentId;
    }

    const run = await prisma.run.create({
      data: {
        smartSpaceId,
        agentEntityId,
        agentId: finalAgentId,
        triggeredById: typeof triggeredById === 'string' ? triggeredById : null,
        parentRunId: typeof parentRunId === 'string' ? parentRunId : null,
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
        status: 'queued',
      },
      select: { id: true },
    });

    const runId = run.id;
    const { emitEvent } = await createEmitEvent(runId);
    await emitEvent('run.created', { runId, smartSpaceId, agentEntityId, agentId: finalAgentId, status: 'queued' });
    await emitSmartSpaceEvent(
      smartSpaceId,
      'run.created',
      { runId, smartSpaceId, agentEntityId, agentId: finalAgentId, status: 'queued' },
      { runId, agentEntityId }
    );

    if (start !== false) {
      executeRun(runId).catch(() => {
        // errors are handled inside executeRun
      });
    }

    return res.status(201).json({ runId, status: 'queued', streamUrl: `/api/runs/${runId}/stream` });
  } catch (error) {
    console.error('[POST /api/runs] Error:', error);
    res.status(500).json({
      error: 'Failed to create run',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

runsRouter.post('/:runId/cancel', requireSecretKey(), async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run) return res.status(404).json({ error: 'Run not found' });

    if (run.status === 'completed' || run.status === 'failed' || run.status === 'canceled') {
      return res.json({ success: true, status: run.status });
    }

    await prisma.run.update({
      where: { id: runId },
      data: { status: 'canceled', completedAt: new Date() },
    });

    const { emitEvent } = await createEmitEvent(runId);
    await emitEvent('run.canceled', { status: 'canceled' });

    return res.json({ success: true, status: 'canceled' });
  } catch (error) {
    console.error('[POST /api/runs/:runId/cancel] Error:', error);
    return res.status(500).json({
      error: 'Failed to cancel run',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

runsRouter.get('/:runId/stream', requireAuth(), async (req: Request, res: Response) => {
  const { runId } = req.params;
  const since = req.query.since as string | undefined;
  const lastEventId = req.headers['last-event-id'] as string | undefined;

  const startId = since || lastEventId || '$';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const streamKey = `run:${runId}:stream`;
  let isActive = true;

  req.on('close', () => {
    isActive = false;
  });

  try {
    const run = await prisma.run.findUnique({
      where: { id: runId },
    });

    if (!run) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Run not found' })}\n\n`);
      res.end();
      return;
    }

    res.write(`: Connected to run ${runId}\n\n`);

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
          res.write(`id: ${id}\n`);
          res.write(`event: hsafa\n`);
          res.write(`data: ${JSON.stringify(event)}\n\n`);

          lastSeenId = id;
        }
      }
    }

    const subscriber = redis.duplicate();
    const notifyChannel = `run:${runId}:notify`;

    // Handle incoming pub/sub messages
    subscriber.on('message', async (channel: string) => {
      if (channel !== notifyChannel || !isActive) return;

      // Read events after last seen ID
      const newEvents = await redis.xread('STREAMS', streamKey, lastSeenId);
      
      if (newEvents && newEvents.length > 0) {
        for (const [, messages] of newEvents) {
          for (const [id, fields] of messages) {
            if (!isActive) break;

            const event = toSSEEvent(id, fields);
            res.write(`id: ${id}\n`);
            res.write(`event: hsafa\n`);
            res.write(`data: ${JSON.stringify(event)}\n\n`);

            lastSeenId = id;
          }
        }
      }
    });

    // Subscribe to the notification channel
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
    console.error('SSE stream error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })}\n\n`);
    res.end();
  }
});

runsRouter.get('/:runId/events', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const events = await prisma.runEvent.findMany({
      where: { runId },
      orderBy: { seq: 'asc' },
    });

    // Convert BigInt seq to number for JSON serialization
    const serializedEvents = events.map(e => ({
      ...e,
      seq: Number(e.seq),
    }));

    res.json({ events: serializedEvents });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

runsRouter.get('/:runId', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: {
        agent: true,
        agentEntity: true,
        smartSpace: true,
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({ run });
  } catch (error) {
    console.error('Get run error:', error);
    res.status(500).json({
      error: 'Failed to fetch run',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/runs/:runId - Delete a run and its events
runsRouter.delete('/:runId', requireSecretKey(), async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Delete related records first (no cascade in schema)
    await prisma.toolResult.deleteMany({ where: { runId } });
    await prisma.toolCall.deleteMany({ where: { runId } });
    await prisma.runEvent.deleteMany({ where: { runId } });
    await prisma.run.delete({ where: { id: runId } });

    // Clean up Redis stream
    try {
      await redis.del(`run:${runId}:stream`);
    } catch { /* ignore redis errors */ }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete run error:', error);
    res.status(500).json({
      error: 'Failed to delete run',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

runsRouter.post('/:runId/tool-results', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { callId, result, source, clientId } = req.body;

    if (!callId || typeof callId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: callId' });
    }

    await submitToolResult({
      runId,
      callId,
      result,
      source: source === 'client' || source === 'server' ? source : undefined,
      clientId: typeof clientId === 'string' ? clientId : null,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Post tool result error:', error);
    res.status(500).json({
      error: 'Failed to post tool result',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
