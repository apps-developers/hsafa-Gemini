import { z } from 'zod';

export const ModelConfigSchema = z.object({
  provider: z.string(),
  name: z.string(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxOutputTokens: z.number().positive().optional().default(1000),
});

export const AgentDetailsSchema = z.object({
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

export const BasicExecutionSchema = z.object({
  mode: z.enum(['no-execution', 'static', 'pass-through']).default('no-execution'),
  output: z.record(z.string(), z.unknown()).optional(),
  template: z.boolean().optional().default(false),
});

export const RequestExecutionSchema = z.object({
  url: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().optional().default(30000),
});

export const AiAgentExecutionSchema = z.object({
  agentConfig: z.record(z.string(), z.unknown()),
  includeContext: z.boolean().optional().default(false),
  timeout: z.number().optional().default(30000),
});

export const WaitingExecutionSchema = z.object({
  duration: z.number().optional(),
  reason: z.string().optional(),
});

export const ComputeExecutionSchema = z.object({
  operation: z.string(),
  expression: z.string(),
});

export const ImageGeneratorExecutionSchema = z.object({
  provider: z.enum(['dall-e', 'stable-diffusion', 'midjourney']),
  size: z.string().optional().default('1024x1024'),
  quality: z.enum(['standard', 'hd']).optional().default('standard'),
  style: z.string().optional(),
  includeContext: z.boolean().optional().default(false),
});

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  executionType: z.enum(['basic', 'request', 'ai-agent', 'waiting', 'compute', 'image-generator']).optional().default('basic'),
  execution: z.union([
    BasicExecutionSchema,
    RequestExecutionSchema,
    AiAgentExecutionSchema,
    WaitingExecutionSchema,
    ComputeExecutionSchema,
    ImageGeneratorExecutionSchema,
  ]).nullable().optional(),
});

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

export const AgentConfigSchema = z.object({
  version: z.string(),
  agent: AgentDetailsSchema,
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

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type AgentDetails = z.infer<typeof AgentDetailsSchema>;
export type LoopConfig = z.infer<typeof LoopConfigSchema>;
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;
export type ToolConfig = z.infer<typeof ToolSchema>;
export type BasicExecution = z.infer<typeof BasicExecutionSchema>;
export type RequestExecution = z.infer<typeof RequestExecutionSchema>;
export type AiAgentExecution = z.infer<typeof AiAgentExecutionSchema>;
export type WaitingExecution = z.infer<typeof WaitingExecutionSchema>;
export type ComputeExecution = z.infer<typeof ComputeExecutionSchema>;
export type ImageGeneratorExecution = z.infer<typeof ImageGeneratorExecutionSchema>;
export type McpServerConfig = z.infer<typeof McpServerSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;
