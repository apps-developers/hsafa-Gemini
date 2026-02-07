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

### Schema highlights

- **SmartSpace** has `publicKey` (`pk_...`) and `secretKey` (`sk_...`) fields for authentication — auto-generated on creation
- **Entity** has `externalId` for mapping to external auth systems (e.g., JWT `sub` claim)
- **Run** uses `smartSpaceId`, `agentEntityId`, `agentId`, `triggeredById`, `parentRunId`
- **ToolExecutionTarget** enum: `server | client | external`
- **Client** is the unified connection model for all surfaces (web, mobile, node)
  - `Client.clientType` encodes subtype (e.g. `web`, `mobile`, `node`)
  - `Client.capabilities` JSON for tool execution capabilities

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

### Authentication Summary

All API requests require authentication via one of these headers:

| Header | Purpose | Access Level |
|--------|---------|--------------|
| `x-admin-key` | Gateway admin key (`GATEWAY_ADMIN_KEY` env var) | Full gateway access — create spaces, manage all resources |
| `x-secret-key` | SmartSpace secret key (`sk_...`) | Full admin access to a specific SmartSpace |
| `x-public-key` + `Authorization: Bearer <JWT>` | Public key (`pk_...`) + user JWT | User-level access with membership enforcement |

See **Section 13** for detailed auth patterns.

---

### 7.1 Agents (Control Plane)

Agents are config definitions. An Agent Entity is created when you want an agent to participate in SmartSpaces.

**Auth:** `x-admin-key` or `x-secret-key` required (space admin).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agents` | Create/upsert agent config → returns `agentId` |
| `GET` | `/api/agents` | List all agents |
| `GET` | `/api/agents/:agentId` | Get agent details |
| `DELETE` | `/api/agents/:agentId` | Delete agent |

---

### 7.2 Entities

Entities are identities (human, agent, system) that can participate in SmartSpaces.

**Auth:** `x-admin-key` or `x-secret-key` required (space admin).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/entities` | Create entity (human/system) |
| `POST` | `/api/entities/agent` | Create Agent Entity (links to an Agent) |
| `GET` | `/api/entities` | List entities (filter by type) |
| `GET` | `/api/entities/:entityId` | Get entity details |
| `PATCH` | `/api/entities/:entityId` | Update entity (displayName, metadata) |
| `DELETE` | `/api/entities/:entityId` | Delete entity |
| `GET` | `/api/entities/:entityId/stream` | SSE stream of all SmartSpaces this entity belongs to |

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

**Entity Stream** (`GET /api/entities/:entityId/stream`):
- **Auth:** `x-secret-key` required
- Subscribes to events from **all** SmartSpaces this entity is a member of via a single SSE connection
- Each event includes a `smartSpaceId` field for routing
- Designed for Node.js services that need to listen to multiple spaces simultaneously

---

### 7.3 SmartSpaces

SmartSpaces are shared context spaces. This is the **primary interaction point**.

Each SmartSpace has auto-generated keys:
- `publicKey` (`pk_...`) — identifies the space, grants read-level access when combined with JWT
- `secretKey` (`sk_...`) — grants full admin access to the space

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/smart-spaces` | `x-admin-key` | Create a SmartSpace (returns keys) |
| `GET` | `/api/smart-spaces` | Any auth | List SmartSpaces (JWT users see only their spaces) |
| `GET` | `/api/smart-spaces/:smartSpaceId` | Any auth + membership | Get SmartSpace details |
| `PATCH` | `/api/smart-spaces/:smartSpaceId` | Space admin | Update SmartSpace (name, visibility) |
| `DELETE` | `/api/smart-spaces/:smartSpaceId` | Space admin | Delete SmartSpace |

**Create SmartSpace request:**
```json
{
  "name": "Project Chat",
  "visibility": "private",
  "metadata": {}
}
```

**Response includes auto-generated keys:**
```json
{
  "smartSpace": {
    "id": "uuid",
    "name": "Project Chat",
    "publicKey": "pk_abc123...",
    "secretKey": "sk_xyz789..."
  }
}
```

---

### 7.4 SmartSpace Membership

Manage who can participate in a SmartSpace.

**Auth:** `x-admin-key` or `x-secret-key` required (space admin) for write operations. Any auth + membership for reads.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/smart-spaces/:smartSpaceId/members` | Add entity to SmartSpace |
| `GET` | `/api/smart-spaces/:smartSpaceId/members` | List SmartSpace members |
| `PATCH` | `/api/smart-spaces/:smartSpaceId/members/:entityId` | Update membership (role) |
| `DELETE` | `/api/smart-spaces/:smartSpaceId/members/:entityId` | Remove entity from SmartSpace |

