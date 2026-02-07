# Client Authentication & Subscription Guide

This document describes how clients authenticate and subscribe to SmartSpaces in the Hsafa Gateway.

---

## Key Types

| Key | Purpose | Who Uses It |
|-----|---------|-------------|
| **Public Key** (`pk_...`) | Identifies SmartSpace, grants read access | All clients |
| **Secret Key** (`sk_...`) | Admin access, full control | Your backend, Node.js services |

---

## Authentication by Client Type

### React (Human Users)

Human users authenticate via JWT from your existing auth system (Clerk, Auth0, NextAuth, etc.).

```tsx
import { HsafaProvider, useSmartSpace } from '@hsafa/react';
import { useAuth } from 'your-auth-provider'; // Clerk, Auth0, etc.

function App({ spaceId }) {
  const { token } = useAuth(); // JWT from your auth system

  return (
    <HsafaProvider
      gatewayUrl="http://localhost:3001"
      publicKey="pk_..."
      jwt={token}
    >
      <Chat spaceId={spaceId} />
    </HsafaProvider>
  );
}

function Chat({ spaceId }) {
  const { messages, send } = useSmartSpace(spaceId);

  return <ChatUI messages={messages} onSend={send} />;
}
```

**How JWT works:**

1. User logs in via your auth system → gets JWT
2. JWT contains user identifier (e.g., `sub: "clerk_user_123"`)
3. Client passes JWT to Hsafa SDK
4. Gateway verifies JWT signature
5. Gateway looks up entity by `externalId` matching JWT claim
6. Gateway checks entity is member of the SmartSpace
7. If all valid → allow action

### Node.js (System Entities / Services)

System entities authenticate via secret key.

```ts
import { HsafaClient } from '@hsafa/node';

const client = new HsafaClient({
  gatewayUrl: 'http://localhost:3001',
  secretKey: 'sk_...',
});
```

---

## Service Subscription (Single Entity Stream)

For Node.js services that need to listen to multiple SmartSpaces, use a **single entity stream** instead of multiple connections.

### How It Works

```
┌─────────────────┐         ┌─────────────────────────────────────┐
│  Node.js        │         │           Hsafa Gateway             │
│  Service        │         │                                     │
│                 │         │  ┌─────────────────────────────┐    │
│                 │   SSE   │  │ SmartSpace A (service is    │    │
│  subscribeAll() │◄───────►│  │ member) → events routed     │    │
│                 │         │  ├─────────────────────────────┤    │
│                 │         │  │ SmartSpace B (service is    │    │
│                 │         │  │ member) → events routed     │    │
│                 │         │  ├─────────────────────────────┤    │
│                 │         │  │ SmartSpace C (NOT member)   │    │
│                 │         │  │ → NO events                 │    │
│                 │         │  └─────────────────────────────┘    │
└─────────────────┘         └─────────────────────────────────────┘
```

### Usage

```ts
import { HsafaClient } from '@hsafa/node';

const client = new HsafaClient({
  gatewayUrl: 'http://localhost:3001',
  secretKey: 'sk_...',
});

const SERVICE_ENTITY_ID = 'order-processor-entity-id';

// Single connection - receives events from ALL spaces this entity is in
const stream = client.entities.subscribe(SERVICE_ENTITY_ID);

stream.on('smartSpace.message', (event) => {
  console.log(`[${event.smartSpaceId}] ${event.type}:`, event.data);
});

stream.on('tool-input-available', async (event) => {
  // An agent needs this service to execute a tool
  const { toolCallId, toolName, input } = event.data;

  // Execute the tool
  const result = await executeMyTool(toolName, input);

  // Send result back
  await client.tools.submitResult(event.smartSpaceId, {
    runId: event.runId,
    toolCallId,
    result,
  });
});
```

### Benefits

- **Single connection** - no need to manage multiple SSE streams
- **Automatic routing** - Gateway sends events from all spaces entity is member of
- **Simple code** - one subscription handles everything
- **Efficient** - less connections, less overhead

---

## Entity Management Flow

Entities must be created and added to spaces **before** they can interact.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR APP (Backend)                          │
│                                                                 │
│  1. User signs up → Create entity in Gateway                    │
│  2. User joins workspace → Add entity to SmartSpace             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HSAFA GATEWAY                               │
│                                                                 │
│  - Stores entities with externalId (links to your auth)         │
│  - Stores memberships (which entities are in which spaces)      │
│  - JWT validates identity                                       │
│  - Checks membership before allowing actions                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Your Backend Code

```ts
import { HsafaClient } from '@hsafa/node';

const client = new HsafaClient({
  gatewayUrl: 'http://localhost:3001',
  secretKey: 'sk_...',
});

// When user signs up in your app
async function onUserSignup(authUser) {
  // Create entity in Hsafa Gateway
  const { entity } = await client.entities.create({
    type: 'human',
    externalId: authUser.id,      // Links to JWT sub/userId claim
    displayName: authUser.name,
  });
  
  return entity;
}

// When user joins a workspace/project
async function onUserJoinsWorkspace(entityId, smartSpaceId) {
  await client.spaces.addMember(smartSpaceId, {
    entityId,
    role: 'member',
  });
}

// Create a system entity (service)
async function createServiceEntity() {
  const { entity } = await client.entities.create({
    type: 'system',
    displayName: 'Order Processor',
  });
  
  // Add to relevant spaces
  await client.spaces.addMember('orders-space-id', {
    entityId: entity.id,
  });
  
  return entity;
}
```

---

## Gateway Configuration

### JWT Verification

Configure how Gateway verifies JWTs:

```env
# Option A: Shared secret (simple)
JWT_SECRET=your-jwt-secret
JWT_ENTITY_CLAIM=sub

# Option B: JWKS URL (works with Clerk, Auth0, etc.)
JWKS_URL=https://your-auth.clerk.accounts.dev/.well-known/jwks.json
JWT_ENTITY_CLAIM=sub
```

### Supported Auth Providers

| Provider | JWKS URL |
|----------|----------|
| Clerk | `https://xxx.clerk.accounts.dev/.well-known/jwks.json` |
| Auth0 | `https://xxx.auth0.com/.well-known/jwks.json` |
| Supabase | Use `JWT_SECRET` from project settings |
| NextAuth | Use `JWT_SECRET` |
| Custom | Your own JWKS or secret |

---

## Summary

| Client Type | Authentication | Subscription |
|-------------|----------------|--------------|
| **React (human)** | `publicKey` + `jwt` | Per-space via SDK hooks |
| **Node.js (service)** | `secretKey` | Single entity stream (`client.entities.subscribe`) |
| **Your backend** | `secretKey` | Admin APIs for entity/membership management |
