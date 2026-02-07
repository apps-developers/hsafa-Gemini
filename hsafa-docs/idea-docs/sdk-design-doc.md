# Hsafa SDK Design Document

This document defines the structure, API surface, and usage patterns for all Hsafa SDKs.

---

## SDK Overview

| SDK | Package | Language | Use Case |
|-----|---------|----------|----------|
| **Node.js SDK** | `@hsafa/node` | TypeScript/JS | Admin operations, services, robots, backends |
| **React SDK** | `@hsafa/react` | TypeScript/React | Human user chat UIs, admin panels |
| **Python SDK** | `hsafa` | Python | Data pipelines, ML services, automation bots |

All SDKs talk to the same Hsafa Gateway REST API. The difference is:

- **Node.js SDK** — full admin + service capabilities, class-based
- **React SDK** — hooks + components for UI, builds on Node.js SDK core
- **Python SDK** — same capabilities as Node.js, Pythonic API

---

## Authentication Modes

Every SDK must be initialized with one of these auth modes:

| Mode | Headers Sent | Who Uses It | Capabilities |
|------|-------------|-------------|--------------|
| **Admin** | `x-admin-key` | Your backend, CLI | Everything: create spaces, entities, agents |
| **SecretKey** | `x-secret-key` | Node.js services, robots | Space-scoped admin: send messages, manage members, subscribe |
| **PublicKey + JWT** | `x-public-key` + `Authorization: Bearer` | React/mobile apps | User-scoped: send messages as self, read own spaces |

---

# Node.js SDK (`@hsafa/node`)

## Initialization

```ts
import { HsafaClient } from '@hsafa/node';

// Mode 1: Gateway Admin (full access)
const admin = new HsafaClient({
  gatewayUrl: 'http://localhost:3001',
  adminKey: 'gk_...',
});

// Mode 2: Space Secret Key (space-scoped admin)
const service = new HsafaClient({
  gatewayUrl: 'http://localhost:3001',
  secretKey: 'sk_...',
});

// Mode 3: Public Key + JWT (human user — rare in Node, common in React)
const userClient = new HsafaClient({
  gatewayUrl: 'http://localhost:3001',
  publicKey: 'pk_...',
  jwt: 'eyJ...',
});
```

## Resource API

All CRUD operations follow a consistent `client.<resource>.<method>()` pattern.

### Agents

```ts
// Create or update an agent from config
const { agentId, configHash, created } = await client.agents.create({
  name: 'my-assistant',
  config: {
    version: '1.0',
    agent: { name: 'my-assistant', system: 'You are a helpful assistant.' },
    model: { provider: 'openai', name: 'gpt-4.1-mini' },
    tools: [],
  },
});

// List agents
const { agents } = await client.agents.list({ limit: 50, offset: 0 });

// Get agent by ID
const { agent } = await client.agents.get(agentId);

// Delete agent
await client.agents.delete(agentId);
```

### Entities

```ts
// Create human entity
const { entity } = await client.entities.create({
  type: 'human',
  externalId: 'clerk_user_123',  // maps to JWT sub claim
  displayName: 'John Doe',
  metadata: { role: 'engineer' },
});

// Create system entity
const { entity: sysEntity } = await client.entities.create({
  type: 'system',
  displayName: 'Order Processor',
});

// Create agent entity (links to an Agent config)
const { entity: agentEntity } = await client.entities.createAgent({
  agentId: 'uuid',
  displayName: 'My Assistant',
});

// List entities
const { entities } = await client.entities.list({ type: 'human', limit: 50 });

// Get entity
const { entity } = await client.entities.get(entityId);

// Update entity
await client.entities.update(entityId, { displayName: 'Jane Doe' });

// Delete entity
await client.entities.delete(entityId);
```

### SmartSpaces

```ts
// Create SmartSpace (returns publicKey + secretKey)
const { smartSpace } = await client.spaces.create({
  name: 'Project Chat',
  visibility: 'private',
  metadata: {},
});
// smartSpace.publicKey = 'pk_...'
// smartSpace.secretKey = 'sk_...'

// List SmartSpaces
const { smartSpaces } = await client.spaces.list({ limit: 50 });

// Get SmartSpace
const { smartSpace } = await client.spaces.get(smartSpaceId);

// Update SmartSpace
await client.spaces.update(smartSpaceId, { name: 'New Name' });

// Delete SmartSpace
await client.spaces.delete(smartSpaceId);
```

