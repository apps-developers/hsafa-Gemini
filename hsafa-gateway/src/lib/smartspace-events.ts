import { redis } from './redis.js';

export interface SmartSpaceEventContext {
  runId?: string;
  agentEntityId?: string;
}

export async function emitSmartSpaceEvent(
  smartSpaceId: string,
  type: string,
  data: Record<string, unknown>,
  context: SmartSpaceEventContext = {}
): Promise<{ id: string; seq: number; ts: string }> {
  const streamKey = `smartSpace:${smartSpaceId}:stream`;
  const notifyChannel = `smartSpace:${smartSpaceId}:notify`;
  const seqKey = `smartSpace:${smartSpaceId}:seq`;

  const seq = await redis.incr(seqKey);
  const ts = new Date().toISOString();

  const payload = {
    seq,
    smartSpaceId,
    runId: context.runId,
    agentEntityId: context.agentEntityId,
    data,
  };

  const id = await redis.xadd(streamKey, '*', 'type', type, 'ts', ts, 'payload', JSON.stringify(payload));
  if (!id) {
    throw new Error('Failed to write SmartSpace event to Redis stream');
  }

  await redis.publish(notifyChannel, JSON.stringify({ type, seq }));

  return { id, seq, ts };
}
