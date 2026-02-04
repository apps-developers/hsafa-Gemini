# Hsafa Gateway — Implementation Blueprint (SmartSpace + Entity Runtime)

This document turns the idea in `hsafa-gateway-doc.mdx` into a buildable system design.

It is written to be compatible with the current codebase:

- `hsafa-gateway/` (Express + TypeScript + Prisma + Redis + ws + Vercel AI SDK)
- `react-sdk/` (custom gateway transport via SSE)
- `hsafa-gateway/prisma/schema.prisma` (Entity/SmartSpace/Run models)
- `vercel-ai-sdk-docs/` (streaming + tools + agents reference)

---

## 1) Goal

Build an **Agent Builder + Distributed Agent Runtime (Gateway)** that supports:

- A shared-context network model:
  - **SmartSpace** = timeline/context
  - **Entity** = human/agent/system identity
  - **Client** = connection surface (web, mobile, node backend, device)
- Reliable execution:
  - **Runs** (agent executions) with **Steps** (LLM calls) and full event streaming
  - Refresh/reconnect without losing progress
- Distributed tools:
  - Server tools
  - Client tools (human-in-the-loop + client-side execution)
  - External tools (via MCP servers)
- Persistence:
  - SmartSpace timeline stored in Postgres
  - Run event stream stored in Postgres + Redis for realtime
- Future features:
  - Plans (scheduled runs)
  - Goals
  - Long-term memory

---

## 2) Recommended Tech Stack (matches repo)

### Runtime & API

- **Node.js 20+**
- **TypeScript**
- **Express** (already used)

### AI Engine

- **Vercel AI SDK (`ai`)**
  - `ToolLoopAgent` for multi-step tool loop
  - `convertToModelMessages` for converting UI message format to model messages
- Providers already in `hsafa-gateway/package.json`:
  - `@ai-sdk/openai`
  - `@ai-sdk/anthropic`
  - `@ai-sdk/google`
  - `@ai-sdk/xai`
- **MCP**
  - `@ai-sdk/mcp` as the client to connect to remote tool servers

### Persistence

- **Postgres**
  - Prisma ORM (`@prisma/client`, `prisma`)
- **Redis**
  - Redis Streams for realtime event fanout
  - Pub/Sub channel for “new events available” wakeups

### Realtime

- **SSE** (Server-Sent Events) for run streaming (works well with reconnect)
- **WebSocket (`ws`)** for client/device tool execution

### Validation

- **zod** for agent config schema validation (already used)

---

## 3) Domain Model (authoritative)

From `hsafa-gateway-doc.mdx`:

- **SmartSpace**
  - Shared context space: a timeline of events/messages
  - Public or private
- **Entity**
  - Unified identity: human/agent/system
  - An agent is an Entity *plus* an Agent config pointer
- **Client**
  - Connection surface (web/mobile/node/device)
  - Not an identity; it’s a channel
- **Run**
  - One execution of one Agent Entity inside one SmartSpace
  - Triggered by a SmartSpace event (message, system event, schedule)
- **Step**
  - One LLM call within the run

---

## 4) Prisma Schema Mapping (what you already have)

Your `schema.prisma` already contains the *right high-level* tables:

- `Entity` (human/agent/system)
- `SmartSpace`
- `SmartSpaceMembership`
- `SmartSpaceMessage` (timeline)
- `Agent` (agent config with `configJson`)
- `Run`
- `RunEvent`
- `ToolCall` + `ToolResult`
- `Client`
- `Memory`
- `Plan`
- `Goal`

### Important mismatches to fix (code vs schema)

The current `hsafa-gateway/src` code is partly from the older “agent ↔ run” model and needs alignment:

- **Run fields mismatch**
  - Schema: `Run(smartSpaceId, agentEntityId, agentId, triggeredById, parentRunId, ...)`
  - Current code uses: `Run(agentId, ...)`
- **ToolExecutionTarget mismatch**
  - Schema enum: `server | client | external`
  - Current code/tool config uses: `server | device | browser | external`