### Memberships

```ts
// Add member to space
await client.spaces.addMember(smartSpaceId, {
  entityId: 'uuid',
  role: 'member',
});

// List members
const { members } = await client.spaces.listMembers(smartSpaceId);

// Update member role
await client.spaces.updateMember(smartSpaceId, entityId, { role: 'admin' });

// Remove member
await client.spaces.removeMember(smartSpaceId, entityId);
```

### Messages

```ts
// Send message to SmartSpace (triggers agent runs)
const { message, runs } = await client.messages.send(smartSpaceId, {
  content: 'Hello, can you help me?',
  entityId: 'uuid',              // required for secret key auth
  triggerAgents: true,            // default: true
  metadata: {},
});

// Get message history
const { messages } = await client.messages.list(smartSpaceId, {
  afterSeq: 42,
  beforeSeq: 100,
  limit: 50,
});
```

### Runs

```ts
// List runs
const { runs } = await client.runs.list({
  smartSpaceId: 'uuid',
  agentEntityId: 'uuid',
  status: 'running',
  limit: 50,
});

// Get run details
const { run } = await client.runs.get(runId);

// Create run manually
const { runId } = await client.runs.create({
  smartSpaceId: 'uuid',
  agentEntityId: 'uuid',
});

// Cancel run
await client.runs.cancel(runId);

// Delete run
await client.runs.delete(runId);

// Get run events (persisted history)
const { events } = await client.runs.getEvents(runId);
```

### Tool Results

```ts
// Submit tool result via SmartSpace
await client.tools.submitResult(smartSpaceId, {
  runId: 'uuid',
  toolCallId: 'uuid',
  result: { approved: true },
});

// Submit tool result via Run
await client.tools.submitRunResult(runId, {
  callId: 'uuid',
  result: { approved: true },
});
```

### Clients (Connection Management)

```ts
// Register client
const { client: conn } = await client.clients.register({
  entityId: 'uuid',
  clientKey: 'stable-device-key',
  clientType: 'node',
  displayName: 'My Service',
  capabilities: { canExecuteTools: true },
});

// List clients for entity
const { clients } = await client.clients.list(entityId);

// Delete client
await client.clients.delete(clientId);
```

---

## Streaming API

### Subscribe to a SmartSpace (single space)

```ts
const stream = client.spaces.subscribe(smartSpaceId, {
  afterSeq: 0,  // optional: resume from sequence
});

stream.on('smartSpace.message', (event) => {
  console.log('New message:', event.data);
});

stream.on('text.delta', (event) => {
  process.stdout.write(event.data.delta);
});

stream.on('tool-input-available', (event) => {
  const { toolCallId, toolName, input } = event.data;
  // Execute tool and send result back
});

stream.on('run.created', (event) => { /* ... */ });
stream.on('run.completed', (event) => { /* ... */ });
stream.on('run.failed', (event) => { /* ... */ });
stream.on('error', (err) => { /* ... */ });

// Later: disconnect
stream.close();
```

### Subscribe to Entity (all spaces — for services)

```ts
const stream = client.entities.subscribe(entityId);

stream.on('hsafa', (event) => {
  // event.smartSpaceId tells you which space the event came from
  console.log(`[${event.smartSpaceId}] ${event.type}:`, event.data);
});

// Handle tool calls from any space
stream.on('tool-input-available', (event) => {
  const { toolCallId, toolName, input } = event.data;
  const result = await executeTool(toolName, input);

  await client.tools.submitResult(event.smartSpaceId, {
    runId: event.runId,
    toolCallId,
    result,
  });
});

stream.close();
```

### Subscribe to a Run (single run)

```ts
const stream = client.runs.subscribe(runId, {
  since: '0-0',  // optional: Redis stream ID
});

stream.on('text.delta', (event) => { /* ... */ });
stream.on('tool.call', (event) => { /* ... */ });
stream.on('run.completed', (event) => { /* ... */ });

stream.close();
```

---

## Convenience Methods

High-level methods that combine multiple API calls:

