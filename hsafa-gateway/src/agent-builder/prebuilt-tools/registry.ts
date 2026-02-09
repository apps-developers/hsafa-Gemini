import type { PrebuiltToolContext } from '../builder.js';

export interface PrebuiltToolHandler {
  inputSchema: Record<string, unknown>;
  defaultDescription: string;
  execute: (input: unknown, context: PrebuiltToolContext) => Promise<unknown>;
}

const registry = new Map<string, PrebuiltToolHandler>();

export function registerPrebuiltTool(action: string, handler: PrebuiltToolHandler): void {
  registry.set(action, handler);
}

let _initPromise: Promise<void> | null = null;

export async function initPrebuiltTools(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    await import('./set-goals.js');
    await import('./delete-goals.js');
    await import('./get-memories.js');
    await import('./set-memories.js');
    await import('./delete-memories.js');
    await import('./get-plans.js');
    await import('./set-plans.js');
    await import('./delete-plans.js');
    await import('./go-to-space.js');
  })();
  return _initPromise;
}

export function getPrebuiltHandler(action: string): PrebuiltToolHandler | undefined {
  return registry.get(action);
}

export function getAllPrebuiltHandlers(): Map<string, PrebuiltToolHandler> {
  return registry;
}
