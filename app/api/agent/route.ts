import { createAgentUIStreamResponse } from 'ai';
import { buildAgent, AgentBuildError } from '@/lib/agent-builder/builder';

export const runtime = 'edge';

interface SimpleMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
}

function generateId(): string {
  return crypto.randomUUID();
}

function convertToUIMessages(messages: SimpleMessage[]): UIMessage[] {
  return messages.map((msg) => ({
    id: generateId(),
    role: msg.role,
    parts: [{ type: 'text', text: msg.content }],
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentYaml, messages } = body;

    if (!agentYaml) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: agentYaml' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid field: messages (must be an array)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { agent } = await buildAgent({ yamlConfig: agentYaml });

    const uiMessages = convertToUIMessages(messages);

    return createAgentUIStreamResponse({
      agent,
      uiMessages,
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