```ts
// Send message and wait for agent response (blocking)
const response = await client.messages.sendAndWait(smartSpaceId, {
  content: 'What is 2+2?',
  entityId: 'uuid',
  timeout: 30000,  // ms
});
// response.text = "2+2 = 4"
// response.toolCalls = [...]

// Create a full setup: space + entities + memberships
const setup = await client.setup.createSpace({
  name: 'My Chat',
  agents: [{ agentId: 'uuid', displayName: 'Assistant' }],
  humans: [{ externalId: 'user-123', displayName: 'John' }],
});
// setup.smartSpace, setup.entities, setup.memberships
```

---

# React SDK (`@hsafa/react`)

The React SDK provides hooks and context providers for building chat UIs and admin panels.

## Architecture

```
@hsafa/react
├── HsafaProvider         — Context provider (wraps app)
├── useHsafaClient()      — Access the underlying HsafaClient
├── Hooks (user-facing)
│   ├── useSmartSpace()   — Subscribe to a space + send messages
│   ├── useMessages()     — Read message history
│   ├── useRun()          — Subscribe to a single run
│   └── useMembers()      — List space members
├── Hooks (admin)
│   ├── useAgents()       — CRUD agents
│   ├── useEntities()     — CRUD entities
│   └── useSpaces()       — CRUD spaces
└── Integrations
    └── useHsafaRuntime() — Adapter for @assistant-ui/react
```

## Setup

```tsx
import { HsafaProvider } from '@hsafa/react';

function App() {
  return (
    <HsafaProvider
      gatewayUrl="http://localhost:3001"
      // For human users:
      publicKey="pk_..."
      jwt={userToken}
      // OR for admin panels:
      // adminKey="gk_..."
      // OR for service dashboards:
      // secretKey="sk_..."
    >
      <MyApp />
    </HsafaProvider>
  );
}
```

## User-Facing Hooks

### `useSmartSpace(smartSpaceId)`

The primary hook for chat UIs. Subscribes to a SmartSpace and provides messaging.

```tsx
function ChatRoom({ spaceId }: { spaceId: string }) {
  const {
    messages,          // SmartSpaceMessage[] — full history + live updates
    isConnected,       // boolean — SSE connection status
    isLoading,         // boolean — loading initial messages
    error,             // Error | null
    send,              // (content: string) => Promise<void>
    runs,              // ActiveRun[] — currently running agents
  } = useSmartSpace(spaceId);

  return (
    <div>
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <ChatInput onSend={send} />
      {runs.map(run => (
        <RunIndicator key={run.id} run={run} />
      ))}
    </div>
  );
}
```

### `useMessages(smartSpaceId, options?)`

Read-only message history with pagination.

```tsx
const {
  messages,       // SmartSpaceMessage[]
  isLoading,      // boolean
  hasMore,        // boolean — more pages available
  loadMore,       // () => Promise<void> — load older messages
  refresh,        // () => Promise<void> — re-fetch
} = useMessages(spaceId, { limit: 50 });
```

### `useRun(runId)`

Subscribe to a single run's events (useful for showing agent progress).

```tsx
const {
  run,            // Run object (status, agentEntityId, etc.)
  events,         // RunEvent[] — live stream of events
  text,           // string — accumulated text output
  toolCalls,      // ToolCall[] — tool calls in progress or completed
  status,         // 'queued' | 'running' | 'waiting_tool' | 'completed' | 'failed'
  isStreaming,    // boolean
} = useRun(runId);
```

### `useMembers(smartSpaceId)`

List members of a SmartSpace.

```tsx
const {
  members,        // Membership[] (with entity details)
  isLoading,
  refresh,
} = useMembers(spaceId);
```

---

## Admin Hooks

These hooks require `adminKey` or `secretKey` auth.

### `useAgents()`

```tsx
const {
  agents,               // Agent[]
  isLoading,
  create,               // (config) => Promise<Agent>
  remove,               // (agentId) => Promise<void>
  refresh,
} = useAgents();
```

### `useEntities(options?)`

```tsx
const {
  entities,             // Entity[]
  isLoading,
  create,               // (data) => Promise<Entity>
  createAgent,          // (data) => Promise<Entity>
  update,               // (entityId, data) => Promise<Entity>
  remove,               // (entityId) => Promise<void>
  refresh,
} = useEntities({ type: 'human' });
```

