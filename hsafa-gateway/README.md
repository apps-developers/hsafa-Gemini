# Hsafa Gateway

Node.js server for the Hsafa Agent Builder platform.

## Features

- **Agent Builder API** - Build agents dynamically from JSON configs
- **Distributed Tool Execution** - Tools can run on server, browser, or any connected device
- **Persistent Memory** - PostgreSQL for long-term storage, Redis for live streaming
- **Multi-client Support** - Web, mobile, Node.js clients via SSE + WebSockets

## Setup

```bash
pnpm install
```

Create a `.env` file:

```env
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
XAI_API_KEY=your-key-here
```

## Development

```bash
pnpm dev
```

## Production

```bash
pnpm build
pnpm start
```

## API Endpoints

### POST /api/agent
Build and run an agent from a JSON config.

**Request:**
```json
{
  "agentConfig": { ... },
  "messages": [ ... ]
}
```

**Response:** Server-Sent Events stream

### GET /api/agent-config/:agentName
Load a predefined agent configuration.

## Testing Redis Streaming

The gateway uses Redis Streams for real-time event delivery. You can test and monitor the streaming with the included script.

### Prerequisites

Make sure Redis is running:

```bash
# Using Docker (from project root)
docker-compose up -d redis

# Or standalone Redis
redis-server
```

### Monitor Streams

```bash
# List all active streams
npx ts-node scripts/test-redis-streaming.ts list

# Monitor a specific run's stream in real-time
npx ts-node scripts/test-redis-streaming.ts run <runId>

# Monitor a smart space's stream
npx ts-node scripts/test-redis-streaming.ts smartspace <smartSpaceId>

# Read all historical events from a run
npx ts-node scripts/test-redis-streaming.ts read <runId>
```

### Testing with curl

```bash
# 1. Create an agent
curl -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "version": "1.0",
      "agent": { "name": "test-agent", "system": "You are helpful." },
      "model": { "provider": "openai", "name": "gpt-4.1-mini" },
      "tools": []
    }
  }'
# Returns: { "agentId": "..." }

# 2. Create entities
curl -X POST http://localhost:3001/api/entities \
  -H "Content-Type: application/json" \
  -d '{ "type": "human", "externalId": "user-1", "displayName": "Test User" }'
# Returns: { "entity": { "id": "..." } }

curl -X POST http://localhost:3001/api/entities/agent \
  -H "Content-Type: application/json" \
  -d '{ "agentId": "<agentId>", "displayName": "Test Agent" }'
# Returns: { "entity": { "id": "..." } }

# 3. Create a smart space and add members
curl -X POST http://localhost:3001/api/smart-spaces \
  -H "Content-Type: application/json" \
  -d '{ "name": "Test Chat" }'
# Returns: { "smartSpace": { "id": "..." } }

curl -X POST http://localhost:3001/api/smart-spaces/<smartSpaceId>/members \
  -H "Content-Type: application/json" \
  -d '{ "entityId": "<userEntityId>" }'

curl -X POST http://localhost:3001/api/smart-spaces/<smartSpaceId>/members \
  -H "Content-Type: application/json" \
  -d '{ "entityId": "<agentEntityId>" }'

# 4. Subscribe to the stream (in one terminal)
curl -N http://localhost:3001/api/smart-spaces/<smartSpaceId>/stream

# 5. Send a message (in another terminal)
curl -X POST http://localhost:3001/api/smart-spaces/<smartSpaceId>/messages \
  -H "Content-Type: application/json" \
  -d '{ "content": "Hello!", "entityId": "<userEntityId>" }'
```

### Stream Event Types

The streaming protocol emits these event types:

| Event | Description |
|-------|-------------|
| `start` | Message start with messageId |
| `text-start` | Beginning of text block |
| `text-delta` | Incremental text content |
| `text-end` | Text block complete |
| `reasoning-start` | Beginning of reasoning (Claude extended thinking) |
| `reasoning-delta` | Incremental reasoning content |
| `reasoning-end` | Reasoning block complete |
| `tool-input-start` | Tool call initiated |
| `tool-input-delta` | Tool args streaming (with partial JSON) |
| `tool-input-available` | Tool call complete (full JSON input) |
| `tool-output-available` | Tool result (full JSON output) |
| `step.start` | LLM call started |
| `step.finish` | LLM call completed |
| `finish` | Message complete |
| `run.completed` | Run finished |

### Structured Tool Input Streaming

Tool inputs are streamed with **structured JSON** - not just text chunks:

```json
// tool-input-delta event includes:
{
  "toolCallId": "call_abc123",
  "toolName": "searchDatabase",
  "inputTextDelta": "\"us",           // raw text chunk
  "accumulatedArgsText": "{\"query\": \"us", // accumulated text
  "partialInput": null                 // null until valid JSON
}

// When JSON becomes valid:
{
  "toolCallId": "call_abc123",
  "toolName": "searchDatabase", 
  "inputTextDelta": "\"}",
  "accumulatedArgsText": "{\"query\": \"user search\"}",
  "partialInput": { "query": "user search" }  // parsed JSON!
}

// tool-input-available event has complete input:
{
  "toolCallId": "call_abc123",
  "toolName": "searchDatabase",
  "input": { "query": "user search" }  // complete structured JSON
}
```

## Architecture

See `../hsafa-docs/idea-docs/hsafa-gateway-implementation-blueprint.md` for the full platform architecture.
