import express from 'express';
import cors from 'cors';
import { agentRouter } from './routes/agent.js';
import { agentConfigRouter } from './routes/agent-config.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/agent', agentRouter);
app.use('/api/agent-config', agentConfigRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hsafa-gateway' });
});

app.listen(PORT, () => {
  console.log(`🚀 Hsafa Gateway running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/agent`);
  console.log(`   GET  http://localhost:${PORT}/api/agent-config/:agentName`);
});