### `useSpaces()`

```tsx
const {
  spaces,               // SmartSpace[]
  isLoading,
  create,               // (data) => Promise<SmartSpace> — returns keys!
  update,               // (spaceId, data) => Promise<SmartSpace>
  remove,               // (spaceId) => Promise<void>
  addMember,            // (spaceId, entityId, role?) => Promise<void>
  removeMember,         // (spaceId, entityId) => Promise<void>
  refresh,
} = useSpaces();
```

### `useRuns(options?)`

```tsx
const {
  runs,                 // Run[]
  isLoading,
  cancel,               // (runId) => Promise<void>
  remove,               // (runId) => Promise<void>
  refresh,
} = useRuns({ smartSpaceId: 'uuid' });
```

---

## Integration with `@assistant-ui/react`

For rich chat UIs with tool rendering, typing indicators, etc.

```tsx
import { useHsafaRuntime } from '@hsafa/react';
import { AssistantRuntimeProvider, Thread } from '@assistant-ui/react';

function ChatPage({ spaceId }) {
  const runtime = useHsafaRuntime({
    smartSpaceId: spaceId,
    // Auth is inherited from HsafaProvider
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

---

## Tool Result Hook

For interactive tools (approval buttons, forms, etc.):

```tsx
import { useToolResult } from '@hsafa/react';

function ApprovalTool({ toolCallId, runId, smartSpaceId, args }) {
  const { submit, isSubmitting } = useToolResult();

  return (
    <div>
      <p>Approve {args.title} for ${args.amount}?</p>
      <button
        disabled={isSubmitting}
        onClick={() => submit(smartSpaceId, { runId, toolCallId, result: { approved: true } })}
      >
        Approve
      </button>
      <button
        disabled={isSubmitting}
        onClick={() => submit(smartSpaceId, { runId, toolCallId, result: { approved: false } })}
      >
        Reject
      </button>
    </div>
  );
}
```

---

# Python SDK (`hsafa`)

Same capabilities as Node.js but with Pythonic API. Both sync and async.

## Installation

```bash
pip install hsafa
```

## Initialization

```python
from hsafa import HsafaClient

# Admin mode
client = HsafaClient(
    gateway_url="http://localhost:3001",
    admin_key="gk_..."
)

# Secret key mode
client = HsafaClient(
    gateway_url="http://localhost:3001",
    secret_key="sk_..."
)
```

## Resource API

```python
# Agents
agent = client.agents.create(name="my-assistant", config={...})
agents = client.agents.list()
client.agents.delete(agent_id)

# Entities
entity = client.entities.create(type="human", external_id="user-123", display_name="John")
agent_entity = client.entities.create_agent(agent_id="uuid", display_name="Assistant")
entities = client.entities.list(type="human")
client.entities.delete(entity_id)

# Spaces
space = client.spaces.create(name="My Chat", visibility="private")
# space.public_key, space.secret_key
spaces = client.spaces.list()
client.spaces.delete(space_id)

# Members
client.spaces.add_member(space_id, entity_id=entity.id, role="member")
members = client.spaces.list_members(space_id)
client.spaces.remove_member(space_id, entity_id)

# Messages
result = client.messages.send(space_id, content="Hello!", entity_id=entity.id)
messages = client.messages.list(space_id, after_seq=0, limit=50)

# Tool results
client.tools.submit_result(space_id, run_id="uuid", tool_call_id="uuid", result={...})
```

## Streaming (Sync)

```python
# Subscribe to a space
for event in client.spaces.subscribe(space_id):
    if event.type == "text.delta":
        print(event.data["delta"], end="", flush=True)
    elif event.type == "tool-input-available":
        result = execute_tool(event.data["toolName"], event.data["input"])
        client.tools.submit_result(
            space_id,
            run_id=event.run_id,
            tool_call_id=event.data["toolCallId"],
            result=result,
        )

# Subscribe to entity (all spaces)
for event in client.entities.subscribe(entity_id):
    print(f"[{event.smart_space_id}] {event.type}: {event.data}")
```

## Async API

```python
import asyncio
from hsafa import AsyncHsafaClient

