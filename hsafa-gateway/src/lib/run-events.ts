import { Prisma } from '@prisma/client';
import { redis } from './redis.js';
import { prisma } from './db.js';

export type EmitEventFn = (type: string, payload: Record<string, unknown>) => Promise<void>;

/**
 * Creates an event emitter for a specific run.
 * Handles Redis streaming, pub/sub notification, and Postgres persistence.
 */
export async function createEmitEvent(runId: string): Promise<{ emitEvent: EmitEventFn }> {
  const streamKey = `run:${runId}:stream`;
  const notifyChannel = `run:${runId}:notify`;

  const last = await prisma.runEvent.findFirst({
    where: { runId },
    orderBy: { seq: 'desc' },
    select: { seq: true },
  });

  let seq = last?.seq ? Number(last.seq) : 0;

  const emitEvent: EmitEventFn = async (type, payload) => {
    seq += 1;
    const ts = new Date().toISOString();

    // Write to Redis Stream
    await redis.xadd(streamKey, '*', 'type', type, 'ts', ts, 'payload', JSON.stringify(payload));

    // Notify subscribers
    await redis.publish(notifyChannel, JSON.stringify({ type, seq }));

    // Persist to Postgres
    await prisma.runEvent.create({
      data: {
        runId,
        seq: BigInt(seq),
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  };

  return { emitEvent };
}

/**
 * Parses Redis Stream fields array into a map.
 * Redis returns fields as [k1, v1, k2, v2, ...], this converts to { k1: v1, k2: v2 }
 */
export function parseRedisFields(fields: string[]): Record<string, string> {
  const fieldMap: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    fieldMap[fields[i]] = fields[i + 1];
  }
  return fieldMap;
}

/**
 * Converts Redis Stream entry to SSE event format.
 */
export function toSSEEvent(id: string, fields: string[]) {
  const fieldMap = parseRedisFields(fields);
  return {
    id,
    type: fieldMap.type,
    ts: fieldMap.ts,
    data: fieldMap.payload ? JSON.parse(fieldMap.payload) : {},
  };
}

/**
 * Handles background execution errors consistently.
 */
export async function handleRunError(
  runId: string,
  error: unknown,
  emitEvent: EmitEventFn
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Run ${runId}] Background execution error:`, error);

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    },
  });

  await emitEvent('run.failed', { error: errorMessage });
}