**Add member request:**
```json
{
  "entityId": "uuid",
  "role": "member"
}
```

---

### 7.5 SmartSpace Messages

Send and read messages in a SmartSpace. Posting a message **triggers Agent Runs**.

**Auth:** Any auth + membership required.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/smart-spaces/:smartSpaceId/messages` | Send message (triggers agents) |
| `GET` | `/api/smart-spaces/:smartSpaceId/messages` | Get message history |

**Send message request (secret key auth):**
```json
{
  "content": "Hello, can you help me?",
  "entityId": "uuid",
  "metadata": {}
}
```

> **Note:** For JWT-authenticated users, `entityId` is auto-resolved from the JWT token to prevent impersonation. The `entityId` field in the body is ignored.

**Query params for GET:**
- `afterSeq` - get messages after this sequence number
- `beforeSeq` - get messages before this sequence number
- `limit` - max messages to return (default 50)

---

### 7.6 SmartSpace Streaming (Primary)

**Subscribe to a SmartSpace** to receive all real-time events (messages, runs, tool calls).

**Auth:** Any auth + membership required.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/smart-spaces/:smartSpaceId/stream` | SSE stream of all SmartSpace activity |

**Query params:**
- `afterSeq` - resume from sequence number (reconnect support)

**Events streamed:**
- `smartSpace.message` - new message in the SmartSpace
- `run.created` - agent run started
- `run.started` - agent is executing
- `run.waiting_tool` - agent waiting for tool response
- `run.completed` - agent finished
- `run.failed` - agent errored
- `text.delta` - streaming text from agent
- `tool-input-available` - tool call input ready (any member can respond)
- `tool-output-available` - tool result received

---

### 7.7 Tool Responses

Respond to tool calls via the SmartSpace. You must be authenticated and a member.

**Auth:** Any auth + membership required.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/smart-spaces/:smartSpaceId/tool-results` | Submit tool result |

**Request:**
```json
{
  "runId": "uuid",
  "toolCallId": "uuid",
  "result": { ... }
}
```

---

### 7.8 Runs (for debugging/history)

Runs are created automatically when agents are triggered. These endpoints are for inspection and management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/runs` | Space admin | List runs (filter by smartSpaceId, agentEntityId) |
| `POST` | `/api/runs` | Space admin | Create a run manually |
| `GET` | `/api/runs/:runId` | Any auth | Get run details |
| `GET` | `/api/runs/:runId/events` | Any auth | Get all run events |
| `GET` | `/api/runs/:runId/stream` | Any auth | SSE stream for specific run |
| `POST` | `/api/runs/:runId/cancel` | Space admin | Cancel a running execution |
| `DELETE` | `/api/runs/:runId` | Space admin | Delete a run and its events |
| `POST` | `/api/runs/:runId/tool-results` | Any auth | Submit a tool result for a run |

---

### 7.9 Clients (Connection Management)