client = AsyncHsafaClient(gateway_url="http://localhost:3001", secret_key="sk_...")

async def main():
    entity = await client.entities.create(type="system", display_name="Bot")

    async for event in client.spaces.subscribe(space_id):
        if event.type == "text.delta":
            print(event.data["delta"], end="")

asyncio.run(main())
```

## Convenience: Send and Wait

```python
# Blocking: send message and wait for agent to finish
response = client.messages.send_and_wait(
    space_id,
    content="What is the weather?",
    entity_id=entity_id,
    timeout=30,
)
print(response.text)
print(response.tool_calls)
```

---

# SDK Comparison

## What each SDK can do

| Capability | Node.js | React | Python |
|-----------|---------|-------|--------|
| Create/manage agents | ✅ | ✅ (hook) | ✅ |
| Create/manage entities | ✅ | ✅ (hook) | ✅ |
| Create/manage spaces | ✅ | ✅ (hook) | ✅ |
| Manage memberships | ✅ | ✅ (hook) | ✅ |
| Send messages | ✅ | ✅ (hook) | ✅ |
| Read message history | ✅ | ✅ (hook) | ✅ |
| Subscribe to space (SSE) | ✅ | ✅ (auto in hook) | ✅ |
| Subscribe to entity (all spaces) | ✅ | ❌ (not needed) | ✅ |
| Subscribe to run | ✅ | ✅ (hook) | ✅ |
| Submit tool results | ✅ | ✅ (hook) | ✅ |
| Send and wait (blocking) | ✅ | ❌ (use hooks) | ✅ |
| Chat UI components | ❌ | ✅ | ❌ |
| assistant-ui integration | ❌ | ✅ | ❌ |

## Auth modes per SDK

| Auth Mode | Node.js | React | Python |
|-----------|---------|-------|--------|
| Admin key (`x-admin-key`) | ✅ Admin backends | ✅ Admin panels | ✅ Scripts |
| Secret key (`x-secret-key`) | ✅ Services, robots | ✅ Service dashboards | ✅ Services, bots |
| Public key + JWT (`x-public-key` + Bearer) | ✅ (rare) | ✅ User chat UIs | ✅ (rare) |

---

# Real-World Scenarios

## Scenario 1: User Registration → Entity + Space

When a user signs up in your Next.js app, create an entity and a personal space with an AI assistant.

```ts
// pages/api/auth/signup.ts (Next.js API route)
import { HsafaClient } from '@hsafa/node';

const hsafa = new HsafaClient({
  gatewayUrl: process.env.HSAFA_GATEWAY_URL,
  adminKey: process.env.HSAFA_ADMIN_KEY,
});

export async function POST(req: Request) {
  const { userId, name, email } = await req.json();

  // 1. Create human entity linked to auth user
  const { entity: human } = await hsafa.entities.create({
    type: 'human',
    externalId: userId,  // matches JWT sub claim
    displayName: name,
    metadata: { email },
  });

  // 2. Create a personal SmartSpace
  const { smartSpace } = await hsafa.spaces.create({
    name: `${name}'s Space`,
    visibility: 'private',
  });

  // 3. Add human to space
  await hsafa.spaces.addMember(smartSpace.id, {
    entityId: human.id,
    role: 'admin',
  });

  // 4. Add AI assistant to space (assumes agent entity already exists)
  await hsafa.spaces.addMember(smartSpace.id, {
    entityId: process.env.DEFAULT_AGENT_ENTITY_ID,
    role: 'member',
  });

  // 5. Store space info in your DB
  await db.user.update({
    where: { id: userId },
    data: {
      hsafaEntityId: human.id,
      hsafaSpaceId: smartSpace.id,
      hsafaPublicKey: smartSpace.publicKey,
    },
  });

  return Response.json({ success: true });
}
```

Then in the React frontend:

```tsx
// app/chat/page.tsx
import { HsafaProvider, useSmartSpace } from '@hsafa/react';
import { useAuth } from '@clerk/nextjs';

function ChatPage() {
  const { getToken } = useAuth();
  const { user } = useUser(); // your DB user with hsafaPublicKey, hsafaSpaceId

  return (
    <HsafaProvider
      gatewayUrl={process.env.NEXT_PUBLIC_HSAFA_GATEWAY_URL}
      publicKey={user.hsafaPublicKey}
      jwt={getToken()}
    >
      <Chat spaceId={user.hsafaSpaceId} />
    </HsafaProvider>
  );
}

