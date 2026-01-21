import { DefaultChatTransport } from "ai";

export function createHsafaTransport(
  baseUrl: string,
  agentName: string,
  agentConfig: string,
  chatId: string,
  templateParams?: Record<string, unknown>
) {
  return new DefaultChatTransport({
    api: `${baseUrl}/api/agent`,
    body: {
      agentConfig: JSON.parse(agentConfig),
      chatId,
      ...templateParams,
    },
  });
}