Clients are connection surfaces (browser, mobile, node backend).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/clients/register` | Any auth | Register a client connection |
| `GET` | `/api/clients` | Space admin | List clients for an entity |
| `DELETE` | `/api/clients/:clientId` | Space admin | Disconnect/remove client |

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

**Agents** (requires admin/secret key):
- `createAgent(config)` / `deleteAgent(agentId)`
- `listAgents()` / `getAgent(agentId)`

**Entities** (requires admin/secret key):
- `createEntity({ type, externalId, displayName })` / `deleteEntity(entityId)`
- `createAgentEntity({ agentId, displayName })` / `listEntities()`

**SmartSpaces** (requires admin key for create; any auth for read):
- `createSmartSpace({ name, visibility })` / `deleteSmartSpace(smartSpaceId)`
- `listSmartSpaces()` / `getSmartSpace(smartSpaceId)`
- `addMember(smartSpaceId, entityId)` / `removeMember(smartSpaceId, entityId)`
- `listMembers(smartSpaceId)`

**Messaging** (requires any auth + membership):
- `sendMessage(smartSpaceId, { content, entityId? })` — entityId auto-resolved for JWT users
- `getMessages(smartSpaceId, { afterSeq, limit })`

**Streaming** (requires any auth + membership):
- `subscribeToSmartSpace(smartSpaceId, callbacks)` - returns unsubscribe function
- `subscribeToEntity(entityId, callbacks)` - for services: single SSE for all spaces
- Callbacks: `onMessage`, `onTextDelta`, `onToolCall`, `onRunStart`, `onRunEnd`, `onError`

**Tool responses** (requires any auth + membership):
- `submitToolResult(smartSpaceId, { runId, toolCallId, result })`

---

## 8) Streaming & Reconnect Strategy

### 8.1 SmartSpace-Level Streaming (Primary)

The primary streaming model is **SmartSpace-level**: subscribe to a SmartSpace to see all activity.

**Endpoint:** `GET /api/smart-spaces/:smartSpaceId/stream?afterSeq=Y`

**Auth:** Any auth method + membership required (via headers, not query params).

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

### 8.2 Entity-Level Streaming (for Services)

For Node.js services that participate in multiple SmartSpaces, subscribe to all spaces via a single SSE connection:

**Endpoint:** `GET /api/entities/:entityId/stream`

**Auth:** `x-secret-key` required.

- Multiplexes events from all SmartSpaces the entity is a member of
- Each event includes `smartSpaceId` for routing
- Event ID format: `smartSpaceId:redisStreamId` for per-space resume

### 8.3 Run-Level Streaming (Secondary)

For debugging or specific use cases, you can also stream a single run:

**Endpoint:** `GET /api/runs/:runId/stream?since=X`

**Auth:** Any auth required.

This is useful for:
- Admin/debug dashboards
- Attaching to a specific run after the fact
- Inspecting historical runs

### 8.4 Reconnect Support

Both streams support reconnection:

- **SmartSpace stream:** pass `afterSeq` (sequence number) to resume
- **Run stream:** pass `since` (Redis stream ID) to resume
- SSE `Last-Event-ID` header also works

### 8.5 Event Types (Canonical)

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
- `tool-input-start` - tool call started (streaming input)
- `tool-input-delta` - incremental tool call input
- `tool-input-available` - tool call input ready (any SmartSpace member can respond)
- `tool-output-available` - tool result received

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
hsafa config set admin-key <your-gateway-admin-key>
# or for space-scoped access:
hsafa config set secret-key <your-space-secret-key>
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

- `internal` (Prebuilt tools)
  - never written into the SmartSpace timeline
  - only stored as Run events
- `additional`
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

## 13) Security & Identity (implemented)

The Gateway implements a **3-tier authentication system** with per-SmartSpace keys and optional JWT verification for human users.

### 13.1 Authentication Tiers

#### Tier 1: Gateway Admin Key

For gateway-wide operations (creating SmartSpaces, managing entities/agents).

```
┌─────────────────┐                         ┌─────────────┐
│  Admin Backend   │ ──────────────────────▶ │   Gateway   │
│  or CLI          │   x-admin-key: gk_...  │             │
└─────────────────┘                         └─────────────┘
```

- Set via `GATEWAY_ADMIN_KEY` environment variable
- Grants full access to all gateway operations
- **Never expose to clients** — only used by your backend or CLI

#### Tier 2: SmartSpace Secret Key

For space-scoped admin operations and Node.js service access.

```
┌─────────────────┐                         ┌─────────────┐
│  Node.js         │ ──────────────────────▶ │   Gateway   │
│  Service         │  x-secret-key: sk_...  │             │
│                  │  + entityId in body     │  trusts     │
└─────────────────┘                         └─────────────┘
```

- Each SmartSpace has a unique `secretKey` (`sk_...`), auto-generated on creation
- Grants full admin access to that specific SmartSpace
- Services pass `entityId` in request body (trusted because secret key = admin)
- Used for: sending messages on behalf of entities, managing members, creating runs

**Service usage:**

```ts
await fetch(`${GATEWAY_URL}/api/smart-spaces/${smartSpaceId}/messages`, {
  method: 'POST',
  headers: {
    'x-secret-key': process.env.SMARTSPACE_SECRET_KEY,  // sk_...
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Hello from the service',
    entityId: 'system-entity-uuid',
  }),
});
```

#### Tier 3: Public Key + JWT (Human Users)

For browser/mobile clients where human users authenticate via their existing auth provider.

```
┌─────────────────┐                              ┌─────────────┐
│   React SDK     │ ────────────────────────────▶ │   Gateway   │
│   (browser)     │  x-public-key: pk_...        │             │
│                 │  Authorization: Bearer <JWT>  │  verifies   │
└─────────────────┘                              └─────────────┘
```

**How it works:**

1. User logs into the app (Auth0, Firebase, Supabase, Clerk, etc.)
2. App receives a JWT for the user
3. React SDK sends `x-public-key` (identifies the SmartSpace) + `Authorization: Bearer <JWT>` (identifies the user)
4. Gateway verifies the JWT (via shared secret or JWKS URL)
5. Gateway extracts the configured claim (default: `sub`) → maps to `Entity.externalId`
6. Gateway checks that the resolved entity is a **member** of the SmartSpace
7. For `POST /messages`, `entityId` is auto-resolved from JWT (prevents impersonation)

**SDK usage:**

```tsx
<HsafaProvider
  gatewayUrl="https://gateway.example.com"
  publicKey="pk_abc123..."   // identifies the SmartSpace
  jwt={userJwt}              // user's JWT from their auth provider