- **Client model mismatch**
  - `src/lib/websocket.ts` uses `prisma.device.upsert(...)`
  - Schema has `Client` model; code should use `Client`

### Recommendation

- Use **`Client`** as the unified connection model for all surfaces (web, mobile, node).
- Make tool execution target be **`server | client | external`** (schema), and encode client subtype in:
  - `Client.clientType` (e.g. `web`, `mobile`, `node`)
  - plus `Client.capabilities` JSON

---

## 5) Architecture Overview

### 5.1 Control Plane (Agent Builder)

Responsible for:

- Accepting agent configs
- Storing config in `Agent.configJson`
- Validating config schema
- Optional: publishing "agent updated" event

Current code already supports this:

- `POST /api/agents` creates/returns `agentId` using config hashing.

**Note:** Agent versioning is handled via Git. Users store configs in their repo and use the CLI to deploy.

### 5.2 Execution Plane (Gateway Runtime)

Responsible for:

- Managing SmartSpaces and memberships
- Accepting a SmartSpace event (e.g. a human message)
- Creating Runs for eligible Agent Entities
- Executing the agent loop (LLM + tools)
- Streaming events
- Persisting timeline + run events

---

## 6) Data Flow (end-to-end)

### 6.1 Human message triggers agents in a SmartSpace

1. Client posts a message to the SmartSpace
2. Gateway writes a `SmartSpaceMessage` (seq ordered)
3. Gateway finds Agent Entities that are members of that SmartSpace
4. For each Agent Entity, gateway creates a `Run`:
   - `smartSpaceId = the smart space`
   - `agentEntityId = that agent entity`
   - `agentId = agent config`
   - `triggeredById = human entity`
   - `status = queued`
5. Gateway executes each Run (async background)
6. Gateway emits `RunEvent` records and streams them
7. Agent may append new `SmartSpaceMessage` entries as it responds

### 6.2 Cross-SmartSpace execution (leave request example)

- A Run can create a child Run in a different SmartSpace
- Link with `parentRunId`
- Always write “origin metadata”:
  - `Run.metadata.origin = { fromRunId, fromSmartSpaceId, intent }`

---

## 7) API Surface (SmartSpace-Centric Design)

The API is **SmartSpace-centric**: you subscribe to a SmartSpace to see all activity, send messages to a SmartSpace, and respond to tools via the SmartSpace.

All endpoints are available via **REST API**, **SDKs** (React, React Native, Node), and **CLI**.

---

### 7.1 Agents (Control Plane)

Agents are config definitions. An Agent Entity is created when you want an agent to participate in SmartSpaces.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agents` | Create/upsert agent config → returns `agentId` |
| `GET` | `/api/agents` | List all agents |
| `GET` | `/api/agents/:agentId` | Get agent details |
| `DELETE` | `/api/agents/:agentId` | Delete agent (soft delete) |

---

### 7.2 Entities

Entities are identities (human, agent, system) that can participate in SmartSpaces.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/entities` | Create entity (human/system) |
| `POST` | `/api/entities/agent` | Create Agent Entity (links to an Agent) |
| `GET` | `/api/entities` | List entities (filter by type) |
| `GET` | `/api/entities/:entityId` | Get entity details |
| `PATCH` | `/api/entities/:entityId` | Update entity (displayName, metadata) |
| `DELETE` | `/api/entities/:entityId` | Delete entity |

**Create Entity request:**
```json
{
  "type": "human",
  "externalId": "user-123",
  "displayName": "John Doe",
  "metadata": {}
}
```

**Create Agent Entity request:**
```json
{
  "agentId": "uuid",
  "displayName": "Assistant",
  "metadata": {}
}
```

---

### 7.3 SmartSpaces

