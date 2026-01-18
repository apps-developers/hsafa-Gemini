'use client';

import { HsafaChat } from '@/sdk/src/components/HsafaChat';
import agentConfig from './simple-agent';

export default function Home() {
  return (
    <HsafaChat
      agentName="basic-chat"
      agentConfig={JSON.stringify(agentConfig)}
      fullPageChat={true}
      theme="dark"
      title="HSAFA Agent"
      placeholder="Ask me anything..."
      emptyStateMessage="Hi! I'm your AI assistant. How can I help you today?"
    />
  );
}
