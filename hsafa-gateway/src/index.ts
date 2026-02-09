import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { agentsRouter } from './routes/agents.js';
import { entitiesRouter } from './routes/entities.js';
import { smartSpacesRouter } from './routes/smart-spaces.js';
import { clientsRouter } from './routes/clients.js';
import { runsRouter } from './routes/runs.js';
import { prisma } from './lib/db.js';
import { redis } from './lib/redis.js';
import { setupWebSocketServer } from './lib/websocket.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-public-key',
    'x-secret-key',
    'x-request-id',
    'Cache-Control',
  ],
  exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection', 'X-Accel-Buffering'],
  credentials: false,
}));
app.use(express.json());

app.use('/api/agents', agentsRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/smart-spaces', smartSpacesRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/runs', runsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hsafa-gateway' });
});

setupWebSocketServer(server);

server.listen(PORT, async () => {
  console.log(`🚀 Hsafa Gateway running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/agents`);
  console.log(`   GET  http://localhost:${PORT}/api/agents`);
  console.log(`   POST http://localhost:${PORT}/api/entities`);
  console.log(`   POST http://localhost:${PORT}/api/smart-spaces`);
  console.log(`   POST http://localhost:${PORT}/api/smart-spaces/:smartSpaceId/messages`);
  console.log(`   GET  http://localhost:${PORT}/api/smart-spaces/:smartSpaceId/stream (SSE)`);
  console.log(`   GET  http://localhost:${PORT}/api/runs/:runId`);
  console.log(`   GET  http://localhost:${PORT}/api/runs/:runId/stream (SSE)`);
  console.log(`   WS   ws://localhost:${PORT}/api/clients/connect`);
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
  
  try {
    await redis.ping();
    console.log('✅ Redis connected');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
});
