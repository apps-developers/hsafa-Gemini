# HSAFA UI SDK — Advanced Guide

Modern React SDK for integrating AI agents built with HSAFA AI Agent Studio into any web app. This guide covers architecture, setup, customization, streaming, UI component injection, theming, RTL, persistence, and best practices.

Recommended reading order:
- `sdk/docs/PROFESSIONAL_SDK_GUIDE.md` (authoritative, implementation-aligned)
- `sdk/docs/handbook/` (deep dives)
- `sdk/docs/api/` (generated; may drift if not regenerated)

- **Package**: `@hsafa/ui-sdk`
- **Entry point**: `sdk/src/index.ts`
- **Core building blocks**: `HsafaProvider`, `HsafaChat`, `useHsafaAgent`
- **Generated API reference**: `sdk/docs/api/` (TypeDoc)
- **Handbook (recommended)**: `sdk/docs/handbook/`

---

## 1) Install

```bash
pnpm add @hsafa/ui-sdk
# or
npm i @hsafa/ui-sdk
```

Peer dependencies:
- react >= 18
- react-dom >= 18
- @tabler/icons-react (icons used by some components)

---

## 2) Quick start

Wrap your app with `HsafaProvider` and render `HsafaChat` anywhere. The `baseUrl` should point to your server that exposes the agent API endpoints.

```tsx
import React from 'react';
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

export default function App() {
  return (
    <HsafaProvider baseUrl={process.env.NEXT_PUBLIC_API_BASE || ''}>
      <main style={{ height: '100vh' }}>
        <HsafaChat agentId="my-agent-id" theme="dark" />
      </main>
    </HsafaProvider>
  );
}
```

What this does under the hood:
- Streams NDJSON from `POST {baseUrl}/api/run/:agentId` with `Accept: application/x-ndjson`.
- Uploads files to `POST {baseUrl}/api/uploads` and attaches them to prompts.
- Persists chat history and UI state in `localStorage` by `agentId`.

---

## 3) Architecture overview

- **Provider**: `HsafaProvider` stores SDK config and global UI preferences; tracks per-chat streaming/open state.
- **Chat UI**: `HsafaChat` handles input, history, streaming, and rendering of tool-driven UI (`HsafaUI`) and inline forms.
- **Streaming**: Vercel AI SDK v5 `useChat()` is used under the hood (or via the headless `useHsafaAgent()`).
- **Tools & UI**: Provide tools via `HsafaTools` (or `tools` in headless) and UI components via `HsafaUI` (or `uiComponents` in headless).

Server contract (by default used by `HsafaChat`):
- POST `{baseUrl}/api/run/:agentId` — streaming NDJSON
- POST `{baseUrl}/api/uploads` — file uploads

---

## 4) Provider API

`HsafaProvider` (see `sdk/src/providers/HsafaProvider.tsx`):
- Props:
  - `baseUrl?: string` — base URL for API calls (e.g. `""` for same-origin or `"https://api.example.com"`).
  - `dir?: 'ltr' | 'rtl'`, `theme?: 'dark' | 'light'`
- Context (`useHsafa()`):
  - `baseUrl?: string`
  - Per-chat state: `setStreamingState(chatId, isStreaming)`, `setChatOpenState(chatId, isOpen)`, `currentChatId`, `setCurrentChatId`

Example using `useHsafa()` directly:
```tsx
import { useHsafa } from '@hsafa/ui-sdk';

function Debug() {
  const { baseUrl } = useHsafa();
  // inspect config if needed
  return null;
}
```

---

## 5) Chat component (`HsafaChat`)

Source: `sdk/src/components/HsafaChat.tsx`

Minimal usage:
```tsx
<HsafaChat agentId="my-agent" />
```

Important props (selected):
- `agentId: string` — required
- `theme?: 'light' | 'dark'` — default `dark`
- `language?: 'en' | 'ar'` — defaults by `dir` if not provided
- `dir?: 'ltr' | 'rtl'` — controls layout RTL/LTR
- **Base colors** (override theme defaults): `primaryColor`, `backgroundColor`, `borderColor`, `textColor`, `accentColor`
- **Status colors** (new in v0.6.2): `errorColor`, `errorColorLight`, `errorColorDark`, `successColor`, `successColorLight`, `warningColor`, `warningColorLight`, `infoColor`, `infoColorLight`, `dangerColor`, `dangerColorLight`, `dangerColorDark`
- **CSS customization** (new in v0.6.2): `customStyles` - Inject custom CSS with access to CSS variables. See [CSS Guide](./HSAFA_CHAT_CSS_GUIDE.md)
- Layout: `width` (default 420), `height` (default `100vh`), `floatingButtonPosition`, `alwaysOpen`, `defaultOpen`, `expandable`, `maximized`
- Borders/animation: `enableBorderAnimation`, `enableContentPadding`, `enableContentBorder`, `borderRadius`
- UX copy: `placeholder`, `title`
- Advanced UI: `defaultReasoningOpen`, `hideReasoningContent`
- Styling hooks: `className`, `chatContainerClassName`
- Children: content beside the fixed chat panel (panel opens over the right/left edge)

