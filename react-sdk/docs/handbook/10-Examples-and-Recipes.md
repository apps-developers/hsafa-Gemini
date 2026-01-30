# 10 — Examples & Recipes

Practical snippets for common tasks using the SDK.

## Minimal chat page

```tsx
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

export default function Page() {
  return (
    <HsafaProvider baseUrl="">
      <HsafaChat agentId="my-agent" theme="dark" />
    </HsafaProvider>
  );
}
```

## Custom tool and UI component

```tsx
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

const tools = {
  add: async ({ a, b }: any) => ({ sum: a + b })
};

function ProductCard({ name, price }: { name: string; price: number }) {
  return <div>{name}: ${price}</div>;
}

export default function Page() {
  return (
    <HsafaProvider baseUrl="">
      <HsafaChat agentId="my-agent" HsafaTools={tools} HsafaUI={{ ProductCard }} />
    </HsafaProvider>
  );
}
```

## Headless custom UI

```tsx
import { useHsafaAgent } from '@hsafa/ui-sdk';

export function MyChat() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '' });

  return (
    <div>
      <div style={{ height: 320, overflow: 'auto' }}>
        {agent.messages.map((m) => (
          <pre key={m.id}>{JSON.stringify(m, null, 2)}</pre>
        ))}
      </div>
      <input
        value={agent.input}
        onChange={(e) => agent.setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && agent.sendMessage()}
      />
      <button disabled={agent.isLoading} onClick={() => agent.sendMessage()}>
        Send
      </button>
      <button onClick={() => agent.stop()}>Stop</button>
    </div>
  );
}
```

## Chat history with `useChatStorage`

```tsx
import { useChatStorage, useHsafaAgent } from '@hsafa/ui-sdk';

export function ChatWithHistory() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '' });
  const storage = useChatStorage({
    agentId: 'my-agent',
    chatId: agent.chatId,
    messages: agent.messages,
    isLoading: agent.isLoading,
  });

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <aside>
        {storage.chatList.map((c) => (
          <div key={c.id}>
            <button onClick={() => storage.switchToChat(c.id, agent.setMessages)}>{c.title}</button>
          </div>
        ))}
      </aside>
      <main style={{ flex: 1 }}>
        {/* ... render your UI, inputs, etc. ... */}
      </main>
    </div>
  );
}
```

## File uploads

```tsx
import { useFileUploadHook } from '@hsafa/ui-sdk';

function Uploader() {
  const { attachments, uploading, fileInputRef, handleFileSelection, handleRemoveAttachment } = useFileUploadHook('');
  return (
    <div>
      <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFileSelection(e.target.files, () => {})} />
      {uploading ? 'Uploading...' : null}
      <ul>
        {attachments.map((a) => (
          <li key={a.id}>
            {a.name} <button onClick={() => handleRemoveAttachment(a.id)}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Server route (Next.js edge)

```ts
// app/api/run/[id]/route.ts
import { NextRequest } from 'next/server';
import { handleRunAgentRequest } from '@/server/src/modules/agents/run-agent-handler';

export const runtime = 'edge';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRunAgentRequest(req as any, { params } as any);
}
```
