import yaml from 'js-yaml';
import { AgentYamlConfigSchema, type AgentYamlConfig } from './types';

export class AgentConfigParseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AgentConfigParseError';
  }
}

export function parseAgentYaml(yamlString: string): AgentYamlConfig {
  try {
    const parsed = yaml.load(yamlString);
    
    if (!parsed || typeof parsed !== 'object') {
      throw new AgentConfigParseError('Invalid YAML: expected an object');
    }

    const validated = AgentYamlConfigSchema.parse(parsed);
    
    return validated;
  } catch (error) {
    if (error instanceof AgentConfigParseError) {
      throw error;
    }
    
    if (error instanceof yaml.YAMLException) {
      throw new AgentConfigParseError(
        `YAML parsing failed: ${error.message}`,
        error
      );
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

export function interpolateConfigEnvVars(config: AgentYamlConfig): AgentYamlConfig {
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
