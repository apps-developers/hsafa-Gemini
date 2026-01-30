import type { ToolExecutionOptions } from 'ai';
import { generateImage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { ImageGeneratorExecution } from '../types';

function mapSize(size: string): `${number}x${number}` | undefined {
  const normalized = size.trim().toLowerCase();
  if (normalized === 'square') return '1024x1024';
  if (normalized === 'landscape') return '1792x1024';
  if (normalized === 'portrait') return '1024x1792';
  if (/^\d+x\d+$/.test(normalized)) return normalized as `${number}x${number}`;
  return undefined;
}

export async function executeImageGenerator(
  execution: ImageGeneratorExecution,
  input: unknown,
  options?: ToolExecutionOptions
): Promise<unknown> {
  const prompt =
    input && typeof input === 'object' && 'prompt' in (input as Record<string, unknown>)
      ? String((input as Record<string, unknown>).prompt ?? '')
      : '';

  if (!prompt) {
    throw new Error('Image generator requires a prompt');
  }

  if (execution.provider !== 'dall-e') {
    throw new Error(`Image generator provider not supported yet: ${execution.provider}`);
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const started = Date.now();
  const size = mapSize(execution.size);
  const { images } = await generateImage({
    model: openai.image('dall-e-3'),
    prompt,
    ...(size ? { size } : {}),
    providerOptions: {
      openai: {
        quality: execution.quality,
        ...(execution.style ? { style: execution.style } : {}),
      },
    },
    abortSignal: options?.abortSignal,
  });

  return {
    success: true,
    provider: execution.provider,
    images: images.map((img) => ({
      base64: img.base64,
      mediaType: img.mediaType,
    })),
    duration: Date.now() - started,
  };
}
