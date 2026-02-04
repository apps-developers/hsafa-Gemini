import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redis } from './redis.js';
import { prisma } from './db.js';
import { submitToolResult } from './tool-results.js';

interface ClientConnection {
  ws: WebSocket;
  clientId: string;
}

const clientConnections = new Map<string, ClientConnection>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/clients/connect'
  });

  wss.on('connection', async (ws: WebSocket) => {
    let clientConnection: ClientConnection | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'client.register': {
            const { entityId, clientKey, clientType, displayName, capabilities } = message.data ?? {};

            if (!entityId || typeof entityId !== 'string') {
              ws.send(JSON.stringify({ type: 'error', error: 'Missing required field: entityId' }));
              return;
            }
            if (!clientKey || typeof clientKey !== 'string') {
              ws.send(JSON.stringify({ type: 'error', error: 'Missing required field: clientKey' }));
              return;
            }

            const client = await prisma.client.upsert({
              where: { clientKey },
              create: {
                entityId,
                clientKey,
                clientType: typeof clientType === 'string' ? clientType : null,
                displayName: typeof displayName === 'string' ? displayName : null,
                capabilities: (capabilities && typeof capabilities === 'object' ? capabilities : {}) as any,
                lastSeenAt: new Date(),
              },
              update: {
                entityId,
                clientType: typeof clientType === 'string' ? clientType : undefined,
                displayName: typeof displayName === 'string' ? displayName : undefined,
                capabilities: (capabilities && typeof capabilities === 'object' ? capabilities : undefined) as any,
                lastSeenAt: new Date(),
              },
            });

            clientConnection = { ws, clientId: client.id };
            clientConnections.set(client.id, clientConnection);

            ws.send(
              JSON.stringify({
                type: 'client.registered',
                data: {
                  clientId: client.id,
                },
              })
            );

            await redis.setex(`client:${client.id}:presence`, 60, 'online');

            console.log(`✅ Client connected: ${clientKey} (${client.id})`);
            break;
          }

          case 'tool.result': {
            const { runId, callId, result } = message.data;

            if (!runId || typeof runId !== 'string' || !callId || typeof callId !== 'string') {
              ws.send(JSON.stringify({ type: 'error', error: 'Missing required fields: runId, callId' }));
              return;
            }

            await submitToolResult({
              runId,
              callId,
              result,
              source: 'client',
              clientId: clientConnection?.clientId ?? null,
            });

            console.log(`✅ Tool result received: ${callId}`);
            break;
          }

          case 'ping': {
            if (clientConnection) {
              await redis.setex(`client:${clientConnection.clientId}:presence`, 60, 'online');
              await prisma.client.update({
                where: { id: clientConnection.clientId },
                data: { lastSeenAt: new Date() },
              });
            }
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    });

    ws.on('close', async () => {
      if (clientConnection) {
        clientConnections.delete(clientConnection.clientId);
        await redis.del(`client:${clientConnection.clientId}:presence`);

        console.log(`🔌 Client disconnected: ${clientConnection.clientId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('🔌 WebSocket server ready at /api/clients/connect');
  return wss;
}

export async function dispatchToolCallToClient(
  clientId: string,
  toolCall: {
    runId: string;
    callId: string;
    toolName: string;
    args: Record<string, unknown>;
  }
): Promise<void> {
  const connection = clientConnections.get(clientId);

  if (connection) {
    connection.ws.send(
      JSON.stringify({
        type: 'tool.call.request',
        data: toolCall,
      })
    );
  }

  await redis.xadd(
    `client:${clientId}:inbox`,
    '*',
    'type',
    'tool.call.request',
    'ts',
    new Date().toISOString(),
    'payload',
    JSON.stringify(toolCall)
  );
}