SmartSpaces are shared context spaces. This is the **primary interaction point**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/smart-spaces` | Create a SmartSpace |
| `GET` | `/api/smart-spaces` | List SmartSpaces (for current entity) |
| `GET` | `/api/smart-spaces/:smartSpaceId` | Get SmartSpace details |
| `PATCH` | `/api/smart-spaces/:smartSpaceId` | Update SmartSpace (name, visibility) |
| `DELETE` | `/api/smart-spaces/:smartSpaceId` | Delete SmartSpace |

**Create SmartSpace request:**
```json
{
  "name": "Project Chat",
  "visibility": "private",
  "metadata": {}
}
```

---

### 7.4 SmartSpace Membership

Manage who can participate in a SmartSpace.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/smart-spaces/:smartSpaceId/members` | Add entity to SmartSpace |
| `GET` | `/api/smart-spaces/:smartSpaceId/members` | List SmartSpace members |
| `DELETE` | `/api/smart-spaces/:smartSpaceId/members/:entityId` | Remove entity from SmartSpace |
| `PATCH` | `/api/smart-spaces/:smartSpaceId/members/:entityId` | Update membership (role, permissions) |

**Add member request:**
```json
{
  "entityId": "uuid",
  "role": "member",
  "permissions": { "canWrite": true, "canInvite": false }
}
```

---

### 7.5 SmartSpace Messages

Send and read messages in a SmartSpace. Posting a message **triggers Agent Runs**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/smart-spaces/:smartSpaceId/messages` | Send message (triggers agents) |
| `GET` | `/api/smart-spaces/:smartSpaceId/messages` | Get message history |

**Send message request:**
```json
{
  "content": "Hello, can you help me?",
  "entityId": "uuid",
  "metadata": {}
}
```

**Query params for GET:**
- `afterSeq` - get messages after this sequence number
- `beforeSeq` - get messages before this sequence number
- `limit` - max messages to return (default 50)

---

### 7.6 SmartSpace Streaming (Primary)

**Subscribe to a SmartSpace** to receive all real-time events (messages, runs, tool calls).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/smart-spaces/:smartSpaceId/stream` | SSE stream of all SmartSpace activity |

**Query params:**
- `entityId` - required, identifies the subscribing entity
- `afterSeq` - resume from sequence number (reconnect support)

**Events streamed:**
- `smartSpace.message` - new message in the SmartSpace
- `run.created` - agent run started
- `run.started` - agent is executing
- `run.waiting_tool` - agent waiting for tool response
- `run.completed` - agent finished
- `run.failed` - agent errored
- `text.delta` - streaming text from agent
- `tool.call` - agent called a tool (any member can respond)
- `tool.result` - tool result received

---

### 7.7 Tool Responses

Respond to tool calls via the SmartSpace. You must be a member of the SmartSpace.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/smart-spaces/:smartSpaceId/tool-results` | Submit tool result |

**Request:**
```json
{
  "toolCallId": "uuid",
  "entityId": "uuid",
  "result": { ... },
  "error": null
}
```

---

### 7.8 Runs (for debugging/history)

Runs are created automatically when agents are triggered. These endpoints are for inspection.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/runs` | List runs (filter by smartSpaceId, agentEntityId) |
| `GET` | `/api/runs/:runId` | Get run details |
| `GET` | `/api/runs/:runId/events` | Get all run events |
| `GET` | `/api/runs/:runId/stream` | SSE stream for specific run |
| `POST` | `/api/runs/:runId/cancel` | Cancel a running execution |

---

### 7.9 Clients (Connection Management)

