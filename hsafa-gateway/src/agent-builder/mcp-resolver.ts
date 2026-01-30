import { createMCPClient } from '@ai-sdk/mcp';
import type { McpConfig } from './types';

export interface MCPClientWrapper {
  client: Awaited<ReturnType<typeof createMCPClient>>;
  name: string;
}

export type MCPTools = Record<string, unknown>;

export async function resolveMCPClients(
  mcpConfig: McpConfig | undefined
): Promise<MCPClientWrapper[]> {
  if (!mcpConfig || !mcpConfig.servers || mcpConfig.servers.length === 0) {
    return [];
  }

  const clients: MCPClientWrapper[] = [];

  for (const serverConfig of mcpConfig.servers) {
    try {
      const client = await createMCPClient({
        transport: {
          type: serverConfig.transport,
          url: serverConfig.url,
          headers: serverConfig.headers,
        },
      });

      clients.push({
        client,
        name: serverConfig.name,
      });
    } catch (error) {
      console.warn(
        `Failed to connect to MCP server "${serverConfig.name}" at ${serverConfig.url}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return clients;
}

export async function loadMCPTools(
  clients: MCPClientWrapper[],
  mcpConfig: McpConfig | undefined
): Promise<MCPTools> {
  if (clients.length === 0) {
    return {};
  }

  const allTools: MCPTools = {};

  for (const { client, name } of clients) {
    try {
      const serverConfig = mcpConfig?.servers.find((s) => s.name === name);
      const tools = await client.tools();

      if (serverConfig?.allowedTools && serverConfig.allowedTools.length > 0) {
        for (const toolName of serverConfig.allowedTools) {
          if (tools[toolName]) {
            allTools[toolName] = tools[toolName];
          }
        }
      } else {
        Object.assign(allTools, tools);
      }
    } catch (error) {
      console.warn(
        `Failed to load tools from MCP server "${name}":`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return allTools;
}

export async function closeMCPClients(clients: MCPClientWrapper[]): Promise<void> {
  await Promise.allSettled(
    clients.map(async ({ client, name }) => {
      try {
        await client.close();
      } catch (error) {
        console.warn(
          `Failed to close MCP client "${name}":`,
          error instanceof Error ? error.message : String(error)
        );
      }
    })
  );
}
