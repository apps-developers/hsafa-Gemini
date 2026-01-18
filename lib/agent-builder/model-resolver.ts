import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { ModelConfig } from './types';

export class ModelResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelResolverError';
  }
}

export function resolveModel(config: ModelConfig): LanguageModel {
  const { provider, name } = config;

  switch (provider.toLowerCase()) {
    case 'openai': {
      return openai(name);
    }

    default:
      throw new ModelResolverError(
        `Unsupported model provider: ${provider}. Currently supported: openai`
      );
  }
}

export function getModelSettings(config: ModelConfig) {
  return {
    temperature: config.temperature,
    maxTokens: config.maxOutputTokens,
  };
}
