# 00 — Overview

This overview orients you across the SDK codebase, the Agent Studio client, and the server agent runtime.

- SDK package root: `sdk/`
- Public entry: `sdk/src/index.ts`
- Provider: `sdk/src/providers/HsafaProvider.tsx`
- Primary UI: `sdk/src/components/HsafaChat.tsx`
- Headless hooks: `sdk/src/hooks/*`
- Built-in tools/UI for the agent: `sdk/src/components/hsafa-chat/utils/`
- Client Agent Studio: `client/src/features/agent/`
- Server agent runtime: `server/src/modules/agents/`

## Repository map (selected)

- `sdk/`
  - `src/index.ts` — re-exports components, hooks, providers, and types.
  - `src/providers/HsafaProvider.tsx` — context with config and streaming/open state.
  - `src/components/HsafaChat.tsx` — production chat component built on Vercel AI SDK v5. Integrates tools, UI injection, and persistence.
  - `src/components/hsafa-chat/` — child UI parts (header, input, history, message list, editor, error boundary) and streaming helpers.
  - `src/components/hsafa-chat/utils/`
    - `transport.ts` — `createHsafaTransport(baseUrl, agentId, chatId)` using `DefaultChatTransport`.
    - `builtInTools.ts` — `getDomComponents`, `controlCursor`, `fillActiveInput`, `requestInput`.
    - `renderUserForm.ts` — runtime-rendered inline forms for `requestInput` tool.
  - `src/components/web-controler/` — DOM discovery and cursor control utilities for built-in tools.
  - `src/hooks/` — `useHsafaAgent`, `useChatStorage`, `useFileUploadHook`, `useMessageEditor`, `useAutoScroll`.
  - `src/types/` — shared public types (`chat.ts`, `messages.ts`).
  - `docs/` — Advanced guide and generated API (`docs/api/`).

- `client/src/features/agent/` — Agent Studio (builder):
  - `AgentPage.tsx`, `components/AgentFlow.tsx`, `hooks/useAgentFlow.ts`, `components/nodes/*`.
  - Designs agents as flow graphs (nodes/edges); persists in database via GraphQL/backend.

- `server/src/modules/agents/`
  - `run-agent-handler.ts` — HTTP handler for `POST /api/run/:id` streaming via Vercel AI SDK v5 (`streamText` + `toUIMessageStream`).
  - `run-core/*` — model providers, MCP, tools setup, prompts, utilities.
  - `agent-service.ts` — CRUD for agents with Prisma.

## High-level data flow

```mermaid
flowchart LR
  UI[HsafaChat/useHsafaAgent] -- UIMessage[] --> /api/run/:agentId
  Server -- stream NDJSON --> UI
  subgraph Client
    UI --> Tools[built-in + custom tools]
    Tools --> UI
    UI --> Storage[useChatStorage]
  end
  subgraph Server
    Handler[run-agent-handler.ts]\nconvertToModelMessages
    Handler --> streamText --> UIStream
    UIStream --> toUIMessageStream --> NDJSON
    ToolsSetup[run-core/tools.ts]\nMCP
  end
```

## Public exports (from `src/index.ts`)

- Components: `HsafaChat`, `ContentContainer`, `Button`, `FloatingChatButton`
- Provider: `HsafaProvider`, `useHsafa`
- Hooks: `useHsafaAgent`, `useChatStorage`, `useFileUploadHook`, `useAutoScroll`, `useMessageEditor`
- Web controller tools: `getDomComponents`, `guideCursor`, `controlCursor`, `FillActiveInput`, `CursorController`
- Types: selected chat types

See also `sdk/docs/README.md` and `sdk/docs/api/`.