Clients are connection surfaces (browser, mobile, node backend).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/clients/register` | Register a client connection |
| `GET` | `/api/clients` | List clients for an entity |
| `DELETE` | `/api/clients/:clientId` | Disconnect/remove client |

**Register client request:**
```json
{
  "entityId": "uuid",
  "clientKey": "stable-key",
  "clientType": "web",
  "displayName": "Chrome Browser",
  "capabilities": { "canExecuteTools": true }
}
```

**WebSocket connection:**
- `WS /api/clients/connect` - persistent connection for tool execution

---

### 7.10 Summary: SDK Operations

Every SDK (React, React Native, Node) should expose:

**Agents:**
- `createAgent(config)` / `deleteAgent(agentId)`
- `listAgents()` / `getAgent(agentId)`

**Entities:**
- `createEntity({ type, externalId, displayName })` / `deleteEntity(entityId)`
- `createAgentEntity({ agentId, displayName })` / `listEntities()`

**SmartSpaces:**
- `createSmartSpace({ name, visibility })` / `deleteSmartSpace(smartSpaceId)`
- `listSmartSpaces()` / `getSmartSpace(smartSpaceId)`
- `addMember(smartSpaceId, entityId)` / `removeMember(smartSpaceId, entityId)`
- `listMembers(smartSpaceId)`

**Messaging:**
- `sendMessage(smartSpaceId, { content, entityId })`
- `getMessages(smartSpaceId, { afterSeq, limit })`

**Streaming:**
- `subscribeToSmartSpace(smartSpaceId, entityId, callbacks)` - returns unsubscribe function
- Callbacks: `onMessage`, `onTextDelta`, `onToolCall`, `onRunStart`, `onRunEnd`, `onError`

**Tool responses:**
- `submitToolResult(smartSpaceId, { toolCallId, entityId, result })`

---

## 8) Streaming & Reconnect Strategy

### 8.1 SmartSpace-Level Streaming (Primary)

The primary streaming model is **SmartSpace-level**: subscribe to a SmartSpace to see all activity.

**Endpoint:** `GET /api/smart-spaces/:smartSpaceId/stream?entityId=X&afterSeq=Y`

**Why SmartSpace-level?**
- See all agent activity in a context (multiple agents can be in one SmartSpace)
- See messages from all participants
- Single subscription for everything happening in that context

**Event envelope:**
```json
{
  "id": "redis-stream-id",
  "seq": 42,
  "type": "text.delta",
  "ts": "2024-01-01T00:00:00Z",
  "runId": "uuid",
  "agentEntityId": "uuid",
  "data": { "delta": "Hello" }
}
```

### 8.2 Run-Level Streaming (Secondary)

For debugging or specific use cases, you can also stream a single run:

**Endpoint:** `GET /api/runs/:runId/stream?since=X`

This is useful for:
- Admin/debug dashboards
- Attaching to a specific run after the fact
- Inspecting historical runs

### 8.3 Reconnect Support

Both streams support reconnection:

- **SmartSpace stream:** pass `afterSeq` (sequence number) to resume
- **Run stream:** pass `since` (Redis stream ID) to resume
- SSE `Last-Event-ID` header also works

### 8.4 Event Types (Canonical)

**SmartSpace-level events:**
- `smartSpace.message` - new message in the SmartSpace
- `smartSpace.member.joined` - entity joined
- `smartSpace.member.left` - entity left

**Run lifecycle:**
- `run.created` - run was created
- `run.started` - run is executing
- `run.waiting_tool` - waiting for tool response
- `run.completed` - run finished successfully
- `run.failed` - run errored

**Streaming content:**
- `text.delta` - incremental text from agent
- `reasoning.delta` - incremental reasoning (if enabled)
- `step.start` / `step.finish` - LLM call boundaries

**Tool events:**
- `tool.call` - agent called a tool (any SmartSpace member can respond)
- `tool.result` - tool result received

**Message events:**
- `message.user` - user message written to timeline
- `message.assistant` - assistant message written to timeline
- `message.tool` - tool message written to timeline

---

## 8.5) CLI Interface

The CLI provides the same capabilities as the SDKs. All management operations are available.

### Installation

```bash
npm install -g @hsafa/cli
# or
pnpm add -g @hsafa/cli
```

### Configuration

```bash
hsafa config set gateway-url http://localhost:3001
hsafa config set api-key <your-key>
```

### Agent Commands

```bash
# Create/update agent from config file
hsafa agent create --config ./agent.json
hsafa agent create --config ./agent.yaml

# List agents
hsafa agent list

# Get agent details
hsafa agent get <agentId>

# Delete agent
hsafa agent delete <agentId>
```

### Entity Commands

```bash
# Create human entity
hsafa entity create --type human --external-id user-123 --name "John Doe"

