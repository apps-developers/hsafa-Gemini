#!/bin/bash

# Simple test script for the agent API
# Usage: ./test-agent.sh

AGENT_YAML='version: "1.0"

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
    type: ui-message-stream'

curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d "{
    \"agentYaml\": $(echo "$AGENT_YAML" | jq -Rs .),
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello! Tell me a fun fact about space.\"}]
  }"