function Chat({ spaceId }) {
  const { messages, send, runs, isConnected } = useSmartSpace(spaceId);

  return (
    <div>
      <div className="messages">
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {runs.map(run => <TypingIndicator key={run.id} />)}
      </div>
      <ChatInput onSend={(text) => send(text)} disabled={!isConnected} />
    </div>
  );
}
```

---

## Scenario 2: Admin Panel (React + Secret Key)

An internal admin panel where staff can create agents, manage spaces, and monitor runs.

```tsx
// app/admin/layout.tsx
import { HsafaProvider } from '@hsafa/react';

function AdminLayout({ children }) {
  return (
    <HsafaProvider
      gatewayUrl={process.env.NEXT_PUBLIC_HSAFA_GATEWAY_URL}
      secretKey={process.env.NEXT_PUBLIC_HSAFA_SECRET_KEY}  // only for internal admin!
    >
      {children}
    </HsafaProvider>
  );
}

// app/admin/agents/page.tsx
import { useAgents } from '@hsafa/react';

function AgentsPage() {
  const { agents, isLoading, create, remove, refresh } = useAgents();

  const handleCreate = async () => {
    await create({
      name: 'support-agent',
      config: {
        version: '1.0',
        agent: { name: 'support-agent', system: 'You are a support agent.' },
        model: { provider: 'openai', name: 'gpt-4.1-mini' },
        tools: [],
      },
    });
  };

  return (
    <div>
      <h1>Agents</h1>
      <button onClick={handleCreate}>Create Agent</button>
      {agents.map(agent => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onDelete={() => remove(agent.id)}
        />
      ))}
    </div>
  );
}

// app/admin/spaces/page.tsx
import { useSpaces, useEntities } from '@hsafa/react';

function SpacesPage() {
  const { spaces, create, addMember, removeMember } = useSpaces();
  const { entities } = useEntities();

  const handleCreateSpace = async () => {
    const { smartSpace } = await create({
      name: 'Customer Support',
      visibility: 'private',
    });

    // Show the keys to the admin
    alert(`Public Key: ${smartSpace.publicKey}\nSecret Key: ${smartSpace.secretKey}`);
  };

  return (
    <div>
      <h1>SmartSpaces</h1>
      <button onClick={handleCreateSpace}>Create Space</button>
      {spaces.map(space => (
        <SpaceCard
          key={space.id}
          space={space}
          onAddMember={(entityId) => addMember(space.id, entityId)}
        />
      ))}
    </div>
  );
}

// app/admin/runs/page.tsx
import { useRuns } from '@hsafa/react';

function RunsPage() {
  const { runs, isLoading, cancel } = useRuns();

  return (
    <div>
      <h1>Active Runs</h1>
      {runs.map(run => (
        <RunCard
          key={run.id}
          run={run}
          onCancel={() => cancel(run.id)}
        />
      ))}
    </div>
  );
}
```

---

## Scenario 3: Robot / Service (Node.js)

A Node.js service that listens to tool calls and executes them (e.g., an order processor).

```ts
// services/order-processor.ts
import { HsafaClient } from '@hsafa/node';

const client = new HsafaClient({
  gatewayUrl: process.env.HSAFA_GATEWAY_URL,
  secretKey: process.env.HSAFA_SECRET_KEY,
});

const SERVICE_ENTITY_ID = process.env.SERVICE_ENTITY_ID;

