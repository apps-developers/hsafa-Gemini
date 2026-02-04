import { Router, type Router as ExpressRouter } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';

export const entitiesRouter: ExpressRouter = Router();

entitiesRouter.post('/', async (req, res) => {
  try {
    const { type, externalId, displayName, metadata } = req.body;

    if (type !== 'human' && type !== 'system') {
      return res.status(400).json({ error: 'Invalid type (must be human|system)' });
    }

    const entity = await prisma.entity.create({
      data: {
        type,
        externalId: typeof externalId === 'string' ? externalId : null,
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

entitiesRouter.post('/agent', async (req, res) => {
  try {
    const { agentId, externalId, displayName, metadata } = req.body;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: agentId' });
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { id: true } });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const entity = await prisma.entity.create({
      data: {
        type: 'agent',
        agentId,
        externalId: typeof externalId === 'string' ? externalId : null,
        displayName: typeof displayName === 'string' ? displayName : null,
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
      },
    });

    return res.status(201).json({ entity });
  } catch (error) {
    console.error('[POST /api/entities/agent] Error:', error);
    return res.status(500).json({
      error: 'Failed to create agent entity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

entitiesRouter.get('/', async (req, res) => {
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

entitiesRouter.get('/:entityId', async (req, res) => {
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

entitiesRouter.patch('/:entityId', async (req, res) => {
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

entitiesRouter.delete('/:entityId', async (req, res) => {
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
