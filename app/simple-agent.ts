const agentConfig = {
  "version": "1.0",
  "agent": {
    "name": "basic-chat",
    "description": "Basic chat agent without tools.",
    "system": "You are a helpful assistant.\nKeep answers concise."
  },
  "model": {
    "provider": "openai",
    "name": "gpt-4o-mini",
    "temperature": 0.7,
    "maxOutputTokens": 800
  },
  "loop": {
    "maxSteps": 5
  },
  "runtime": {
    "response": {
      "type": "ui-message-stream"
    }
  }
}


export default agentConfig;