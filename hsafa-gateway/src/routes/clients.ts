import { Router, type Router as ExpressRouter } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { requireAuth, requireSecretKey } from '../middleware/auth.js';

export const clientsRouter: ExpressRouter = Router();

clientsRouter.post('/register', requireAuth(), async (req, res) => {
  try {
    const { entityId: bodyEntityId, clientKey, clientType, displayName, capabilities } = req.body;

    // For JWT auth: force entityId to the JWT-resolved entity (prevent impersonation)
    // For secret key auth: use entityId from body
    const entityId = req.auth?.method === 'public_key_jwt'
      ? req.auth.entityId
      : bodyEntityId;

    if (!entityId || typeof entityId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: entityId' });
    }
    if (!clientKey || typeof clientKey !== 'string') {
      return res.status(400).json({ error: 'Missing required field: clientKey' });
    }

    const client = await prisma.client.upsert({
      where: { clientKey },
      create: {
        entityId,
        clientKey,
        clientType: typeof clientType === 'string' ? clientType : null,
        displayName: typeof displayName === 'string' ? displayName : null,
        capabilities: (capabilities && typeof capabilities === 'object' ? capabilities : {}) as Prisma.InputJsonValue,
        lastSeenAt: new Date(),
      },
      update: {
        entityId,
        clientType: typeof clientType === 'string' ? clientType : undefined,
        displayName: typeof displayName === 'string' ? displayName : undefined,
        capabilities:
          capabilities !== undefined
            ? ((capabilities && typeof capabilities === 'object' ? capabilities : {}) as Prisma.InputJsonValue)
            : undefined,
        lastSeenAt: new Date(),
      },
    });

    return res.status(201).json({ client });
  } catch (error) {
    console.error('[POST /api/clients/register] Error:', error);
    return res.status(500).json({
      error: 'Failed to register client',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

clientsRouter.get('/', requireSecretKey(), async (req, res) => {
  try {
    const { entityId } = req.query;

    if (!entityId || typeof entityId !== 'string') {
      return res.status(400).json({ error: 'Missing required query param: entityId' });
    }

    const clients = await prisma.client.findMany({
      where: { entityId },
      orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({ clients });
  } catch (error) {
    console.error('[GET /api/clients] Error:', error);
    return res.status(500).json({
      error: 'Failed to list clients',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

clientsRouter.delete('/:clientId', requireSecretKey(), async (req, res) => {
  try {
    const { clientId } = req.params;
    await prisma.client.delete({ where: { id: clientId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/clients/:clientId] Error:', error);
    return res.status(500).json({
      error: 'Failed to delete client',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
