import { Router } from 'express';
import { createAgentUIStreamResponse } from 'ai';
import { buildAgent, AgentBuildError } from '../agent-builder/builder.js';

export const agentRouter = Router();

agentRouter.post('/', async (req, res) => {
  try {
    const { agentConfig, messages } = req.body;

    if (!agentConfig) {
      return res.status(400).json({
        error: 'Missing required field: agentConfig'
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Missing or invalid field: messages (must be an array)'
      });
    }

    const { agent } = await buildAgent({ config: agentConfig });

    const response = createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      abortSignal: req.signal,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'Failed to create stream' });
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();
  } catch (error) {
    console.error('[Agent API Error]', error);

    if (error instanceof AgentBuildError) {
      return res.status(400).json({
        error: 'Agent build failed',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