>
  <MyApp />
</HsafaProvider>
```

**Gateway environment config:**

```bash
# Option 1: Shared secret (for Supabase, custom JWT)
JWT_SECRET="your-jwt-secret"

# Option 2: JWKS URL (for Auth0, Firebase, Cognito, Clerk)
JWKS_URL="https://your-auth-domain/.well-known/jwks.json"

# Which JWT claim maps to Entity.externalId (default: "sub")
JWT_ENTITY_CLAIM="sub"
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

### 13.2 Middleware Stack

The gateway uses composable Express middleware:

| Middleware | Header(s) | Purpose |
|------------|-----------|---------|
| `requireGatewayAdmin()` | `x-admin-key` | Gateway-wide operations |
| `requireSecretKey()` | `x-secret-key` | Space-scoped admin access |
| `requirePublicKeyJWT()` | `x-public-key` + `Authorization` | Human user access |
| `requireAuth()` | Any of the above | Accepts any auth method |
| `requireSpaceAdmin()` | `x-admin-key` or `x-secret-key` | Admin-only operations |
| `requireMembership()` | (chained after auth) | Verifies entity is a SmartSpace member |

### 13.3 Route Protection Summary

| Route Category | Auth Required |
|----------------|---------------|
| Create SmartSpace | Gateway admin (`x-admin-key`) |
| Update/Delete SmartSpace, Manage members | Space admin (`x-admin-key` or `x-secret-key`) |
| Send messages, Read messages, Stream, Tool results | Any auth + membership check |
| Entity/Agent/Client CRUD | Space admin |
| Run management (create, cancel, delete) | Space admin |
| Run read (get, events, stream) | Any auth |
| Entity stream (subscribeAll) | Secret key (`x-secret-key`) |

### 13.4 Identity Summary

