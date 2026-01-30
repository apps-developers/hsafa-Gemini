# 08 — Server Integration

This document explains the server contract expected by the SDK and how the provided server module implements it.

## Endpoints

- `POST /api/run/:agentId`
  - Consumes Vercel AI SDK v5 UI messages from the client.
  - Streams NDJSON events back to the client.
- `POST /api/uploads`
  - Receives file uploads and returns JSON: `{ id, name, url, mimeType, size }`.

## Request/response contract

- Client uses `DefaultChatTransport` via `createHsafaTransport(baseUrl, agentId, chatId)` and posts:
  ```json
  {
    "messages": [ /* UIMessage[] (AI SDK v5) */ ],
    "chatId": "chat_...", // injected by the SDK
    "...extra": {}
  }
  ```
- Server streams NDJSON produced from `toUIMessageStream()` and wraps it using `createUIMessageStreamResponse()`.

## Reference implementation

File: `server/src/modules/agents/run-agent-handler.ts`

Key steps:
1) Parse body; extract `uiMessages` (AI SDK v5 messages).
2) Load agent definition from Prisma (`agent`, `flowNodes`, `flowEdges`).
3) Resolve nodes: model, system prompt(s), prompt(s), temperature, MCP, tool nodes.
4) Build model factory; gather tool model factories from node API keys.
5) `convertToModelMessages(uiMessages)` → model messages.
6) `streamText({ model, tools, messages, ... })` using Vercel AI SDK.
7) Convert to UI stream: `toUIMessageStream({ originalMessages: uiMessages })`.
8) Send `createUIMessageStreamResponse({ stream, originalMessages: uiMessages })`.
9) Cleanup MCP clients after stream consumption.

```ts
// Example usage in a Next.js route
export const runtime = 'edge';
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return handleRunAgentRequest(req, ctx);
}
```

### Tools on the server

- Tool nodes are collected from the agent graph (`run-core/tools.ts`, `run-core/tools/*`).
- MCP (Model Context Protocol) tools are created in `run-core/mcp.ts` from `custom_mcp` or legacy `mcp_*` nodes.
- The final `tools` map merges MCP tools and regular tools, namespaced to avoid collisions.

### Model providers

- The server supports multiple providers via `run-core/models.ts`.
- The agent’s model node selects provider, model name, and API key.

### System prompt

- Built from nodes in `run-core/prompts.ts` (also merges available tool info and MCP configuration).

### Error handling

- All stream errors are emitted as `{ type: 'error', errorText }` events to the client.
- Handler returns `500` with JSON for pre-stream errors.

## Security and performance

- Use Edge runtime for lower latency streaming (`export const runtime = 'edge'`).
- Validate API keys and user access when loading agents.
- Consider rate-limiting and auth for `/api/run/:agentId`.

## Customizing the server

- Add new tools in `run-core/tools/` and wire them in `run-core/tools.ts`.
- Extend prompts and templates in `run-core/prompts.ts`.
- Add model providers or tweak options in `run-core/models.ts`.

## Relationship to the client

- Client `HsafaChat`/`useHsafaAgent` expects standard AI SDK v5 semantics.
- Frontend-only tools and UI components are resolved on the client side (`onToolCall`).
- Server tools must be declared and available in the `tools` map.