Behavior highlights:
- Persists chat sessions under `localStorage` prefix `hsafaChat_${agentId}`.
- Supports file/image attachments with size checks and server upload.
- Streams partial updates; auto-scrolls intelligently; preserves scroll when toggling reasoning.
- Renders assistant "items" including markdown, mermaid diagrams, and custom UI components.

---

## 6) Providing tools (agent -> UI)

Expose frontend-executed tools to the agent by passing them as `HsafaTools` (or `tools` in headless). Tools can be standard functions or streaming-friendly objects with `executeEachToken` (executed progressively during streaming).

```tsx
const tools = {
  add: async ({ a, b }: any) => ({ sum: a + b }),
  editObject: { executeEachToken: true, tool: async (input: any) => {/* ... */} }
};

<HsafaChat agentId="my-agent" HsafaTools={tools} />
```

Execution behavior (parameter stabilization, debouncing, final guarantees) is handled internally by the SDK.

---

## 7) Providing UI components (agent-rendered)

Expose renderable components to the agent via `HsafaUI` (or `uiComponents` in headless). The agent can render them by name using the UI tool.

```tsx
function ProductCard({ name, price }: { name: string; price: number }) {
  return <div>{name}: ${price}</div>;
}

<HsafaChat agentId="my-agent" HsafaUI={{ ProductCard }} />
```

If an agent returns an unregistered component name, `HsafaChat` will render a helpful placeholder with the props payload so you can register it.

Relevant renderer: `sdk/src/components/hsafa-chat/AssistantMassage.tsx`.

---

## 8) What does the assistant response look like?

`HsafaChat` expects a streaming sequence from the server that ultimately yields a `response` with `items`:
- Strings are rendered as Markdown (`MarkdownRendererWithMermaid`).
- Objects with `type: 'ui'` render components provided via `HsafaUI`/`uiComponents`.
- Tool calls/results and reasoning are also visualized.

Example of a single final item payload (simplified):
```json
{
  "type": "ui",
  "component": "ProductCard",
  "props": { "name": "Laptop", "price": 1299 }
}
```

---

## 9) Theming & styling

Theme presets (`light`/`dark`) with overridable colors. See `sdk/src/utils/chat-theme.ts`.

**📚 For advanced CSS customization, see [CSS Customization Guide](./HSAFA_CHAT_CSS_GUIDE.md)**

### Base Colors
- `primaryColor`, `backgroundColor`, `borderColor`, `textColor`, `accentColor`
- Derived: `mutedTextColor`, `inputBackground`, `cardBackground`, `hoverBackground`

### Status Colors (v0.6.2+)
All status colors are now fully customizable:
- **Error states**: `errorColor`, `errorColorLight`, `errorColorDark` — used for error banners, validation messages
- **Success states**: `successColor`, `successColorLight` — used for completed tool calls, success notifications
- **Warning states**: `warningColor`, `warningColorLight` — used for warnings and input-streaming tool states
- **Info states**: `infoColor`, `infoColorLight` — used for informational messages and running tool states
- **Danger states**: `dangerColor`, `dangerColorLight`, `dangerColorDark` — used for delete actions, stop buttons

Example with custom colors:
```tsx
<HsafaChat
  agentId="my-agent"
  theme="light"
  // Base colors
  primaryColor="#3b82f6"
  backgroundColor="#ffffff"
  borderColor="#e5e7eb"
  textColor="#111827"
  accentColor="#F9FAFB"
  // Status colors (optional)
  errorColor="#ef4444"
  errorColorLight="#fef2f2"
  successColor="#10b981"
  warningColor="#eab308"
  infoColor="#3b82f6"
  dangerColor="#dc2626"
/>
```

### CSS Customization (v0.6.2+)

