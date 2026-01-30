# 09 — Agent Studio (Client)

This SDK is designed to consume agents authored in the Agent Studio UI (the flow builder). This document explains how the Studio relates to the runtime and the SDK.

## Location

- Studio root: `client/src/features/agent/`
  - Page: `AgentPage.tsx`
  - Canvas & flow: `components/AgentFlow.tsx`, `components/AgentFlowCanvas.tsx`
  - Nodes: `components/nodes/*`
  - Hooks: `hooks/useAgentFlow.ts`, `hooks/useStreamingPersistence.ts`
  - Lib: `lib/*`

## What the Studio produces

- A graph of nodes/edges persisted to the backend (Prisma `agent`, `flowNodes`, `flowEdges`).
- Node types include model selection, system/prompt nodes, temperature, tool nodes, and MCP nodes.
- Tool nodes may carry provider-specific API keys used by the server to build model factories.

## Server consumption

- File: `server/src/modules/agents/run-agent-handler.ts`
  - Loads the saved agent by id.
  - Filters/expands nodes and edges.
  - Renders node data (with templating) into a runtime configuration.
  - Builds model/tools/MCP stacks before streaming.

## SDK relationship

- The SDK is agnostic of how the agent was authored; it only expects the server to implement the `/api/run/:agentId` contract.
- Dynamic pages and UI components can be leveraged by the agent if the Studio emits the proper tool calls during execution.

## Extending the Studio

- Add/modify nodes under `client/src/features/agent/components/nodes/*`.
- Persist new node data fields; ensure `run-core` interprets them accordingly.
- For new tools, implement:
  - Studio node for configuration (client),
  - Tool implementation in `server/src/modules/agents/run-core/tools/` (server),
  - Optional frontend tool/UI in the SDK if needed.
