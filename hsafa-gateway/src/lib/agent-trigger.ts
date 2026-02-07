import { prisma } from './db.js';
import { emitSmartSpaceEvent } from './smartspace-events.js';
import { executeRun } from './run-runner.js';

/**
 * Triggers all agents in a SmartSpace when a message is posted.
 * 
 * - Excludes the sender (to prevent self-triggering)
 * - Simple loop protection via triggerDepth
 */
export async function triggerAgentsInSmartSpace(options: {
  smartSpaceId: string;
  senderEntityId: string;
  triggerDepth?: number;
  maxDepth?: number;
}): Promise<Array<{ runId: string; agentEntityId: string }>> {
  const { smartSpaceId, senderEntityId, triggerDepth = 0, maxDepth = 5 } = options;

  // Loop protection: don't trigger if we're too deep
  if (triggerDepth >= maxDepth) {
    console.log(`[agent-trigger] Max trigger depth (${maxDepth}) reached, skipping`);
    return [];
  }

  // Find all agent members in the SmartSpace (except the sender)
  const agentMembers = await prisma.smartSpaceMembership.findMany({
    where: { smartSpaceId },
    include: { entity: true },
  });

  const agentEntities = agentMembers
    .map((m) => m.entity)
    .filter((e) => e.type === 'agent' && e.agentId && e.id !== senderEntityId);

  const createdRuns: Array<{ runId: string; agentEntityId: string }> = [];

  for (const agentEntity of agentEntities) {
    const run = await prisma.run.create({
      data: {
        smartSpaceId,
        agentEntityId: agentEntity.id,
        agentId: agentEntity.agentId as string,
        triggeredById: senderEntityId,
        status: 'queued',
        metadata: { triggerDepth: triggerDepth + 1 },
      },
      select: { id: true, agentEntityId: true, agentId: true },
    });

    createdRuns.push({ runId: run.id, agentEntityId: run.agentEntityId });

    await emitSmartSpaceEvent(
      smartSpaceId,
      'run.created',
      {
        runId: run.id,
        agentEntityId: run.agentEntityId,
        agentId: run.agentId,
        status: 'queued',
      },
      { runId: run.id, entityId: run.agentEntityId, entityType: 'agent', agentEntityId: run.agentEntityId }
    );

    // Execute run in background
    executeRun(run.id).catch((err) => {
      console.error(`[agent-trigger] Run ${run.id} failed:`, err);
    });
  }

  return createdRuns;
}
