import { createAgentUIStreamResponse } from 'ai';
import { buildAgent, AgentBuildError } from '@/lib/agent-builder/builder';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentConfig, messages } = body;

    if (!agentConfig) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: agentConfig' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid field: messages (must be an array)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert agentConfig to string if it's an object
    const configString = typeof agentConfig === 'string' ? agentConfig : JSON.stringify(agentConfig);
    const { agent } = await buildAgent({ configString });

    // Pass messages directly - AI SDK will handle validation and conversion
    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      abortSignal: request.signal,
    });
  } catch (error) {
    console.error('[Agent API Error]', error);

    if (error instanceof AgentBuildError) {
      return new Response(
        JSON.stringify({
          error: 'Agent build failed',
          message: error.message,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
