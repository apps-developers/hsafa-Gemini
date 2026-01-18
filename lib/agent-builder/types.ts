import { z } from 'zod';

export const ModelConfigSchema = z.object({
  provider: z.string(),
  name: z.string(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxOutputTokens: z.number().positive().optional().default(1000),
});

export const AgentConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  system: z.string(),
});

export const LoopConfigSchema = z.object({
  maxSteps: z.number().positive().optional().default(5),
  toolChoice: z.enum(['auto', 'required', 'none']).optional().default('auto'),
});

export const RuntimeConfigSchema = z.object({
  response: z.object({
    type: z.enum(['ui-message-stream', 'text-stream']).default('ui-message-stream'),
  }),
});

export const HttpToolSchema = z.object({
  id: z.string(),
  type: z.literal('http'),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  http: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});

export const InlineJsToolSchema = z.object({
  id: z.string(),
  type: z.literal('inline_js'),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  runtime: z.object({
    sandbox: z.boolean().optional().default(true),
    timeoutMs: z.number().positive().optional().default(2000),
  }).optional(),
  execute: z.string(),
});

export const RegistryToolSchema = z.object({
  id: z.string(),
  type: z.literal('registry'),
  ref: z.string(),
  description: z.string().optional(),
});

export const ToolSchema = z.discriminatedUnion('type', [
  HttpToolSchema,
  InlineJsToolSchema,
  RegistryToolSchema,
]);

export const McpServerSchema = z.object({
  name: z.string(),
  url: z.string(),
  transport: z.enum(['http', 'websocket']),
  headers: z.record(z.string(), z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
});

export const McpConfigSchema = z.object({
  servers: z.array(McpServerSchema),
});

export const AgentYamlConfigSchema = z.object({
  version: z.string(),
  agent: AgentConfigSchema,
  model: ModelConfigSchema,
  loop: LoopConfigSchema.optional().default({
    maxSteps: 5,
    toolChoice: 'auto',
  }),
  tools: z.array(ToolSchema).optional().default([]),
  mcp: McpConfigSchema.optional(),
  runtime: RuntimeConfigSchema.optional().default({
    response: { type: 'ui-message-stream' },
  }),
});

export type AgentYamlConfig = z.infer<typeof AgentYamlConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type LoopConfig = z.infer<typeof LoopConfigSchema>;
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;
export type ToolConfig = z.infer<typeof ToolSchema>;
export type HttpToolConfig = z.infer<typeof HttpToolSchema>;
export type InlineJsToolConfig = z.infer<typeof InlineJsToolSchema>;
export type RegistryToolConfig = z.infer<typeof RegistryToolSchema>;
export type McpServerConfig = z.infer<typeof McpServerSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;
