# 01 — Quickstart

This quickstart shows how to install the SDK, render the chat UI, and optionally build a custom headless UI.

## Install

```bash
pnpm add @hsafa/ui-sdk
# or
yarn add @hsafa/ui-sdk
# or
npm i @hsafa/ui-sdk
```

Peer deps: React 18+, React DOM 18+.

## Minimal UI setup

Wrap your app with the provider and render `HsafaChat`.

```tsx
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

export default function App() {
  return (
    <HsafaProvider baseUrl={process.env.NEXT_PUBLIC_API_BASE || ''}>
      <HsafaChat agentId="my-agent" theme="dark" />
    </HsafaProvider>
  );
}
```

- `baseUrl` points to your backend. The chat posts to `POST {baseUrl}/api/run/:agentId`.
- File uploads post to `POST {baseUrl}/api/uploads`.

## Customizing the chat

`HsafaChat` supports theming and UI options (see `sdk/src/types/chat.ts`).

```tsx
<HsafaChat
  agentId="my-agent"
  theme="light"
  primaryColor="#3b82f6"
  backgroundColor="#ffffff"
  borderColor="#e5e7eb"
  textColor="#111827"
  accentColor="#F9FAFB"
/>
```

## Adding custom UI components and tools

- UI components: pass via `HsafaUI` prop or via the headless hook (see below). The agent can render them by name via the `ui` tool.

```tsx
function ProductCard({ name, price }: { name: string; price: number }) {
  return <div>{name}: ${price}</div>;
}

<HsafaChat agentId="my-agent" HsafaUI={{ ProductCard }} />
```

- Frontend tools: pass as `HsafaTools` to `HsafaChat`. Each tool is a function or `{ tool, executeEachToken }`.

```tsx
const tools = {
  add: async ({ a, b }: any) => ({ sum: a + b })
};

<HsafaChat agentId="my-agent" HsafaTools={tools} />
```

## Headless: build your own chat UI

Use `useHsafaAgent` for full control over rendering.

```tsx
import { useHsafaAgent } from '@hsafa/ui-sdk';

export function MyChat() {
  const agent = useHsafaAgent({
    agentId: 'my-agent',
    baseUrl: '',
    tools: {
      add: async ({ a, b }) => ({ sum: a + b }),
    },
    uiComponents: {
      ProductCard: ({ name, price }: any) => <div>{name}: ${price}</div>,
    },
  });

  return (
    <div>
      {agent.messages.map((m) => (
        <pre key={m.id}>{JSON.stringify(m, null, 2)}</pre>
      ))}
      <input value={agent.input} onChange={(e) => agent.setInput(e.target.value)} />
      <button onClick={() => agent.sendMessage()}>Send</button>
    </div>
  );
}
```

## Persist chat history

Use `useChatStorage` to manage chat history, switching, and metadata. `HsafaChat` uses the same storage utility under the hood.

```tsx
import { useChatStorage } from '@hsafa/ui-sdk';

function History({ agentId, chatId, messages, setMessages }: any) {
  const storage = useChatStorage({ agentId, chatId, messages, isLoading: false });
  return (
    <div>
      {storage.chatList.map((m) => (
        <button key={m.id} onClick={() => storage.switchToChat(m.id, setMessages)}>
          {m.title}
        </button>
      ))}
    </div>
  );
}
```

## Backend endpoint

Implement `POST /api/run/:agentId` using the Vercel AI SDK v5. Reference: `server/src/modules/agents/run-agent-handler.ts`.

- Input: `{ messages: UIMessage[], ... }` (the SDK automatically adds `chatId` via `createHsafaTransport`).
- Output: NDJSON stream produced via `createUIMessageStreamResponse`.

If you already use the provided server code, the SDK will work out of the box.
