import { ToolLoopAgent, stepCountIs } from 'ai';
import { parseAgentYaml, interpolateConfigEnvVars } from './parser';
import { resolveModel, getModelSettings } from './model-resolver';
import type { AgentYamlConfig } from './types';

export interface BuildAgentOptions {
  yamlConfig: string;
}

export interface BuildAgentResult {
  agent: ToolLoopAgent;
  config: AgentYamlConfig;
}

export class AgentBuildError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AgentBuildError';
  }
}

export async function buildAgent(options: BuildAgentOptions): Promise<BuildAgentResult> {
  const { yamlConfig } = options;

  let config: AgentYamlConfig;
  try {
    config = parseAgentYaml(yamlConfig);
    config = interpolateConfigEnvVars(config);
  } catch (error) {
    throw new AgentBuildError(
      `Failed to parse agent configuration: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }

  try {
    const model = resolveModel(config.model);
    const modelSettings = getModelSettings(config.model);

    const agent = new ToolLoopAgent({
      model,
      instructions: config.agent.system,
      stopWhen: stepCountIs(config.loop?.maxSteps ?? 5),
      toolChoice: config.loop?.toolChoice ?? 'auto',
      ...modelSettings,
    });

    return { agent, config };
  } catch (error) {
    throw new AgentBuildError(
      `Failed to build agent: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}
