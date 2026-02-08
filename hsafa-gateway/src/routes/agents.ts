import { Router, type Router as ExpressRouter } from 'express';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { validateAgentConfig } from '../agent-builder/parser.js';
import { requireSecretKey } from '../middleware/auth.js';

export const agentsRouter: ExpressRouter = Router();

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const key of Object.keys(obj).sort()) {
      const v = obj[key];
      if (v === undefined) continue;
      out[key] = sortKeysDeep(v);
    }

    return out;
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

agentsRouter.post('/', requireSecretKey(), async (req, res) => {
  try {
    const { name, config } = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid field: config (must be an object)',
      });
    }

    const validatedConfig = validateAgentConfig(config);

    const agentName =
      typeof name === 'string' && name.trim().length > 0
        ? name.trim()
        : validatedConfig.agent?.name;

    if (!agentName || agentName.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing agent name (provide req.body.name or config.agent.name)',
      });
    }

    const configHash = createHash('sha256')
      .update(stableStringify(validatedConfig))
      .digest('hex');

    const existing = await prisma.agent.findUnique({
      where: { name: agentName },
      select: { id: true, configHash: true },
    });

    if (existing && existing.configHash === configHash) {
      return res.json({
        agentId: existing.id,
        configHash,
        created: false,
      });
    }

    const agent = await prisma.agent.upsert({
      where: { name: agentName },
      create: {
        name: agentName,
        description: validatedConfig.agent?.description,
        configJson: validatedConfig as unknown as Prisma.InputJsonValue,
        configHash,
      },
      update: {
        description: validatedConfig.agent?.description,
        configJson: validatedConfig as unknown as Prisma.InputJsonValue,
        configHash,
      },
    });

    res.json({ agentId: agent.id, configHash, created: true });
  } catch (error) {
    console.error('[Agents API Error]', error);
    res.status(500).json({
      error: 'Failed to create agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

agentsRouter.get('/', requireSecretKey(), async (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string) || 50, 200),
      skip: parseInt(offset as string) || 0,
    });

    return res.json({ agents });
  } catch (error) {
    console.error('[GET /api/agents] Error:', error);
    return res.status(500).json({
      error: 'Failed to list agents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

agentsRouter.get('/:agentId', requireSecretKey(), async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({ agent });
  } catch (error) {
    console.error('[GET /api/agents/:agentId] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

agentsRouter.delete('/:agentId', requireSecretKey(), async (req, res) => {
  try {
    const { agentId } = req.params;
    await prisma.agent.delete({ where: { id: agentId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/agents/:agentId] Error:', error);
    return res.status(500).json({
      error: 'Failed to delete agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
