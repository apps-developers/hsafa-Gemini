import type { ToolExecutionOptions } from 'ai';
import type { RequestExecution } from '../types';
import { getInterpolationVariables, interpolateAny } from './template';

export async function executeRequest(
  execution: RequestExecution,
  input: unknown,
  options?: ToolExecutionOptions
): Promise<unknown> {
  const vars = getInterpolationVariables(input);

  const headers = interpolateAny(execution.headers ?? {}, vars) as Record<string, string>;
  const queryParams = interpolateAny(execution.queryParams ?? {}, vars) as Record<string, unknown>;

  const urlObj = new URL(interpolateAny(execution.url, vars));
  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) continue;
    urlObj.searchParams.set(key, String(value));
  }

  const method = execution.method;
  const timeoutMs = execution.timeout ?? 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.abortSignal) {
    if (options.abortSignal.aborted) controller.abort();
    else options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const signal = controller.signal;

  try {
    const body =
      method === 'GET'
        ? undefined
        : JSON.stringify(interpolateAny(execution.body ?? input, vars));

    const response = await fetch(urlObj.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
      signal,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data: unknown;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      success: response.ok,
      status: response.status,
      data,
      headers: responseHeaders,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
