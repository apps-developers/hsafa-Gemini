import { tool, jsonSchema } from 'ai';
import type { ToolConfig } from './types';

function interpolateTemplate(template: Record<string, unknown>, variables: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(template);
  const interpolated = json.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = variables[key.trim()];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
  return JSON.parse(interpolated);
}

export function buildTool(config: ToolConfig) {
  const executionType = config.executionType || 'basic';
  const inputSchema = config.inputSchema || { type: 'object', properties: {} };

  const execution = config.execution;
  const isNoExecution = executionType === 'basic' && (!execution || !('mode' in execution));

  const toolConfig: any = {
    description: config.description,
    inputSchema: jsonSchema(inputSchema),
  };

  if (!isNoExecution) {
    toolConfig.execute = async (input: any) => {
      switch (executionType) {
        case 'basic':
          return executeBasic(config, input);
        case 'request':
          return executeRequest(config, input);
        case 'ai-agent':
          return executeAiAgent(config, input);
        case 'waiting':
          return executeWaiting(config, input);
        case 'compute':
          return executeCompute(config, input);
        case 'image-generator':
          return executeImageGenerator(config, input);
        default:
          throw new Error(`Unknown execution type: ${executionType}`);
      }
    };
  }

  return tool(toolConfig);
}

function executeBasic(config: ToolConfig, input: any) {
  const execution = config.execution;
  
  if (!execution || !('mode' in execution)) {
    return {
      success: true,
      output: input,
      mode: 'no-execution',
      pendingResult: true,
    };
  }

  const mode = execution.mode || 'no-execution';

  if (mode === 'static') {
    let output = execution.output || {};
    
    if (execution.template && input.variables) {
      output = interpolateTemplate(output, input.variables);
    }
    
    return {
      success: true,
      output,
      mode: 'static',
    };
  }
  
  if (mode === 'pass-through') {
    return {
      success: true,
      output: input,
      mode: 'pass-through',
    };
  }
  
  return {
    success: true,
    output: input,
    mode: 'no-execution',
    pendingResult: true,
  };
}

async function executeRequest(config: ToolConfig, input: any) {
  const execution = config.execution;
  
  if (!execution || !('url' in execution)) {
    throw new Error('Request execution requires url configuration');
  }

  let url = execution.url;
  let headers = execution.headers || {};
  
  url = interpolateString(url, input);
  headers = Object.entries(headers).reduce((acc, [key, value]) => {
    acc[key] = interpolateString(value, input);
    return acc;
  }, {} as Record<string, string>);

  const response = await fetch(url, {
    method: execution.method,
    headers,
    body: execution.method !== 'GET' ? JSON.stringify(input) : undefined,
    signal: AbortSignal.timeout(execution.timeout || 30000),
  });

  const data = await response.json();
  
  return {
    success: response.ok,
    output: data,
    status: response.status,
  };
}

function interpolateString(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = variables[key.trim()];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

async function executeAiAgent(config: ToolConfig, input: any) {
  return {
    success: false,
    output: { error: 'AI Agent execution not yet implemented' },
    mode: 'ai-agent',
  };
}

async function executeWaiting(config: ToolConfig, input: any) {
  const execution = config.execution;
  const duration = input.duration || (execution && 'duration' in execution ? execution.duration : 0) || 0;
  const reason = input.reason || (execution && 'reason' in execution ? execution.reason : undefined);

  await new Promise(resolve => setTimeout(resolve, duration));
  
  return {
    success: true,
    output: {
      waited: duration,
      reason,
      timestamp: new Date().toISOString(),
    },
    mode: 'waiting',
  };
}

async function executeCompute(config: ToolConfig, input: any) {
  return {
    success: false,
    output: { error: 'Compute execution not yet implemented' },
    mode: 'compute',
  };
}

async function executeImageGenerator(config: ToolConfig, input: any) {
  return {
    success: false,
    output: { error: 'Image generator execution not yet implemented' },
    mode: 'image-generator',
  };
}