async function main() {
  console.log('Order processor starting...');

  // Subscribe to ALL spaces this service is a member of
  const stream = client.entities.subscribe(SERVICE_ENTITY_ID);

  stream.on('tool-input-available', async (event) => {
    const { toolCallId, toolName, input } = event.data;

    console.log(`Tool call: ${toolName}`, input);

    let result;
    switch (toolName) {
      case 'processOrder':
        result = await processOrder(input.orderId, input.items);
        break;
      case 'checkInventory':
        result = await checkInventory(input.productId);
        break;
      default:
        console.log(`Unknown tool: ${toolName}, skipping`);
        return;
    }

    // Send result back to gateway
    await client.tools.submitResult(event.smartSpaceId, {
      runId: event.runId,
      toolCallId,
      result,
    });

    console.log(`Tool result submitted for ${toolName}`);
  });

  stream.on('smartSpace.message', (event) => {
    console.log(`[${event.smartSpaceId}] New message:`, event.data);
  });

  stream.on('error', (err) => {
    console.error('Stream error:', err);
  });

  // Optionally: send messages proactively
  await client.messages.send('orders-space-id', {
    content: 'Order processor is online and ready.',
    entityId: SERVICE_ENTITY_ID,
    triggerAgents: false,  // don't trigger agents for system messages
  });
}

main().catch(console.error);
```

---

## Scenario 4: Python Data Pipeline

A Python service that processes data and sends results to a SmartSpace.

```python
# services/data_pipeline.py
from hsafa import HsafaClient

client = HsafaClient(
    gateway_url="http://localhost:3001",
    secret_key="sk_..."
)

PIPELINE_ENTITY_ID = "data-pipeline-entity-id"
ANALYTICS_SPACE_ID = "analytics-space-id"

def run_daily_report():
    # Generate report
    report = generate_report()

    # Send to SmartSpace (agents in the space will see it)
    client.messages.send(
        ANALYTICS_SPACE_ID,
        content=f"Daily Report:\n{report.summary}",
        entity_id=PIPELINE_ENTITY_ID,
        trigger_agents=True,  # let the analytics agent process it
    )

def listen_for_tool_calls():
    """Listen for tool calls from agents in all spaces."""
    for event in client.entities.subscribe(PIPELINE_ENTITY_ID):
        if event.type == "tool-input-available":
            tool_name = event.data["toolName"]
            tool_input = event.data["input"]

            if tool_name == "queryDatabase":
                result = query_db(tool_input["sql"])
            elif tool_name == "generateChart":
                result = generate_chart(tool_input)
            else:
                continue

            client.tools.submit_result(
                event.smart_space_id,
                run_id=event.run_id,
                tool_call_id=event.data["toolCallId"],
                result=result,
            )
```

---

## Scenario 5: Multi-Agent System

Create a system with multiple agents collaborating in a shared space.

```ts
import { HsafaClient } from '@hsafa/node';

const admin = new HsafaClient({
  gatewayUrl: 'http://localhost:3001',
  adminKey: 'gk_...',
});

async function setupMultiAgentSystem() {
  // 1. Create agents
  const { agentId: researcherId } = await admin.agents.create({
    name: 'researcher',
    config: {
      version: '1.0',
      agent: { name: 'researcher', system: 'You research topics deeply.' },
      model: { provider: 'openai', name: 'gpt-4.1' },
      tools: [{ name: 'webSearch', executionTarget: 'server' }],
    },
  });

  const { agentId: writerId } = await admin.agents.create({
    name: 'writer',
    config: {
      version: '1.0',
      agent: { name: 'writer', system: 'You write clear, concise content.' },
      model: { provider: 'anthropic', name: 'claude-sonnet-4-20250514' },
      tools: [],
    },
  });

  // 2. Create agent entities
  const { entity: researcherEntity } = await admin.entities.createAgent({
    agentId: researcherId,
    displayName: 'Researcher',
  });

  const { entity: writerEntity } = await admin.entities.createAgent({
    agentId: writerId,
    displayName: 'Writer',
  });

  // 3. Create collaboration space
  const { smartSpace } = await admin.spaces.create({
    name: 'Content Team',
    visibility: 'private',
  });

  // 4. Add all agents + human to space
  await admin.spaces.addMember(smartSpace.id, { entityId: researcherEntity.id });
  await admin.spaces.addMember(smartSpace.id, { entityId: writerEntity.id });

  // Create and add human
  const { entity: human } = await admin.entities.create({
    type: 'human',
    externalId: 'editor-user-id',
    displayName: 'Editor',
  });
  await admin.spaces.addMember(smartSpace.id, { entityId: human.id });

  console.log('Multi-agent system ready!');
  console.log('Space ID:', smartSpace.id);
  console.log('Public Key:', smartSpace.publicKey);
  console.log('Secret Key:', smartSpace.secretKey);
}

