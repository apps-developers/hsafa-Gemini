import { ToolLoopAgent, stepCountIs } from 'ai';
import { validateAgentConfig, interpolateConfigEnvVars } from './parser';
import { resolveModel, getModelSettings } from './model-resolver';
import type { AgentConfig } from './types';

export interface BuildAgentOptions {
  config: AgentConfig;
}

export interface BuildAgentResult {
  agent: ToolLoopAgent;
  config: AgentConfig;
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

    const agent = new ToolLoopAgent({
      model,
      instructions: validatedConfig.agent.system,
      stopWhen: stepCountIs(validatedConfig.loop?.maxSteps ?? 20),
      toolChoice: validatedConfig.loop?.toolChoice ?? 'auto',
      ...modelSettings,
    });

    return { agent, config: validatedConfig };
  } catch (error) {
    throw new AgentBuildError(
      `Failed to build agent: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}
