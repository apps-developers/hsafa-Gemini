import { Router } from 'express';
import { loadAgentConfig, agentConfigExists } from '../utils/load-agent-config.js';

export const agentConfigRouter = Router();

agentConfigRouter.get('/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;

    if (!agentName) {
      return res.status(400).json({
        error: 'Agent name is required'
      });
    }

    if (!agentConfigExists(agentName)) {
      return res.status(404).json({
        error: `Agent config not found: ${agentName}`
      });
    }

    const agentConfig = loadAgentConfig(agentName);

    return res.json({
      agentName,
      agentConfig,
    });
  } catch (error) {
    console.error('[Agent Config API Error]', error);
    return res.status(500).json({
      error: 'Failed to load agent config',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