# Create agent entity (from existing agent)
hsafa entity create-agent --agent-id <agentId> --name "Assistant"

# List entities
hsafa entity list
hsafa entity list --type agent

# Delete entity
hsafa entity delete <entityId>
```

### SmartSpace Commands

```bash
# Create smart space
hsafa smart-space create --name "Project Chat" --visibility private

# List smart spaces
hsafa smart-space list

# Get smart space details
hsafa smart-space get <smartSpaceId>

# Delete smart space
hsafa smart-space delete <smartSpaceId>

# Manage members
hsafa smart-space add-member <smartSpaceId> <entityId>
hsafa smart-space remove-member <smartSpaceId> <entityId>
hsafa smart-space list-members <smartSpaceId>
```

### Messaging Commands

```bash
# Send message to smart space
hsafa message send <smartSpaceId> --entity <entityId> --content "Hello!"

# Get message history
hsafa message list <smartSpaceId> --limit 50
```

### Streaming Commands

```bash
# Subscribe to smart space (interactive mode)
hsafa stream smart-space <smartSpaceId> --entity <entityId>

# Subscribe to specific run
hsafa stream run <runId>

# Watch mode with formatted output
hsafa stream smart-space <smartSpaceId> --entity <entityId> --format pretty
```

### Tool Response Commands

```bash
# Submit tool result (any SmartSpace member can respond to tool calls)
hsafa tool respond <smartSpaceId> --call-id <toolCallId> --entity <entityId> --result '{"approved": true}'
```

### Quick Start Example

```bash
# 1. Create an agent
hsafa agent create --config ./my-agent.json
# Returns: agentId=abc123

# 2. Create entities
hsafa entity create --type human --external-id me --name "Me"
# Returns: entityId=user-xyz

hsafa entity create-agent --agent-id abc123 --name "My Assistant"
# Returns: entityId=agent-xyz

# 3. Create a smart space and add members
hsafa smart-space create --name "My Chat"
# Returns: smartSpaceId=space-xyz

hsafa smart-space add-member space-xyz user-xyz
hsafa smart-space add-member space-xyz agent-xyz

# 4. Subscribe to the smart space (in one terminal)
hsafa stream smart-space space-xyz --entity user-xyz --format pretty

# 5. Send a message (in another terminal)
hsafa message send space-xyz --entity user-xyz --content "Hello, assistant!"

