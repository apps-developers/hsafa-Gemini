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

## Architecture

See `../hsafa-docs/idea-docs/11-agent-builder-server.mdx` for the full platform architecture.
