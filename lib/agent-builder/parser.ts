import { AgentConfigSchema, type AgentConfig } from './types';

export class AgentConfigParseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AgentConfigParseError';
  }
}

export function validateAgentConfig(config: unknown): AgentConfig {
  try {
    if (!config || typeof config !== 'object') {
      throw new AgentConfigParseError('Invalid config: expected an object');
    }

    const validated = AgentConfigSchema.parse(config);
    
    return validated;
  } catch (error) {
    if (error instanceof AgentConfigParseError) {
      throw error;
    }
    
    throw new AgentConfigParseError(
      `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

export function interpolateEnvVars(value: string, env: Record<string, string | undefined> = process.env): string {
  return value.replace(/\$\{env\.([^}]+)\}/g, (_, varName) => {
    const envValue = env[varName];
    if (envValue === undefined) {
      throw new AgentConfigParseError(
        `Environment variable ${varName} is not defined`
      );
    }
    return envValue;
  });
}

export function interpolateConfigEnvVars(config: AgentConfig): AgentConfig {
  const cloned = structuredClone(config);
  
  if (cloned.tools) {
    for (const tool of cloned.tools) {
      if (tool.type === 'http' && tool.http.headers) {
        for (const [key, value] of Object.entries(tool.http.headers)) {
          tool.http.headers[key] = interpolateEnvVars(value);
        }
      }
    }
  }
  
  if (cloned.mcp?.servers) {
    for (const server of cloned.mcp.servers) {
      if (server.headers) {
        for (const [key, value] of Object.entries(server.headers)) {
          server.headers[key] = interpolateEnvVars(value);
        }
      }
    }
  }
  
  return cloned;
}