# The agent will respond, and you'll see it in the stream
```

---

## 9) Execution Engine (Run runner)

### 9.1 Inputs

To execute a Run, the runner must load:

- `Run`
- `Agent.configJson`
- **Context messages**:
  - In the SmartSpace model: load recent `SmartSpaceMessage` for `run.smartSpaceId`
  - Also include any run-specific tool messages/results

### 9.2 Message format recommendation

Standardize on **AI SDK UI Message** structure internally (the same shape your React SDK already uses):

- `role: 'user' | 'assistant' | 'tool'`
- `parts: [{ type: 'text', text: '...' }, { type: 'tool-call', ... }, ...]`

Then you can:

- persist to `SmartSpaceMessage.metadata` as JSON
- convert to model messages via `convertToModelMessages(...)`

### 9.3 Running the agent

Build agent:

- `buildAgent({ config })` returns `ToolLoopAgent`

Run loop:

- `built.agent.stream({ messages })`
- Iterate `fullStream` and emit events:
  - `text-delta` -> `text.delta`
  - `reasoning-delta` -> `reasoning.delta`
  - `tool-call` -> persist `ToolCall`, emit `tool.call`
  - `tool-result` -> persist `ToolResult`, emit `tool.result`

### 9.4 Waiting for client tools

When `tool.call.executionTarget !== 'server'`:

- Update Run status to `waiting_tool`
- Emit `run.waiting_tool`
- Dispatch tool call to a target `Client`:
  - choose `Client` by `capabilities` and `clientType`
  - set `ToolCall.targetClientId`
  - push to WebSocket (online) or Redis inbox (offline)

When `ToolResult` arrives:

- Persist `ToolResult`
- Emit `tool.result`
- Resume Run execution:
  - append a `message.tool` event
  - call runner again with updated history

---

## 10) Tool System Design

### 10.1 Tool visibility modes (from idea doc)

Add `visibility` to tool calls (in `ToolCall` metadata):

- `internal` (Main Tools)
  - never written into the SmartSpace timeline
  - only stored as Run events
- `entity-visible`
  - written into the SmartSpace timeline as an assistant tool-call part
  - any SmartSpace member can see and respond

### 10.2 Execution target

Use:

- `server` (gateway executes)
- `client` (a connected Client executes)
- `external` (MCP server or external URL/service executes)

### 10.3 External tools

Two categories:

- MCP tools (recommended)
  - gateway uses `@ai-sdk/mcp` to connect and load tools
- Request tools
  - gateway executes outgoing HTTP requests (careful with auth + SSRF)

---

## 11) SmartSpace Timeline Persistence

`SmartSpaceMessage` should be the canonical timeline.

### 11.1 Sequencing

Schema uses `seq BigInt` unique per `smartSpaceId`.

Implementation approach:

- Use a Postgres transaction:
  - `SELECT max(seq) FOR UPDATE` for that smart space
  - insert new message with `seq = max + 1`

### 11.2 Mapping messages

- For simple text messages:
  - `role` = `user|assistant|system|tool`
  - `content` = text
- For rich UI messages:
  - store full structure in `metadata`:
    - `metadata.uiMessage = { id, role, parts, createdAt, ... }`

---

## 12) Plans, Goals, Memory (minimum viable)

### 12.1 Plans

Use `Plan` table as the source of truth.

Scheduler worker options:

- **BullMQ** (Redis) with repeatable jobs
- **pg-boss** (Postgres)
- Simple polling loop (acceptable for MVP)

Flow:

- Scheduler finds due plans (`nextRunAt <= now AND status=active`)
- Scheduler writes a SmartSpace event or directly creates a Run

### 12.2 Goals

- Keep as structured state, not prompt text
- Inject into agent system prompt in a controlled section

### 12.3 Memory

Start with:

- `Memory(content TEXT, topic, metadata)`
- Retrieval MVP:
  - naive keyword matching by `topic`
  - later upgrade to embeddings + pgvector

---

## 13) Security & Identity (minimum viable)

Even for MVP, define:

- **Gateway API auth**
  - Bearer token from your app
- **Entity identity**
  - map your app’s user id -> `Entity.externalId`
- **Client identity**
  - stable `clientKey` signed into a token
  - never trust `clientKey` without verification
- **Authorization**
  - only members of a SmartSpace can read/write
  - private SmartSpaces must enforce membership checks

### 13.1 Authentication Patterns

The Gateway supports two authentication patterns depending on the caller type:

#### Pattern A: User via React SDK (JWT passthrough)

For browser/mobile clients, the user's existing JWT is passed directly to the Gateway:

```
┌─────────────────┐                    ┌─────────────┐
│   React SDK     │ ──────────────────▶│   Gateway   │
│   (browser)     │   Authorization:   │             │
│                 │   Bearer <userJWT> │  verifies   │
└─────────────────┘                    └─────────────┘
```

**How it works:**

1. User logs into the app (Auth0, Firebase, Supabase, Clerk, etc.)
2. App receives a JWT for the user
3. React SDK sends that JWT in every request to Gateway
4. Gateway verifies the JWT and extracts user identity
5. Gateway maps JWT `sub` claim → `Entity.externalId`

**SDK usage:**

```tsx
useHsafaGateway({
  gatewayUrl: 'https://gateway.example.com',
  agentId: 'my-agent',
  authToken: userJwt,  // user's JWT from their auth provider
});
```

**Gateway config (per tenant/app):**

```ts
{
  // Option 1: JWKS URL (recommended for Auth0, Firebase, Cognito, Clerk)
  jwksUrl: "https://your-auth-domain/.well-known/jwks.json",
  
  // Option 2: Shared secret (for Supabase, custom JWT)
  jwtSecret: "your-jwt-secret",
  
  // Claim mapping
  userIdClaim: "sub",  // which claim contains the user ID
  issuer: "https://your-auth-domain/",  // optional: validate issuer
}
```

**Supported auth services:**

| Service | Verification method |
|---------|---------------------|
| Auth0 | JWKS: `https://YOUR_DOMAIN/.well-known/jwks.json` |
| Firebase | JWKS: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` |
| Supabase | JWT secret from project settings |
| Clerk | JWKS from dashboard |
| AWS Cognito | JWKS: `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json` |
| Keycloak | JWKS: `https://{host}/realms/{realm}/protocol/openid-connect/certs` |
| Custom | Your own secret or key pair |

