# Adding Tools to Agent Config

## Overview

Tools are defined in the agent configuration JSON. Each tool has a name, standard Vercel AI SDK properties, and an execution type that determines how it runs.

## Tool Structure

```json
{
  "name": "string",
  "description": "string",
  "inputSchema": {},                // Optional for some execution types
  "executionType": "basic|request|image-generator",  // Optional, defaults to "basic"
  "execution": {}
}
```

## Properties

### Standard Properties (from Vercel AI SDK)

- **`name`** (required) - Unique tool identifier
- **`description`** (optional) - What the tool does, helps LLM decide when to use it
- **`inputSchema`** (optional) - JSON schema defining input parameters
  - Required for: `basic`, `request`
  - Has default for: `image-generator` (automatic `prompt` schema, do not add manually)

### Hsafa Logic Properties

- **`executionType`** (optional) - Type of execution, defaults to `"basic"`
- **`execution`** (optional) - Configuration specific to the execution type

## Execution Types

### 1. `basic`
No backend execution logic. Executes on frontend.

**Execution config:**
```json
{
  "mode": "no-execution|static|pass-through",
  "output": {},      // For static mode
  "template": false  // For static mode with variables
}
```

**If `execution` is null:** Uses no-execution mode (gets response from frontend via `addToolResult`)

### 2. `request`
Make HTTP requests to external APIs.

**Execution config:**
```json
{
  "url": "string",
  "method": "GET|POST|PUT|DELETE|PATCH",
  "headers": {},
  "timeout": 30000
}
```

### 3. `image-generator`
Generate images from text prompts.

**Execution config:**
```json
{
  "provider": "dall-e|stable-diffusion",
  "size": "1024x1024",
  "quality": "standard|hd",
  "includeContext": false  // Optional: pass message context to model (default: false)
}
```

**Note:** Has default `prompt` inputSchema (automatic, do not add manually).

## Examples

### Basic Tool (No Execution)
```json
{
  "name": "getUserApproval",
  "description": "Request user approval for an action",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {"type": "string"},
      "amount": {"type": "number"}
    },
    "required": ["action"]
  },
  "executionType": "basic",
  "execution": null
}
```
Uses default no-execution mode, gets response from frontend.

### Basic Tool (Static)
```json
{
  "name": "getStatus",
  "description": "Get current status",
  "inputSchema": {
    "type": "object",
    "properties": {}
  },
  "executionType": "basic",
  "execution": {
    "mode": "static",
    "output": {"status": "ACTIVE", "ready": true}
  }
}
```

### Request Tool
```json
{
  "name": "fetchUserData",
  "description": "Fetch user data from API",
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": {"type": "string"}
    },
    "required": ["userId"]
  },
  "executionType": "request",
  "execution": {
    "url": "https://api.example.com/users/{{userId}}",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer {{apiKey}}"
    }
  }
}
```

### Image Generator Tool
```json
{
  "name": "createProductImage",
  "description": "Generate product images from description",
  "executionType": "image-generator",
  "execution": {
    "provider": "dall-e",
    "size": "1024x1024",
    "quality": "hd",
    "includeContext": false
  }
}
```

**Note:** Default `prompt` inputSchema is automatic - do not add manually.

## Notes

- **Default executionType** - If not specified, defaults to `"basic"`
- **Standard Vercel AI SDK structure** - Compatible with `description`, `inputSchema`
- **`execution` property** - Hsafa Logic extension for backend execution configuration
- **Null execution** - Valid for basic tool (defaults to no-execution mode) and tools where config comes from input
- **Default inputSchema** - Image Generator tools have automatic `prompt` inputSchema (do not add manually)
- **Variable substitution** - Use `{{variableName}}` in execution config (e.g., URLs, headers)
- **Type safety** - Use JSON schema for `inputSchema` validation where applicable