| Caller | Auth method | Header | Entity mapping |
|--------|-------------|--------|----------------|
| Admin backend / CLI | Gateway admin key | `x-admin-key` | N/A (full access) |
| Node.js service | SmartSpace secret key | `x-secret-key` | `entityId` in request body |
| Browser / React SDK | Public key + JWT | `x-public-key` + `Authorization` | JWT claim → `Entity.externalId` |
| Mobile app | Public key + JWT | `x-public-key` + `Authorization` | JWT claim → `Entity.externalId` |

**Key principles:**
- The browser **never** sees admin keys or secret keys
- Human users authenticate with their existing auth provider; the gateway verifies their JWT directly
- JWT users cannot impersonate other entities — `entityId` is resolved from the token
- Membership is enforced for all space-scoped read/write operations

---

## 14) Implementation Plan (phased)

### Phase 1 — Align runtime with schema ✅ DONE

- ✅ Replace `agentId`-centric Run creation with SmartSpace model
- ✅ Create `Entity` for agents, `SmartSpace` and memberships
- ✅ Create `Run` with `smartSpaceId` + `agentEntityId`
- ✅ Standardize ToolExecutionTarget: `server | client | external`

### Phase 2 — SmartSpace APIs + Triggering ✅ DONE

- ✅ Full CRUD for SmartSpaces, Entities, Agents, Clients
- ✅ SmartSpace membership management
- ✅ `POST /api/smart-spaces/:id/messages` with agent triggering
- ✅ SmartSpace-level SSE streaming with reconnect
- ✅ Run-level SSE streaming with reconnect
- ✅ Tool result submission endpoint

### Phase 3 — Authentication & Authorization ✅ DONE

- ✅ Gateway admin key (`x-admin-key`)
- ✅ Per-SmartSpace secret key (`x-secret-key`) + public key (`x-public-key`)
- ✅ JWT verification (shared secret + JWKS URL)
- ✅ Membership enforcement middleware
- ✅ Entity auto-resolve from JWT (prevents impersonation)
- ✅ Entity stream endpoint (subscribeAll for services)
- ✅ All routes protected with appropriate auth middleware

### Phase 4 — SDKs (next)

- Node.js SDK (`@hsafa/node`)
- React SDK (`@hsafa/react`)
- CLI (`@hsafa/cli`)

### Phase 5 — Distributed tools (client execution)

- Implement tool call routing:
  - select target client by capabilities
  - inbox persistence
  - resume flow

### Phase 6 — Plans + Memory

- Add scheduler worker
- Add memory tools as internal tools

---

## 15) Current Code Status

### What is implemented and working

- **Full SmartSpace-centric API** with CRUD for all resources
- **Run streaming pipeline**: Redis Stream + pub/sub + Postgres `RunEvent` persistence
- **Agent building**: `ToolLoopAgent` with MCP tool loading
- **Agent triggering**: posting a message auto-triggers agent runs for all agent members
- **SmartSpace-level SSE streaming** with reconnect support (`afterSeq`)
- **Run-level SSE streaming** with reconnect support (`since`)
- **Entity stream** (subscribeAll): single SSE for services across all spaces
- **Tool result submission** via SmartSpace and Run endpoints
- **3-tier authentication**: gateway admin key, SmartSpace secret/public keys, JWT
- **Membership enforcement** on all space-scoped operations
- **Anti-impersonation**: JWT users' entityId auto-resolved from token

### What is not yet implemented

- Client-side tool execution routing (WebSocket dispatch to specific clients)
- Plans (scheduled runs) and Goals
- Memory tools (long-term agent memory)
- SDKs (Node.js, React, CLI)

---

## 16) Definition of Done (MVP) — Status

- ✅ You can create a SmartSpace, add Entities, and post a user message
- ✅ Agent Entities in that SmartSpace trigger Runs
- ✅ Runs stream incremental events with reconnect support
- ✅ All API routes are authenticated and authorized
- ✅ All timeline messages are persisted and reload correctly
- ⬜ Tools can execute on a client (browser/device) and resume correctly
- ⬜ SDKs for Node.js, React, and CLI

---

## Status

- **Gateway core is complete.** SmartSpace-centric API, authentication, streaming, and agent triggering are all implemented. Next step is building the SDKs (Node.js, React, CLI).
