import { prisma } from '../../lib/db.js';
import { registerPrebuiltTool } from './registry.js';
import type { PrebuiltToolContext } from '../builder.js';

interface DeleteGoalsInput {
  goalIds?: string[];
  deleteAll?: boolean;
}

registerPrebuiltTool('deleteGoals', {
  defaultDescription: 'Delete specific goals by ID, or delete all goals at once. Use this when the user wants to remove goals.',

  inputSchema: {
    type: 'object',
    properties: {
      goalIds: {
        type: 'array',
        description: 'IDs of specific goals to delete.',
        items: { type: 'string' },
      },
      deleteAll: {
        type: 'boolean',
        description: 'If true, delete all goals. Default: false.',
      },
    },
  },

  async execute(input: unknown, context: PrebuiltToolContext) {
    const { goalIds, deleteAll } = (input || {}) as DeleteGoalsInput;
    const { agentEntityId } = context;

    const deleted: Array<{ id: string; description: string }> = [];

    if (deleteAll) {
      const all = await prisma.goal.findMany({
        where: { entityId: agentEntityId },
      });
      await prisma.goal.deleteMany({
        where: { entityId: agentEntityId },
      });
      for (const g of all) {
        deleted.push({ id: g.id, description: g.description });
      }
    } else if (goalIds && goalIds.length > 0) {
      const toDelete = await prisma.goal.findMany({
        where: { id: { in: goalIds }, entityId: agentEntityId },
      });
      await prisma.goal.deleteMany({
        where: { id: { in: goalIds }, entityId: agentEntityId },
      });
      for (const g of toDelete) {
        deleted.push({ id: g.id, description: g.description });
      }
    }

    const remaining = await prisma.goal.findMany({
      where: { entityId: agentEntityId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      success: true,
      deleted,
      deletedCount: deleted.length,
      remainingGoals: remaining.map((g) => ({
        id: g.id,
        description: g.description,
        priority: g.priority,
        isLongTerm: g.isLongTerm,
        isCompleted: g.isCompleted,
      })),
      totalRemaining: remaining.length,
    };
  },
});
