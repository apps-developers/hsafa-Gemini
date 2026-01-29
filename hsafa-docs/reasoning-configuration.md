# Reasoning Configuration

Enable advanced reasoning capabilities for supported AI models in your agent configuration.

## Overview

Reasoning mode allows AI models to perform deeper analysis and show their thinking process before providing answers. This feature is particularly useful for complex problem-solving, mathematical computations, and tasks requiring multi-step logical reasoning.

## Supported Providers

- **OpenAI**: gpt-4o, gpt-5.2, and other reasoning-enabled models
- **Anthropic**: Claude models with extended thinking
- **Google**: Gemini models with thinking configuration
- **xAI**: Grok models with reasoning support

## Configuration

Add the `reasoning` object to your model configuration:

```typescript
"model": {
  "provider": "openai",
  "name": "gpt-5.2",
  "temperature": 0.7,
  "reasoning": {
    "enabled": true,
    "effort": "medium",
    "summary": "detailed",
    "includeThoughts": true
  }
}
```

## Configuration Options

### `enabled` (boolean)
- **Required**: Yes
- **Default**: `false`
- **Description**: Enable or disable reasoning mode

### `effort` (string)
- **Required**: No
- **Values**: `"minimal"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`
- **Description**: Controls the depth and thoroughness of reasoning
- **Provider mapping**:
  - **OpenAI**: Maps to `reasoningEffort`
  - **xAI**: Maps to `reasoningEffort` (minimal/low → low, medium → medium, high/xhigh → high)
  - **Google**: Maps to `thinkingLevel` in `thinkingConfig`

### `summary` (string)
- **Required**: No
- **Values**: `"concise"`, `"detailed"`
- **Description**: Controls the verbosity of reasoning summaries
- **Provider**: OpenAI only (maps to `reasoningSummary`)

### `includeThoughts` (boolean)
- **Required**: No
- **Default**: `false`
- **Description**: Include the model's internal reasoning process in the response
- **Provider**: Google only (maps to `includeThoughts` in `thinkingConfig`)

### `budgetTokens` (number)
- **Required**: For Anthropic (when enabled)
- **Description**: Maximum tokens allocated for thinking process
- **Providers**: Anthropic (required), Google (optional as `thinkingBudget`)

### `systemMessageMode` (string)
- **Required**: No
- **Description**: Controls how system messages interact with reasoning
- **Provider**: OpenAI only

### `forceReasoning` (boolean)
- **Required**: No
- **Description**: Force the model to use reasoning even for simple queries
- **Provider**: OpenAI only

## Provider-Specific Examples

### OpenAI (gpt-5.2, gpt-4o)

```typescript
"model": {
  "provider": "openai",
  "name": "gpt-5.2",
  "reasoning": {
    "enabled": true,
    "effort": "high",
    "summary": "detailed",
    "forceReasoning": false,
    "systemMessageMode": "default"
  }
}
```

### Anthropic (Claude)

```typescript
"model": {
  "provider": "anthropic",
  "name": "claude-3-5-sonnet-20241022",
  "reasoning": {
    "enabled": true,
    "budgetTokens": 4000
  }
}
```

**Note**: For Anthropic, `budgetTokens` is **required** when reasoning is enabled. If not provided, the system will throw an error.

### Google (Gemini)

```typescript
"model": {
  "provider": "google",
  "name": "gemini-2.0-flash-thinking-exp",
  "reasoning": {
    "enabled": true,
    "effort": "high",
    "budgetTokens": 8000,
    "includeThoughts": true
  }
}
```

### xAI (Grok)

```typescript
"model": {
  "provider": "xai",
  "name": "grok-2-latest",
  "reasoning": {
    "enabled": true,
    "effort": "medium"
  }
}
```

## Advanced: Provider Options Override

You can also configure reasoning directly through `providerOptions` for fine-grained control:

```typescript
"model": {
  "provider": "openai",
  "name": "gpt-5.2",
  "providerOptions": {
    "openai": {
      "reasoningEffort": "high",
      "reasoningSummary": "detailed"
    }
  }
}
```

**Note**: Provider-specific options in `providerOptions` take precedence over generic `reasoning` configuration.

## How It Works

The agent builder automatically merges your `reasoning` configuration into provider-specific options:

1. **OpenAI**: Maps to `reasoningEffort`, `reasoningSummary`, `systemMessageMode`, `forceReasoning`
2. **Anthropic**: Creates `thinking: { type: 'enabled', budgetTokens: <value> }`
3. **Google**: Creates `thinkingConfig` with `thinkingLevel`, `thinkingBudget`, `includeThoughts`
4. **xAI**: Maps to `reasoningEffort` with normalized values

## Error Handling

The system validates reasoning configuration at build time:

- **Missing budgetTokens for Anthropic**: Throws an error if `enabled: true` but no `budgetTokens` specified
- **Invalid effort values**: Must be one of the supported effort levels
- **Type mismatches**: Ensures all values match expected types

## Best Practices

1. **Start with medium effort**: Balance between quality and response time
2. **Use high effort for complex tasks**: Mathematical problems, code debugging, logical puzzles
3. **Enable includeThoughts for transparency**: Helps understand the model's reasoning process
4. **Set appropriate budgetTokens**: Higher budgets allow more thorough reasoning but increase latency
5. **Test with your use case**: Different tasks may benefit from different reasoning configurations

## Example: Complete Agent Config

```typescript
const agentConfig = {
  "version": "1.0",
  "agent": {
    "name": "reasoning-assistant",
    "description": "AI assistant with advanced reasoning",
    "system": "You are a helpful assistant that thinks deeply about problems."
  },
  "model": {
    "provider": "openai",
    "name": "gpt-5.2",
    "temperature": 0.7,
    "maxOutputTokens": 2000,
    "reasoning": {
      "enabled": true,
      "effort": "high",
      "summary": "detailed",
      "includeThoughts": true
    }
  },
  "loop": {
    "maxSteps": 5
  },
  "tools": [],
  "runtime": {
    "response": {
      "type": "ui-message-stream"
    }
  }
};

export default agentConfig;
```

## Troubleshooting

### Reasoning not appearing in responses
- Verify your model supports reasoning (check provider documentation)
- Ensure `enabled: true` is set
- Check that your API key has access to reasoning-enabled models

### Performance issues
- Reduce `effort` level
- Lower `budgetTokens` for Anthropic/Google
- Disable `includeThoughts` if not needed

### Anthropic errors
- Always specify `budgetTokens` when `enabled: true`
- Typical range: 1000-8000 tokens depending on task complexity
