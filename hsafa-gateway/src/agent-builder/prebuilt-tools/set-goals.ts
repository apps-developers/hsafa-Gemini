import { prisma } from '../../lib/db.js';
import { registerPrebuiltTool } from './registry.js';
import type { PrebuiltToolContext } from '../builder.js';

interface GoalInput {
  id?: string;
  description: string;
  priority?: number;
  isLongTerm?: boolean;
  isCompleted?: boolean;
}

interface SetGoalsInput {
  goals: GoalInput[];
  clearExisting?: boolean;
  deleteGoalIds?: string[];
}

registerPrebuiltTool('setGoals', {
  defaultDescription: 'Set or update your goals. Use this to track objectives, priorities, and progress. You can create new goals, update existing ones, delete specific goals by ID, or clear all goals and start fresh.',

  inputSchema: {
    type: 'object',
    properties: {
      goals: {
        type: 'array',
        description: 'Goals to set or update.',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Existing goal ID to update. Omit to create a new goal.',
            },
            description: {
              type: 'string',
              description: 'What you want to achieve.',
            },
            priority: {
              type: 'number',
              description: 'Priority level (0 = lowest). Higher = more important.',
            },
            isLongTerm: {
              type: 'boolean',
              description: 'true for long-term/ongoing goals, false for short-term.',
            },
            isCompleted: {
              type: 'boolean',
              description: 'Mark as completed.',
            },
          },
          required: ['description'],
        },
      },
      clearExisting: {
        type: 'boolean',
        description: 'If true, remove all existing goals before setting new ones. Default: false.',
      },
      deleteGoalIds: {
        type: 'array',
        description: 'IDs of specific goals to delete.',
        items: { type: 'string' },
      },
    },
    required: ['goals'],
  },

  async execute(input: unknown, context: PrebuiltToolContext) {
    const { goals, clearExisting, deleteGoalIds } = input as SetGoalsInput;
    const { agentEntityId } = context;

    if (clearExisting) {
      await prisma.goal.deleteMany({
        where: { entityId: agentEntityId },
      });
    }

    const results: Array<{ action: string; id: string; description: string }> = [];

    if (deleteGoalIds && deleteGoalIds.length > 0) {
      const toDelete = await prisma.goal.findMany({
        where: { id: { in: deleteGoalIds }, entityId: agentEntityId },
      });
      await prisma.goal.deleteMany({
        where: { id: { in: deleteGoalIds }, entityId: agentEntityId },
      });
      for (const g of toDelete) {
        results.push({ action: 'deleted', id: g.id, description: g.description });
      }
    }

    for (const goal of goals) {
      if (goal.id) {
        const updated = await prisma.goal.update({
          where: { id: goal.id },
          data: {
            description: goal.description,
            priority: goal.priority ?? 0,
            isLongTerm: goal.isLongTerm ?? false,
            isCompleted: goal.isCompleted ?? false,
          },
        });
        results.push({ action: 'updated', id: updated.id, description: updated.description });
      } else {
        const created = await prisma.goal.create({
          data: {
            entityId: agentEntityId,
            description: goal.description,
            priority: goal.priority ?? 0,
            isLongTerm: goal.isLongTerm ?? false,
            isCompleted: goal.isCompleted ?? false,
          },
        });
        results.push({ action: 'created', id: created.id, description: created.description });
      }
    }

    const allGoals = await prisma.goal.findMany({
      where: { entityId: agentEntityId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      success: true,
      goalsModified: results,
      currentGoals: allGoals.map((g) => ({
        id: g.id,
        description: g.description,
        priority: g.priority,
        isLongTerm: g.isLongTerm,
        isCompleted: g.isCompleted,
      })),
      totalGoals: allGoals.length,
    };
  },
});
