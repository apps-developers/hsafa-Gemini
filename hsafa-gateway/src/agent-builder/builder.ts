import { ToolLoopAgent, stepCountIs } from 'ai';
import { validateAgentConfig, interpolateConfigEnvVars } from './parser';
import { resolveModel, getModelSettings } from './model-resolver';
import { resolveTools } from './tool-resolver';
import { buildTool } from './tool-builder';
import { resolveMCPClients, loadMCPTools, closeMCPClients, type MCPClientWrapper } from './mcp-resolver';
import type { AgentConfig } from './types';

export interface BuildAgentOptions {
  config: AgentConfig;
}

export interface BuildAgentResult {
  agent: ToolLoopAgent;
  config: AgentConfig;
  mcpClients?: MCPClientWrapper[];
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

  let mcpClients: MCPClientWrapper[] = [];

  try {
    const model = resolveModel(validatedConfig.model);
    const modelSettings = getModelSettings(validatedConfig.model);
    
    const configTools = validatedConfig.tools && validatedConfig.tools.length > 0 
      ? resolveTools(validatedConfig.tools) 
      : {};

    mcpClients = await resolveMCPClients(validatedConfig.mcp);
    const mcpTools = await loadMCPTools(mcpClients, validatedConfig.mcp);

    const tools = { ...configTools, ...mcpTools } as Record<string, ReturnType<typeof buildTool>>;
    const finalTools = Object.keys(tools).length > 0 ? tools : undefined;

    const agent = new ToolLoopAgent({
      model,
      instructions: validatedConfig.agent.system,
      stopWhen: stepCountIs(validatedConfig.loop?.maxSteps ?? 20),
      toolChoice: validatedConfig.loop?.toolChoice ?? 'auto',
      tools: finalTools,
      ...modelSettings,
    });

    return { agent, config: validatedConfig, mcpClients };
  } catch (error) {
    await closeMCPClients(mcpClients);
    throw new AgentBuildError(
      `Failed to build agent: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}
