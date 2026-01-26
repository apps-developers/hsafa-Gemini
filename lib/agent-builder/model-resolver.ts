import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
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

  try {
    switch (provider.toLowerCase()) {
      case 'openai': {
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        return openai(name);
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
  return {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
  };
}
