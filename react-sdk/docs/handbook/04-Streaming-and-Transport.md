# 04 — Streaming & Transport

The SDK uses Vercel AI SDK v5 for robust, incremental streaming of assistant responses, tool calls, and UI instructions.

## Transport

- File: `sdk/src/components/hsafa-chat/utils/transport.ts`
- Function: `createHsafaTransport(baseUrl, agentId, chatId)`
  - Wraps `DefaultChatTransport` to point to `POST {baseUrl}/api/run/:agentId`.
  - Injects `chatId` into the request body so the server can correlate sessions.

```ts
import { DefaultChatTransport } from 'ai';

export function createHsafaTransport(baseUrl: string, agentId: string, chatId: string) {
  return new DefaultChatTransport({
    api: `${baseUrl}/api/run/${agentId}`,
    fetch: async (input, init) => {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const enhancedBody = { ...body, chatId };
      return fetch(input, { ...init, body: JSON.stringify(enhancedBody) });
    },
  });
}
```

## Client streaming: useChat (v5)

Both `HsafaChat` and `useHsafaAgent` wire `useChat({ transport, sendAutomaticallyWhen, onToolCall, onFinish, onError })`.

- `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` — automatically resubmits after tool results are added.
- `onToolCall` — resolves frontend tools and UI rendering.
- `addToolResult({ tool, toolCallId, output | state: 'output-error', errorText })` — posts results/errors back to the assistant message.

### UI tool calls

- If the tool name is `'ui'` or matches a registered UI component, rendering is deferred to the message renderer (`MessageList/AssistantMassage`).
- Success/error is acknowledged via `onUISuccess(toolCallId, toolName)` / `onUIError(toolCallId, toolName, error)` which then call `addToolResult`.

### Request input (inline forms)

- Special tool `'requestInput'` renders a form inside the message using `renderUserForm.ts`.
- The form posts a tool result when submitted or skipped.

## Server streaming

- File: `server/src/modules/agents/run-agent-handler.ts`
- Core pipeline:
  1) Parse `UIMessage[]` from request body (AI SDK v5 format) and convert to model messages via `convertToModelMessages()`.
  2) Build model/tools (including MCP) using `run-core/*`.
  3) Call `streamText({ model, tools, messages, ... })`.
  4) Convert to a UI message stream: `const uiStream = agentResponse.toUIMessageStream({ originalMessages: uiMessages })`.
  5) Send with `createUIMessageStreamResponse({ stream, originalMessages })`.

### Event types

Common NDJSON events (consumed by the AI SDK v5 UI layer):

- Text: `text-delta`, `text-end`
- Reasoning: `reasoning-start`, `reasoning-delta`, `reasoning-end`
- Tools: `tool-call`, `tool-result`, `tool-error`
- Final: `final` (with `value.items`)
- Error: `error`

The client’s `useChat` integrates these automatically into assistant messages.

## File uploads

- Hook: `useFileUploadHook(baseUrl?)`
- Endpoint: `POST {baseUrl}/api/uploads`
- Response JSON should include: `{ id, name, url, mimeType, size }`.

Uploaded files are attached to the next user message as AI SDK v5 file parts (the SDK converts `url` to proper `data` where needed).
