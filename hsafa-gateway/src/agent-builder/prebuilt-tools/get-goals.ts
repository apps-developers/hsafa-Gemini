import { prisma } from '../../lib/db.js';
import { registerPrebuiltTool } from './registry.js';
import type { PrebuiltToolContext } from '../builder.js';

interface GetGoalsInput {
  includeCompleted?: boolean;
  onlyLongTerm?: boolean;
}

registerPrebuiltTool('getGoals', {
  defaultDescription: 'Retrieve your current goals. Use this to review what you are working toward, check priorities, and see progress.',

  inputSchema: {
    type: 'object',
    properties: {
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed goals. Default: false.',
      },
      onlyLongTerm: {
        type: 'boolean',
        description: 'Only return long-term goals. Default: false.',
      },
    },
  },

  async execute(input: unknown, context: PrebuiltToolContext) {
    const { includeCompleted, onlyLongTerm } = (input || {}) as GetGoalsInput;
    const { agentEntityId } = context;

    const where: any = { entityId: agentEntityId };

    if (!includeCompleted) {
      where.isCompleted = false;
    }

    if (onlyLongTerm) {
      where.isLongTerm = true;
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      goals: goals.map((g) => ({
        id: g.id,
        description: g.description,
        priority: g.priority,
        isLongTerm: g.isLongTerm,
        isCompleted: g.isCompleted,
        createdAt: g.createdAt.toISOString(),
      })),
      totalGoals: goals.length,
    };
  },
});
