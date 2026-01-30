import type { WaitingExecution } from '../types';

export async function executeWaiting(execution: WaitingExecution | null | undefined, input: unknown): Promise<unknown> {
  const inputObj = (input && typeof input === 'object' ? (input as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const durationMsFromSeconds =
    typeof inputObj.seconds === 'number' && Number.isFinite(inputObj.seconds)
      ? inputObj.seconds * 1000
      : undefined;

  const durationMsFromDuration =
    typeof inputObj.duration === 'number' && Number.isFinite(inputObj.duration)
      ? inputObj.duration
      : undefined;

  const configDuration = execution?.duration;

  const duration = (durationMsFromDuration ?? durationMsFromSeconds ?? configDuration ?? 0) as number;

  const reason =
    (typeof inputObj.reason === 'string' ? inputObj.reason : undefined) ??
    (typeof execution?.reason === 'string' ? execution.reason : undefined);

  await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, duration)));

  return {
    success: true,
    waited: duration,
    reason,
    timestamp: new Date().toISOString(),
  };
}