For complete control over component styling, use `customStyles` to inject custom CSS with access to theme-aware CSS variables:

```tsx
<HsafaChat
  agentId="my-agent"
  customStyles={`
    /* Change input background */
    [data-hsafa-chat] textarea {
      background: var(--hsafa-input-bg) !important;
      border-radius: 12px !important;
    }
    
    /* Custom message bubbles */
    [data-hsafa-chat] div[style*="margin-bottom"] > div {
      border-radius: 16px !important;
    }
    
    /* Theme-specific styles */
    [data-hsafa-theme="dark"] {
      --hsafa-input-bg: #1a1b1f;
    }
  `}
/>
```

See the complete [CSS Customization Guide](./HSAFA_CHAT_CSS_GUIDE.md) for:
- All available CSS variables
- Component selectors reference
- Theme-aware styling patterns
- Common customization examples

Markdown with Mermaid is supported via `MarkdownRenderer` / `MarkdownRendererWithMermaid` and `MermaidDiagram`.

---

## 10) RTL and copy overrides

- You can pass `dir` to `HsafaChat` (or set globally via `HsafaProvider`).
- Override UI copy via props (e.g., `placeholder`, `title`) or render custom components above the input.

---

## 11) Persistence & storage

`HsafaChat` uses `useChatStorage(agentId)` to persist:
- Chats index and message history under `localStorage` key prefix `hsafaChat_${agentId}`.
- Current chat ID and chat visibility (`.currentChatId`, `.showChat`).

Key API (see `sdk/src/hooks/useChatStorage.ts`):
- `createNewChat(firstMessage?)` — returns new chat id
- `persistChatData(messages)` — saves messages + updates meta
- `loadChatsIndex()`, `loadChat(id)`, `deleteChat(id, cb)`

---

## 12) Attachments & uploads

`HsafaChat` integrates `useFileUpload(baseUrl)` which:
- Validates size (default 25MB) and uploads to `{baseUrl}/api/uploads`.
- Adds uploaded assets to the user message content as `image` or `file` parts.

Server is expected to return:
```json
{ "id": "file-id", "name": "foo.png", "url": "https://...", "mimeType": "image/png", "size": 12345 }
```

---

## 13) Streaming contract (server)

The server should stream NDJSON lines with event `type` keys consumed by Vercel AI SDK v5 `useChat()` (converted via `toUIMessageStream`). Common events include:
- `first-agent-start|partial|end`
- `main-agent-start|skipped|reasoning-start|reasoning-delta|reasoning-end`
- `main-agent-tool-call-start|tool-call|tool-result|tool-error`
- `main-agent-response-partial` (with `value.items`)
- `text-delta|text-end`
- `final` (with `value.items`)
- `error`

You can adopt any LLM/tooling backend as long as you conform to the above event stream and endpoints. See also the handbook: `sdk/docs/handbook/04-Streaming-and-Transport.md` and `08-Server-Integration.md`.

---

## 14) Full example

See ready-to-run examples in `sdk/examples/`:
- `getting-started.tsx`
- `ecommerce-agent.tsx`
- `nested-chat-example.tsx`

A minimal page with custom UI and tools:
```tsx
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

const tools = {
  add: async ({ a, b }: any) => ({ sum: a + b })
};

const UI = {
  ProductCard: (p: any) => <div>{p.name}: ${p.price}</div>
};

export default function Page() {
  return (
    <HsafaProvider baseUrl="">
      <HsafaChat agentId="my-agent" theme="dark" HsafaTools={tools} HsafaUI={UI} />
    </HsafaProvider>
  );
}
```

---

## 15) Troubleshooting

- Ensure your server responds to `POST /api/run/:agentId` with `Content-Type: application/x-ndjson` and streams events, not a single JSON.
- If attachments fail, verify `POST /api/uploads` exists and returns the required JSON fields.
- Unregistered UI component? Check the `component` name in items and make sure it exists in `HsafaUI` (or `uiComponents` for headless usage).

---

## 16) API reference

The full API is generated from TypeScript types. Start here:
- `sdk/docs/api/README.md`
- `sdk/docs/api/functions/HsafaChat.md`
- `sdk/docs/api/functions/HsafaProvider.md`
- `sdk/docs/api/functions/useHsafa.md`
 

---

## 17) License & links

- License: MIT
- Repo: https://github.com/husamabusafa/hsafa/tree/main/sdk
- Issues: https://github.com/husamabusafa/hsafa/issues
