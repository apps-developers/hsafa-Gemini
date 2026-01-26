import type { ToolConfig } from './types';
import { buildTool } from './tool-builder';

export function resolveTools(configs: ToolConfig[]): Record<string, ReturnType<typeof buildTool>> {
  const tools: Record<string, ReturnType<typeof buildTool>> = {};

  for (const config of configs) {
    tools[config.name] = buildTool(config);
  }

  return tools;
}
