import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import type { LanguageModel } from 'ai';
import type { ModelConfig, ProviderOptions, ReasoningConfig, JSONObject } from './types';

export class ModelResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelResolverError';
  }
}

function mergeProviderOptions(
  provider: string,
  base: ProviderOptions | undefined,
  reasoning: ReasoningConfig | undefined
): ProviderOptions | undefined {
  const out: ProviderOptions = (base ? structuredClone(base) : {}) as ProviderOptions;

  if (!reasoning || reasoning.enabled === false) {
    return Object.keys(out).length > 0 ? out : undefined;
  }

  const providerId = provider.toLowerCase();

  if (providerId === 'openai') {
    const current = out.openai ?? {};
    const merged = {
      ...current,
      ...(reasoning.effort != null && current.reasoningEffort == null
        ? { reasoningEffort: reasoning.effort }
        : {}),
      ...(reasoning.summary != null && current.reasoningSummary == null
        ? { reasoningSummary: reasoning.summary }
        : {}),
      ...(reasoning.systemMessageMode != null && current.systemMessageMode == null
        ? { systemMessageMode: reasoning.systemMessageMode }
        : {}),
      ...(reasoning.forceReasoning != null && current.forceReasoning == null
        ? { forceReasoning: reasoning.forceReasoning }
        : {}),
    };

    if (Object.keys(merged).length > 0) out.openai = merged;
  }

  if (providerId === 'anthropic') {
    const current = out.anthropic ?? {};

    const hasThinking = current.thinking != null;
    const wantsThinking = reasoning.budgetTokens != null;

    if (reasoning.enabled === true && !hasThinking && !wantsThinking) {
      throw new ModelResolverError(
        'Reasoning is enabled for anthropic, but no thinking budget was provided. Set model.reasoning.budgetTokens or model.providerOptions.anthropic.thinking.'
      );
    }

    const merged = {
      ...current,
      ...(reasoning.budgetTokens != null && current.thinking == null
        ? { thinking: { type: 'enabled', budgetTokens: reasoning.budgetTokens } }
        : {}),
    };

    if (Object.keys(merged).length > 0) out.anthropic = merged;
  }

  if (providerId === 'google') {
    const current = (out.google ?? {}) as JSONObject;
    const currentThinkingValue = current.thinkingConfig;
    const currentThinking: JSONObject =
      currentThinkingValue &&
      typeof currentThinkingValue === 'object' &&
      !Array.isArray(currentThinkingValue)
        ? (currentThinkingValue as JSONObject)
        : {};

    const mappedThinkingLevel =
      reasoning.effort === 'minimal' ||
      reasoning.effort === 'low' ||
      reasoning.effort === 'medium' ||
      reasoning.effort === 'high'
        ? reasoning.effort
        : reasoning.effort === 'xhigh'
          ? 'high'
          : undefined;

    const mergedThinking = {
      ...currentThinking,
      ...(mappedThinkingLevel != null && currentThinking['thinkingLevel'] == null
        ? { thinkingLevel: mappedThinkingLevel }
        : {}),
      ...(reasoning.budgetTokens != null && currentThinking['thinkingBudget'] == null
        ? { thinkingBudget: reasoning.budgetTokens }
        : {}),
      ...(reasoning.includeThoughts != null && currentThinking['includeThoughts'] == null
        ? { includeThoughts: reasoning.includeThoughts }
        : {}),
    };

    const merged: JSONObject = {
      ...current,
      ...(Object.keys(mergedThinking).length > 0 ? { thinkingConfig: mergedThinking } : {}),
    };

    if (Object.keys(merged).length > 0) out.google = merged;
  }

  if (providerId === 'xai') {
    const current = out.xai ?? {};

    const mappedEffort: 'low' | 'medium' | 'high' | undefined =
      reasoning.effort === 'low' || reasoning.effort === 'minimal'
        ? 'low'
        : reasoning.effort === 'medium'
          ? 'medium'
          : reasoning.effort === 'high' || reasoning.effort === 'xhigh'
            ? 'high'
            : undefined;

    const merged = {
      ...current,
      ...(mappedEffort != null && current.reasoningEffort == null
        ? { reasoningEffort: mappedEffort }
        : {}),
    };

    if (Object.keys(merged).length > 0) out.xai = merged;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function resolveModel(config: ModelConfig): LanguageModel {
  const { provider, name, api } = config;

  try {
    switch (provider.toLowerCase()) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        switch (api) {
          case 'responses':
            return openai.responses(name);
          case 'chat':
            return openai.chat(name);
          case 'completion':
            return openai.completion(name);
          case 'default':
          default:
            return openai(name);
        }
      }
      
      case 'anthropic': {
        const anthropic = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        return anthropic(name);
      }
      
      case 'google': {
        const google = createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
        return google(name);
      }
      
      case 'xai': {
        const xai = createXai({
          apiKey: process.env.XAI_API_KEY,
        });
        if (api === 'responses') return xai.responses(name);
        return xai(name);
      }
      
      default:
        throw new ModelResolverError(
          `Unsupported provider: ${provider}. Supported providers: openai, anthropic, google, xai`
        );
    }
  } catch (error) {
    if (error instanceof ModelResolverError) {
      throw error;
    }
    throw new ModelResolverError(
      `Failed to resolve model ${provider}/${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function getModelSettings(config: ModelConfig) {
  const providerOptions = mergeProviderOptions(
    config.provider,
    config.providerOptions,
    config.reasoning
  );

  return {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    ...(providerOptions ? { providerOptions } : {}),
  };
}
