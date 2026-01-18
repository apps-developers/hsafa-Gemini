# Agent Builder API

A dynamic YAML-based agent builder that creates and executes `ToolLoopAgent` instances at runtime.

## Overview

This implementation provides:

- **YAML-based agent configuration** - Define agents declaratively
- **Runtime agent composition** - Build agents dynamically from config
- **Streaming responses** - Real-time UI message streams
- **Type-safe validation** - Zod-based schema validation
- **Environment variable interpolation** - Secure secret handling

## Architecture

```
lib/agent-builder/
├── types.ts           # Zod schemas and TypeScript types
├── parser.ts          # YAML parsing and validation
├── model-resolver.ts  # Model provider resolution
├── builder.ts         # Agent construction logic
└── index.ts          # Public exports
```

## API Endpoint

### POST `/api/agent`

Executes an agent based on YAML configuration and returns a streaming response.

**Request Body:**
```json
{
  "agentYaml": "version: \"1.0\"\nagent:\n  name: basic-chat\n  ...",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

**Response:**
- Streaming UI message response compatible with AI SDK
- Contains text deltas, tool calls, and tool results

## Usage Example

### Basic Chat Agent

```yaml
version: "1.0"

agent:
  name: basic-chat
  description: Basic chat agent without tools.
  system: |
    You are a helpful assistant.
    Keep answers concise.

model:
  provider: openai
  name: gpt-4o-mini
  temperature: 0.7
  maxOutputTokens: 800

loop:
  maxSteps: 5
  toolChoice: auto

runtime:
  response:
    type: ui-message-stream
```

### Calling the API

```typescript
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentYaml: yamlConfigString,
    messages: [
      { role: 'user', content: 'What is the weather?' }
    ]
  })
});

// Stream the response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk);
}
```

### Using with AI SDK Client

```typescript
import { useChat } from '@ai-sdk/react';

function ChatComponent() {
  const { messages, sendMessage } = useChat({
    transport: {
      api: '/api/agent',
      body: {
        agentYaml: yamlConfigString
      }
    }
  });

  // Use messages and sendMessage in your UI
}
```

## Configuration Schema

### Version
- **Required**: `version: "1.0"`

### Agent
```yaml
agent:
  name: string                    # Agent identifier
  description: string (optional)  # Human-readable description
  system: string                  # System instructions/prompt
```

### Model
```yaml
model:
  provider: string               # Provider name (currently: "openai")
  name: string                   # Model name (e.g., "gpt-4o-mini")
  temperature: number (0-2)      # Sampling temperature (default: 0.7)
  maxOutputTokens: number        # Max tokens to generate (default: 1000)
```

### Loop Control
```yaml
loop:
  maxSteps: number               # Maximum agent steps (default: 5)
  toolChoice: string             # "auto" | "required" | "none" (default: "auto")
```

### Tools (Future Support)
```yaml
tools:
  - id: string
    type: "http" | "inline_js" | "registry"
    description: string
    inputSchema: object
    # ... tool-specific config
```

### MCP Servers (Future Support)
```yaml
mcp:
  servers:
    - name: string
      url: string
      transport: "http" | "websocket"
      headers: object (optional)
      allowedTools: string[] (optional)
```

### Runtime
```yaml
runtime:
  response:
    type: "ui-message-stream" | "text-stream"
```

## Environment Variables

Set in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

### Environment Variable Interpolation

Use `${env.VAR_NAME}` syntax in YAML for secure secret handling:

```yaml
tools:
  - id: api_call
    type: http
    http:
      headers:
        Authorization: Bearer ${env.API_TOKEN}
```

## Current Implementation Status

### ✅ Completed
- YAML parsing and validation
- Basic agent configuration (name, system, description)
- Model configuration (OpenAI support)
- Loop control (maxSteps, toolChoice)
- Environment variable interpolation
- API route with streaming support
- Error handling and validation

### 🚧 Planned
- Tool support (HTTP, inline JS, registry)
- MCP server integration
- Additional model providers
- Tool approval workflow
- Caching layer

## Error Handling

The API returns structured errors:

```json
{
  "error": "Agent build failed",
  "message": "Configuration validation failed: ..."
}
```

Status codes:
- `400` - Invalid configuration or request
- `500` - Internal server error

## Testing

Test the basic chat agent:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agentYaml": "version: \"1.0\"\nagent:\n  name: test\n  system: You are helpful.\nmodel:\n  provider: openai\n  name: gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Security Considerations

1. **No secrets in YAML** - Use environment variable interpolation
2. **Validation** - All configs are validated with Zod schemas
3. **Sanitization** - Environment variables are properly interpolated
4. **Future**: Tool execution sandboxing, approval workflows

## Next Steps

To extend this implementation:

1. Add tool support (see `types.ts` for schemas)
2. Implement MCP client integration
3. Add provider caching
4. Build tool registry system
5. Add observability/logging