setupMultiAgentSystem();
```

---

# TypeScript Types

## Core Types

```ts
interface HsafaClientOptions {
  gatewayUrl: string;
  adminKey?: string;     // x-admin-key
  secretKey?: string;    // x-secret-key
  publicKey?: string;    // x-public-key (requires jwt)
  jwt?: string;          // Authorization: Bearer
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  configJson: Record<string, unknown>;
  configHash: string;
  createdAt: string;
  updatedAt: string;
}

interface Entity {
  id: string;
  type: 'human' | 'agent' | 'system';
  externalId?: string;
  displayName?: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface SmartSpace {
  id: string;
  name?: string;
  description?: string;
  isPrivate: boolean;
  publicKey: string;   // pk_...
  secretKey: string;   // sk_...
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface SmartSpaceMessage {
  id: string;
  smartSpaceId: string;
  entityId?: string;
  seq: number;
  role: string;
  content?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface Membership {
  id: string;
  smartSpaceId: string;
  entityId: string;
  role?: string;
  joinedAt: string;
  entity?: Entity;
}

interface Run {
  id: string;
  smartSpaceId: string;
  agentEntityId: string;
  agentId: string;
  triggeredById?: string;
  parentRunId?: string;
  status: 'queued' | 'running' | 'waiting_tool' | 'completed' | 'failed' | 'canceled';
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

interface StreamEvent {
  id: string;
  type: string;
  smartSpaceId?: string;
  runId?: string;
  agentEntityId?: string;
  data: Record<string, unknown>;
}
```

## Event Types

```ts
type EventType =
  // SmartSpace events
  | 'smartSpace.message'
  | 'smartSpace.member.joined'
  | 'smartSpace.member.left'
  // Run lifecycle
  | 'run.created'
  | 'run.started'
  | 'run.waiting_tool'
  | 'run.completed'
  | 'run.failed'
  | 'run.canceled'
  // Streaming content
  | 'text.delta'
  | 'reasoning.delta'
  | 'step.start'
  | 'step.finish'
  // Tool events
  | 'tool-input-start'
  | 'tool-input-delta'
  | 'tool-input-available'
  | 'tool-output-available'
  // Message persistence
  | 'message.user'
  | 'message.assistant'
  | 'message.tool';
```

---

# SDK Development Priority

| Priority | SDK | Reason |
|----------|-----|--------|
| 1 | `@hsafa/node` | Foundation — React SDK depends on it, needed for backend integration |
| 2 | `@hsafa/react` | Primary UI SDK — most common use case |
| 3 | `hsafa` (Python) | Secondary — for data pipelines and ML services |
| 4 | `@hsafa/cli` | Developer tooling — can use Node SDK internally |

### `@hsafa/node` Internal Structure

```
@hsafa/node/
├── src/
│   ├── client.ts           — HsafaClient class (main entry point)
│   ├── auth.ts             — Auth header logic
│   ├── http.ts             — Fetch wrapper with auth
│   ├── sse.ts              — SSE stream client with reconnect
│   ├── resources/
│   │   ├── agents.ts       — AgentsResource class
│   │   ├── entities.ts     — EntitiesResource class
│   │   ├── spaces.ts       — SpacesResource class
│   │   ├── messages.ts     — MessagesResource class
│   │   ├── runs.ts         — RunsResource class
│   │   ├── tools.ts        — ToolsResource class
│   │   └── clients.ts      — ClientsResource class
│   └── types.ts            — All TypeScript interfaces
├── package.json
├── tsconfig.json
└── README.md
```

### `@hsafa/react` Internal Structure

```
@hsafa/react/
├── src/
│   ├── provider.tsx        — HsafaProvider context
│   ├── context.ts          — React context + useHsafaClient()
│   ├── hooks/
│   │   ├── useSmartSpace.ts
│   │   ├── useMessages.ts
│   │   ├── useRun.ts
│   │   ├── useMembers.ts
│   │   ├── useAgents.ts
│   │   ├── useEntities.ts
│   │   ├── useSpaces.ts
│   │   ├── useRuns.ts
│   │   └── useToolResult.ts
│   ├── runtime/
│   │   └── useHsafaRuntime.ts  — @assistant-ui/react adapter
│   └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```
