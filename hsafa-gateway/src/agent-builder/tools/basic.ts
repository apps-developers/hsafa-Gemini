import type { BasicExecution } from '../types';
import { getInterpolationVariables, interpolateAny } from './template';

export function isNoExecutionBasic(execution: BasicExecution | null | undefined): boolean {
  return execution == null || execution.mode === 'no-execution';
}

export function executeBasic(execution: BasicExecution | null | undefined, input: unknown): unknown {
  const mode = execution?.mode ?? 'no-execution';

  if (mode === 'static') {
    const vars = getInterpolationVariables(input);
    const output = execution?.template ? interpolateAny(execution.output ?? {}, vars) : execution?.output ?? {};
    const outputObj = output && typeof output === 'object' && !Array.isArray(output) ? (output as Record<string, unknown>) : {};

    return {
      success: true,
      ...outputObj,
    };
  }

  if (mode === 'pass-through') {
    const inputObj = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : { value: input };
    return {
      success: true,
      ...inputObj,
    };
  }

  return {
    success: true,
    ...(input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : { value: input }),
  };
}
