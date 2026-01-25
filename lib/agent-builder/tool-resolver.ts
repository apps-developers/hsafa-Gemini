import type { ToolConfig } from './types';
import { buildTool } from './tool-builder';

export function resolveTools(configs: ToolConfig[]): Record<string, any> {
  const tools: Record<string, any> = {};

  for (const config of configs) {
    tools[config.name] = buildTool(config);
  }

  return tools;
}
