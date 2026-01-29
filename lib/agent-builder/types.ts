import { z } from 'zod';

export type JSONValue =
  | null
  | string
  | number
  | boolean
  | { [key: string]: JSONValue | undefined }
  | JSONValue[];

export type JSONObject = { [key: string]: JSONValue | undefined };

export type ProviderOptions = Record<string, JSONObject>;

const JsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const JsonValueSchema: z.ZodType<JSONValue> = z.lazy(
  () =>
    z.union([
      JsonPrimitiveSchema,
      z.array(JsonValueSchema),
      z.record(z.string(), JsonValueSchema),
    ]) as z.ZodType<JSONValue>
);

const JsonObjectSchema: z.ZodType<JSONObject> = z.record(z.string(), JsonValueSchema);

export const OpenAIProviderOptionsSchema: z.ZodType<JSONObject> = z
  .object({
    parallelToolCalls: z.boolean().optional(),
    store: z.boolean().optional(),
    user: z.string().optional(),

    reasoningEffort: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']).optional(),
    reasoningSummary: z.enum(['auto', 'detailed']).optional(),
    systemMessageMode: z.enum(['system', 'developer', 'remove']).optional(),
    forceReasoning: z.boolean().optional(),

    serviceTier: z.enum(['auto', 'flex', 'priority', 'default']).optional(),
    textVerbosity: z.enum(['low', 'medium', 'high']).optional(),
  })
  .catchall(JsonValueSchema) as unknown as z.ZodType<JSONObject>;

export const AnthropicProviderOptionsSchema: z.ZodType<JSONObject> = z
  .object({
    disableParallelToolUse: z.boolean().optional(),
    sendReasoning: z.boolean().optional(),
    effort: z.enum(['high', 'medium', 'low']).optional(),
    thinking: z
      .discriminatedUnion('type', [
        z.object({
          type: z.literal('enabled'),
          budgetTokens: z.number().int().positive(),
        }),
        z.object({
          type: z.literal('disabled'),
        }),
      ])
      .optional(),
    toolStreaming: z.boolean().optional(),
    structuredOutputMode: z.enum(['outputFormat', 'jsonTool', 'auto']).optional(),
  })
  .catchall(JsonValueSchema) as unknown as z.ZodType<JSONObject>;

export const GoogleProviderOptionsSchema: z.ZodType<JSONObject> = z
  .object({
    thinkingConfig: z
      .object({
        thinkingLevel: z.enum(['minimal', 'low', 'medium', 'high']).optional(),
        thinkingBudget: z.number().int().nonnegative().optional(),
        includeThoughts: z.boolean().optional(),
      })
      .optional(),
  })
  .catchall(JsonValueSchema);

export const XaiProviderOptionsSchema: z.ZodType<JSONObject> = z
  .object({
    reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
    store: z.boolean().optional(),
    previousResponseId: z.string().optional(),
  })
  .catchall(JsonValueSchema);

export const ProviderOptionsSchema: z.ZodType<ProviderOptions> = z
  .object({
    openai: OpenAIProviderOptionsSchema.optional(),
    anthropic: AnthropicProviderOptionsSchema.optional(),
    google: GoogleProviderOptionsSchema.optional(),
    xai: XaiProviderOptionsSchema.optional(),
  })
  .catchall(JsonObjectSchema) as unknown as z.ZodType<ProviderOptions>;

export const ReasoningConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    effort: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']).optional(),
    budgetTokens: z.number().int().positive().optional(),
    includeThoughts: z.boolean().optional(),
    summary: z.enum(['auto', 'detailed']).optional(),
    systemMessageMode: z.enum(['system', 'developer', 'remove']).optional(),
    forceReasoning: z.boolean().optional(),
  })
  .catchall(JsonValueSchema);

export const ModelConfigSchema = z.object({
  provider: z.string(),
  name: z.string(),
  api: z.enum(['default', 'responses', 'chat', 'completion']).optional().default('default'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxOutputTokens: z.number().positive().optional().default(1000),
  reasoning: ReasoningConfigSchema.optional(),
  providerOptions: ProviderOptionsSchema.optional(),
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
  queryParams: z.record(z.string(), z.unknown()).optional(),
  body: z.unknown().optional(),
  timeout: z.number().optional().default(30000),
});

export const AiAgentExecutionSchema = z.object({
  agentConfig: z.record(z.string(), z.unknown()),
  includeContext: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(false),
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
  provider: z.enum(['dall-e', 'stable-diffusion']),
  size: z.string().optional().default('1024x1024'),
  quality: z.enum(['standard', 'hd']).optional().default('standard'),
  style: z.string().optional(),
  includeContext: z.boolean().optional().default(false),
});

export const ToolSchema = z.preprocess(
  (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const v = value as Record<string, unknown>;
      if (v.executionType == null) return { ...v, executionType: 'basic' };
    }
    return value;
  },
  z.discriminatedUnion('executionType', [
    z.object({
      name: z.string(),
      description: z.string().optional(),
      inputSchema: z.unknown(),
      executionType: z.literal('basic'),
      execution: BasicExecutionSchema.nullable().optional(),
    }),
    z.object({
      name: z.string(),
      description: z.string().optional(),
      inputSchema: z.unknown(),
      executionType: z.literal('request'),
      execution: RequestExecutionSchema,
    }),
    z.object({
      name: z.string(),
      description: z.string().optional(),
      inputSchema: z.unknown(),
      executionType: z.literal('waiting'),
      execution: WaitingExecutionSchema.nullable().optional(),
    }),
    z.object({
      name: z.string(),
      description: z.string().optional(),
      inputSchema: z.unknown(),
      executionType: z.literal('compute'),
      execution: ComputeExecutionSchema,
    }),
    z.object({
      name: z.string(),
      description: z.string().optional(),
      inputSchema: z.unknown().optional(),
      executionType: z.literal('ai-agent'),
      execution: AiAgentExecutionSchema,
    }),
    z.object({
      name: z.string(),
      description: z.string().optional(),
      inputSchema: z.unknown().optional(),
      executionType: z.literal('image-generator'),
      execution: ImageGeneratorExecutionSchema,
    }),
  ])
);

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
export type ReasoningConfig = z.infer<typeof ReasoningConfigSchema>;
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
