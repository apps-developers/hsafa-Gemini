import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { jwtVerify } from 'jose';
import { redis } from './redis.js';
import { prisma } from './db.js';
import { submitToolResult } from './tool-results.js';

const HSAFA_SECRET_KEY = process.env.HSAFA_SECRET_KEY;
const HSAFA_PUBLIC_KEY = process.env.HSAFA_PUBLIC_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ENTITY_CLAIM = process.env.JWT_ENTITY_CLAIM || 'sub';

interface WsAuthContext {
  method: 'secret_key' | 'public_key_jwt';
  entityId?: string;
}

interface ClientConnection {
  ws: WebSocket;
  clientId: string;
}

const clientConnections = new Map<string, ClientConnection>();

/**
 * Authenticate a WebSocket upgrade request via query params.
 * Supports:
 *   ?secretKey=sk_...
 *   ?publicKey=pk_...&token=<jwt>
 */
async function authenticateWsRequest(req: IncomingMessage): Promise<WsAuthContext | null> {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const secretKey = url.searchParams.get('secretKey');
  const publicKey = url.searchParams.get('publicKey');
  const token = url.searchParams.get('token');

  // Secret key auth
  if (secretKey) {
    if (!HSAFA_SECRET_KEY || secretKey !== HSAFA_SECRET_KEY) return null;
    return { method: 'secret_key' };
  }

  // Public key + JWT auth
  if (publicKey && token) {
    if (!HSAFA_PUBLIC_KEY || publicKey !== HSAFA_PUBLIC_KEY) return null;
    if (!JWT_SECRET) return null;

    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      const externalId = typeof payload[JWT_ENTITY_CLAIM] === 'string' ? payload[JWT_ENTITY_CLAIM] : null;
      if (!externalId) return null;

      const entity = await prisma.entity.findUnique({
        where: { externalId },
        select: { id: true },
      });
      if (!entity) return null;

      return { method: 'public_key_jwt', entityId: entity.id };
    } catch {
      return null;
    }
  }

  return null;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/clients/connect'
  });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    // Authenticate the connection
    const auth = await authenticateWsRequest(req);
    if (!auth) {
      ws.send(JSON.stringify({ type: 'error', error: 'Authentication required. Pass secretKey or publicKey+token as query params.' }));
      ws.close(4001, 'Unauthorized');
      return;
    }

    let clientConnection: ClientConnection | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'client.register': {
            const { entityId: bodyEntityId, clientKey, clientType, displayName, capabilities } = message.data ?? {};

            // For JWT auth: force entityId from token (prevent impersonation)
            // For secret key auth: use entityId from message
            const entityId = auth.method === 'public_key_jwt'
              ? auth.entityId
              : bodyEntityId;

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
