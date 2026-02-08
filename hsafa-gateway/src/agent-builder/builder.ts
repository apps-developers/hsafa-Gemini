import { ToolLoopAgent, stepCountIs } from 'ai';
import { validateAgentConfig, interpolateConfigEnvVars } from './parser';
import { resolveModel, getModelSettings } from './model-resolver';
import { resolveTools } from './tool-resolver';
import { resolveMCPClients, loadMCPTools, closeMCPClients, type MCPClientWrapper } from './mcp-resolver';
import { initPrebuiltTools } from './prebuilt-tools/registry';
import type { AgentConfig } from './types';

export interface PrebuiltToolContext {
  runId: string;
  agentEntityId: string;
  smartSpaceId: string;
  agentId: string;
}

export interface BuildAgentOptions {
  config: AgentConfig;
  runContext?: PrebuiltToolContext;
}

export interface BuildAgentResult {
  agent: ToolLoopAgent;
  config: AgentConfig;
  mcpClients: MCPClientWrapper[];
}

export class AgentBuildError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AgentBuildError';
  }
}

export async function buildAgent(options: BuildAgentOptions): Promise<BuildAgentResult> {
  const { config } = options;

  let validatedConfig: AgentConfig;
  try {
    validatedConfig = validateAgentConfig(config);
    validatedConfig = interpolateConfigEnvVars(validatedConfig);
  } catch (error) {
    throw new AgentBuildError(
      `Failed to parse agent configuration: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }

  try {
    const model = resolveModel(validatedConfig.model);
    const modelSettings = getModelSettings(validatedConfig.model);

    // Ensure prebuilt tool handlers are registered
    await initPrebuiltTools();

    // Resolve static tools from agent config
    const staticTools = resolveTools(validatedConfig.tools ?? [], options.runContext);

    // Resolve MCP tools
    const mcpClients = await resolveMCPClients(validatedConfig.mcp);
    const mcpTools = await loadMCPTools(mcpClients, validatedConfig.mcp);

    // Merge all tools
    const allTools: Record<string, any> = { ...staticTools, ...mcpTools };

    const agent = new ToolLoopAgent({
      model,
      instructions: validatedConfig.agent.system,
      tools: allTools,
      toolChoice: (validatedConfig.loop?.toolChoice as any) ?? 'auto',
      stopWhen: stepCountIs(validatedConfig.loop?.maxSteps ?? 5),
      ...modelSettings,
    });

    return { agent, config: validatedConfig, mcpClients };
  } catch (error) {
    throw new AgentBuildError(
      `Failed to build agent: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}
