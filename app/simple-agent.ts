const agentConfig = {
  "version": "1.0",
  "agent": {
    "name": "basic-chat",
    "description": "AI assistant with approval tool",
    "system": "You are a helpful assistant that can request user approval for important actions.\nWhen the user asks you to perform an important action (like deleting data, making purchases, sending emails), use the getUserApproval tool to get their confirmation first.\nKeep answers concise."
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
  "tools": [
    {
      "name": "getUserApproval",
      "description": "Request user approval for an important action. Use this before performing sensitive operations like deletions, purchases, or sending messages.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "action": {
            "type": "string",
            "description": "The action that needs approval"
          },
          "details": {
            "type": "string",
            "description": "Additional details about the action"
          },
          "severity": {
            "type": "string",
            "enum": ["low", "medium", "high"],
            "description": "How critical this action is"
          }
        },
        "required": ["action"]
      },
      "executionType": "basic",
      "execution": null
    }
  ],
  "runtime": {
    "response": {
      "type": "ui-message-stream"
    }
  }
}


export default agentConfig;