#### Pattern B: Service/Robot (direct API key)

For backend services, robots, or Node.js apps, use a Gateway API key directly:

```
┌─────────────────┐                    ┌─────────────┐
│   Node.js       │ ──────────────────▶│   Gateway   │
│   Service       │   Authorization:   │             │
│                 │   Bearer <apiKey>  │  trusts     │
└─────────────────┘   + entityId       └─────────────┘
```

**How it works:**

1. Service has a Gateway API key (stored securely in env vars)
2. Service calls Gateway with API key + its own `entityExternalId`
3. Gateway trusts the API key and maps the entity

**Service usage:**

```ts
await fetch(`${GATEWAY_URL}/api/runs/${runId}/messages`, {
  headers: {
    'Authorization': `Bearer ${process.env.GATEWAY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message,
    entityExternalId: 'service_scheduler_01',  // system entity ID
  }),
});
```

### 13.2 Identity Summary

| Caller | Auth method | Entity mapping |
|--------|-------------|----------------|
| Browser/React SDK | User's JWT | JWT `sub` → `Entity.externalId` |
| Mobile app | User's JWT | JWT `sub` → `Entity.externalId` |
| Node.js service | Gateway API key | Request body `entityExternalId` |
| Robot/IoT | Gateway API key | Request body `entityExternalId` |

**Key principle:** The browser never sees the Gateway API key. Users authenticate with their existing auth provider, and the Gateway verifies their JWT directly.

---

## 14) Implementation Plan (phased)

### Phase 1 — Align runtime with schema (must-do)

- Replace `agentId`-centric Run creation with SmartSpace model:
  - create `Entity` for agents
  - create `SmartSpace` and memberships
  - create `Run` with `smartSpaceId` + `agentEntityId`
- Standardize ToolExecutionTarget:
  - use `server | client | external`
- Fix WebSocket connection to use `Client` model

### Phase 2 — SmartSpace APIs + Triggering

- Add `/api/smart-spaces/*` endpoints
- Implement `POST /api/smart-spaces/:id/messages` trigger logic

### Phase 3 — Distributed tools (client execution)

- Implement tool call routing:
  - select target client by capabilities
  - inbox persistence
  - resume flow

### Phase 4 — Plans + Memory

- Add scheduler worker
- Add memory tools as internal tools

---

## 15) Notes on Existing Code (quick audit)

### What is already good

- Run streaming pipeline:
  - Redis Stream + pub/sub + Postgres `RunEvent` persistence
- Agent building:
  - `ToolLoopAgent`
  - MCP tool loading
- React SDK:
  - robust run re-hydration logic
  - tool call handling for browser/UI tools

### What must be refactored

- `runs.ts` currently assumes `Run.agentId` exists (it doesn’t in schema)
- Tool execution targets and enum values must match schema
- WebSocket device registration currently depends on a missing Prisma model

---

## 16) Definition of Done (MVP)

- You can create a SmartSpace, add Entities, and post a user message
- Agent Entities in that SmartSpace trigger Runs
- Runs stream incremental events to the UI with reconnect support
- Tools can execute:
  - on server
  - on a client (browser/device) and resume correctly
- All timeline messages are persisted and reload correctly

---

## Status

- **Blueprint created**. Next step is to implement the Phase 1 alignment changes in `hsafa-gateway` (code + schema enum alignment + WebSocket client model).
