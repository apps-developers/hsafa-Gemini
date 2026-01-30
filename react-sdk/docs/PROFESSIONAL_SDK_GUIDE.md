# HSAFA UI SDK — Professional Guide

This guide is an **authoritative, implementation-aligned** documentation for `@hsafa/ui-sdk` as it exists in this repository.

It is written for:
- Teams embedding **Hsafa Chat** into existing products
- Teams building a **fully custom UI** around the agent runtime
- Teams implementing **tool-driven interfaces** (dashboards, builders, maps)

## Scope and sources

- **Package**: `@hsafa/ui-sdk` (see `sdk/package.json`)
- **Public entry point**: `sdk/src/index.ts`
- **Type signature reference**: `sdk/dist/index.d.ts` (the built build output)
- **Real integration examples**: `use-cases/rafed-hack` and `use-cases/ksu-agent`

> Important: some legacy or experimental docs in `sdk/docs/` and `sdk/docs/api/` may reference APIs not present in the current source. This guide always prefers the current source/export surface.

---

# 1) Mental model

## 1.1 Two integration modes

- **UI mode (drop-in chat)**
  - Use `HsafaProvider` + `HsafaChat`
  - You get chat UI, streaming, file upload, history UI, message editing, tool rendering

- **Headless mode (custom UI)**
  - Use `useHsafaAgent` (+ optionally `useChatStorage`, `useMessageEditor`, `useFileUpload`, `useAutoScroll`)
  - You build the UI yourself (layout, styling, message rendering)

Both modes support:
- **Server-side tools** (tools executed on your server)
- **Client-side tools** (tools executed in the browser)
- **Tool-driven UI rendering** (`HsafaUI` / `uiComponents`)

## 1.2 Data flow overview

1. **User types** a prompt (optionally attaches files).
2. Client sends `POST {baseUrl}/api/run/:agentId` using the Vercel AI SDK v5 transport.
3. Server streams NDJSON events.
4. Client renders:
   - assistant text (Markdown)
   - reasoning (optional)
   - tool calls and tool results
   - custom UI for selected tools (via `HsafaUI`)
5. If the assistant requests a **client tool**:
   - the SDK executes it in the browser and sends `addToolResult(...)` back into the chat stream.

---

# 2) Installation & setup

## 2.1 Install

```bash
pnpm add @hsafa/ui-sdk
# or npm i @hsafa/ui-sdk
```

Peer dependencies:
- `react >= 18`
- `react-dom >= 18`
- `@tabler/icons-react` (some UI pieces rely on icons)

## 2.2 Styles

The package exports CSS:
- `@hsafa/ui-sdk/index.css`

If your host app does not already include the SDK styles, import them once near your app root:

```ts
import '@hsafa/ui-sdk/index.css';
```

> Some components also bring their own styles from dependencies (e.g. `@ant-design/x-markdown` theme CSS) internally.

---

# 3) Quickstart (pre-built chat UI)

## 3.1 Minimal setup

```tsx
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

export default function App() {
  return (
    <HsafaProvider baseUrl="http://localhost:3900">
      <HsafaChat agentId="YOUR_AGENT_ID" />
    </HsafaProvider>
  );
}
```

## 3.2 `baseUrl` rules

- `baseUrl` can be:
  - `""` (same origin)
  - `"https://your-server.example"`
- `HsafaChat` and `useHsafaAgent` accept a `baseUrl` prop/config.
  - If omitted, they fall back to the provider’s `baseUrl`.

---

# 4) Provider: `HsafaProvider` and `useHsafa`

Source: `sdk/src/providers/HsafaProvider.tsx`

## 4.1 Responsibilities

- Stores SDK defaults: `baseUrl`, `dir`, `theme`
- Tracks cross-chat state:
  - `isAnyStreaming` (useful for global UI effects)
  - `isAnyChatOpen` (useful for layout adjustments)
- Exposes `currentChatId` (set by `HsafaChat` / `useHsafaAgent`)

## 4.2 Practical pattern: layout that reacts to chat open/streaming

The SDK ships `ContentContainer` which reads provider state and:
- animates a border during streaming
- applies margin when chat is open (so your app content is not covered)

Source: `sdk/src/components/ContentContainer.tsx`

Common usage (as seen in `use-cases/rafed-hack`):

```tsx
<HsafaProvider baseUrl={AGENT_BASE_URL}>
  <ContentContainer>
    <YourAppRoutes />
  </ContentContainer>

  <HsafaChat agentId={AGENT_ID} alwaysOpen />
</HsafaProvider>
```

---

# 5) `HsafaChat` (UI component)

Source: `sdk/src/components/HsafaChat.tsx`

## 5.1 What `HsafaChat` provides

- Streaming chat UI (based on `useHsafaAgent`)
- Attachments (via `useFileUpload`)
- Chat history (via `useChatStorage`)
- Message editing (internally + `useMessageEditor`)
- Tool visualization + custom tool UIs (`HsafaUI`)
- RTL + Arabic labels
- Optional full-page mode (`fullPageChat`)

## 5.2 Key props (most used in real apps)

From `sdk/src/types/chat.ts`:
- `agentId: string` (**required**)
- `baseUrl?: string` (optional override)
- `HsafaTools?: Record<string, HsafaTool>` (client-side tools)
- `HsafaUI?: Record<string, React.ComponentType<any>>` (tool rendering)
- `onMessagesChange?: (messages, chatId?) => void`
- `onFinish?: (payload) => void`
- `templateParams?: Record<string, unknown>`
- UI configuration:
  - `theme`, `dir`, `lang/language`
  - colors: `primaryColor`, `backgroundColor`, ...
  - `title`, `placeholder`, `emptyStateMessage`
  - `presetPrompts`
  - `fullPageChat`

## 5.3 Example: Arabic RTL “full page” chat (from `use-cases/ksu-agent`)

- Uses `dir="rtl"` + `language="ar"`
- Uses `fullPageChat`
- Provides `presetPrompts` in Arabic
- Provides `HsafaUI` to render specialized tool results

---

# 6) Headless mode: `useHsafaAgent`

Source: `sdk/src/hooks/useHsafaAgent.ts`

## 6.1 When to use headless

Choose headless mode when you need:
- full control over layout and component library
- custom message presentation (timeline, cards, split panes)
- deep integration with app state / routing

## 6.2 What it returns

`useHsafaAgent(config)` returns an API with:
- **state**: `messages`, `input`, `status`, `isLoading`, `error`, `chatId`
- **actions**: `setInput`, `sendMessage`, `stop`, `newChat`, `setMessages`, `setChatId`
- **tool/UI wiring**: `tools`, `uiComponents`, `onUISuccess`, `onUIError`, `cleanupForms`

## 6.3 The transport: `/api/run/:agentId` and `templateParams`

The SDK uses `DefaultChatTransport` (from the `ai` package).

`createHsafaTransport(baseUrl, agentId, chatId, templateParams)`:
- posts to `${baseUrl}/api/run/${agentId}`
- merges `{ ...templateParams, ...body, chatId }` into the request

Practical uses for `templateParams`:
- pass tenant context
- pass feature flags
- pass a document id or workspace id

---

# 7) Tools: client-side tool execution

## 7.1 Tool types

`HsafaTool` (from `sdk/src/types/chat.ts`):
- `async (input) => output`
- or `{ tool: async (input) => output, executeEachToken?: boolean }`

## 7.2 `executeEachToken` (streaming-safe tools)

If `executeEachToken: true`, the tool may run multiple times as the model streams partial tool inputs.

This is used to power:
- progressive UI feedback (“building component…”, “tool input streaming…”) as seen in the dashboard builder
- streaming-friendly “patch/merge” tools

**Use-case example** (dashboard builder):
- `create_component` uses `executeEachToken: true`
- intermediate calls update `componentsUnderLoading` to show placeholders while the model is still deciding

## 7.3 Designing tools (recommended)

- Make tools **idempotent** or **merge-based** when streaming.
- Validate input strictly and return structured errors.
- Return **human-readable** `message` + structured `data`.
- Keep side-effects explicit (avoid hidden mutations).

---

# 8) Tool UIs: rendering tool calls with `HsafaUI`

## 8.1 How it works

- The assistant emits tool parts such as `tool-<name>` or `tool-call`.
- `AssistantMassage` checks `HsafaUI[toolName]`.
- If present, it renders your UI component.

Source: `sdk/src/components/hsafa-chat/AssistantMassage.tsx`

## 8.2 Props your tool UI receives

Your component receives (at minimum):
- `toolName: string`
- `toolCallId: string`
- `input: any`
- `output: any`
- `status?: string` (`input-streaming`, `input-available`, `output-available`, ...)
- `addToolResult?: (payload) => void`

## 8.3 Error handling and reporting

Tool UIs render inside `UIErrorBoundary`:
- errors are caught and shown to the user
- `onUIError(toolCallId, toolName, error)` is invoked
- on successful mount, `onUISuccess(toolCallId, toolName)` is invoked

This is important if you want to:
- notify the agent that the UI rendered (continuation)
- notify the agent that the UI failed (fallback to text)

---

# 9) Attachments: `useFileUpload` and `/api/uploads`

## 9.1 Endpoint

The SDK expects:
- `POST {baseUrl}/api/uploads` returning JSON `{ id, name, url, mimeType, size }`

## 9.2 File size

The SDK enforces a max file size (25MB) in the client.

---

# 10) Persistence: `useChatStorage`

Source: `sdk/src/hooks/useChatStorage.ts` + `sdk/src/utils/chat-storage.ts`

- Persists chat index + chat messages in `localStorage`
- Namespaced by `agentId` using keys with prefix `hsafaChat_${agentId}`

This is how `HsafaChat` provides chat history without server-side storage.

---

# 11) Editing: `useMessageEditor`

Source: `sdk/src/hooks/useMessageEditor.ts`

Implements:
- editing a prior user message
- truncating subsequent messages
- resending the edited message to regenerate assistant responses

Important constraints:
- editing is blocked while `isLoading`
- attachment upload during edit requires `baseUrl` (provider or explicit)

---

# 12) Markdown rendering: `XMarkdownRenderer`

Source: `sdk/src/components/XMarkdownRenderer.tsx`

- Uses `@ant-design/x-markdown`
- Supports streaming animations
- RTL fixes are applied so Arabic works well

Practical usage:
- You can use it inside custom message UIs, not only inside the built-in chat.

---

# 13) Web-controller tools (built-in)

Exported from `sdk/src/components/web-controler/*` and included as built-in tools:
- `getDomComponents`
- `controlCursor`
- `fillActiveInput`
- `requestInput` (special: renders an inline form)

These enable “agent controls the UI” demos and automation-like flows.

---

# 14) Patterns from `use-cases/` (real-world techniques)

This section summarizes *how you used the SDK* and what to copy.

## 14.1 Pattern: split-screen builder + always-open chat

Used in `rafed-hack` pages:
- left/main pane renders your artifact (presentation, infographic, map, dashboard)
- the chat is always open and acts as the control plane

Benefits:
- user sees changes immediately
- tool calls become an “execution log”

## 14.2 Pattern: custom `HsafaUI` for “tool call cards”

You create a mapping like:
- `set_presentation_slides` → shows a status card
- `imageGenerator` → shows a loading card until `imageUrl` appears
- `set_map_config` / `update_map_config` / `read_map_config` → shows map config state

Benefits:
- tool calls feel like product UI, not debug logs
- streaming tool status is translated into user-friendly states

## 14.3 Pattern: robust input parsing

In tools (`deckglMapTools.ts`, dashboard tools), you apply:
- `safeParseJSON` to accept either JSON string or object
- `asRecord`/guards to avoid runtime crashes

This is essential because LLM tool inputs are often:
- strings
- partially streamed
- missing optional fields

## 14.4 Pattern: tool validation + warnings

In `deckglMapTools.ts` you:
- validate layer queries (optional `validate` flag)
- produce warnings for unsupported style fields

This is a professional technique:
- it helps the model self-correct
- it helps the user trust results

## 14.5 Pattern: streaming-friendly UX (`executeEachToken`)

In `DashboardBuilderTools.tsx`:
- `create_component.executeEachToken = true`
- intermediate `toolCallNumber` updates `componentsUnderLoading`

This produces “AI is building…” UI without waiting for the final tool output.

---

# 15) Troubleshooting

## 15.1 Chat does not stream

- Confirm your server endpoint is `POST /api/run/:agentId` and streams NDJSON.
- Confirm CORS if `baseUrl` is cross-origin.

## 15.2 Uploads fail

- Confirm endpoint `POST /api/uploads` exists.
- Confirm returned JSON includes `url`.

## 15.3 My `HsafaUI` component never renders

- Ensure your tool name matches exactly (snake_case vs camelCase matters).
- Check `AssistantMassage.tsx` tool-name normalization rules.

## 15.4 “Dynamic Pages” docs mismatch

Some docs reference a dynamic-page subsystem that is not present in the current `sdk/src`. Treat those docs as historical or planned work.

---

# 16) Recommended doc map

- Start here:
  - `sdk/docs/handbook/01-Quickstart.md`
  - `sdk/docs/handbook/02-Architecture.md`
- For headless:
  - `sdk/docs/HEADLESS_QUICK_REFERENCE.md`
  - `sdk/docs/HEADLESS_USAGE.md`
- For custom tool UIs:
  - `sdk/docs/CUSTOM_UI_EXAMPLES.md`
- For Markdown:
  - `sdk/docs/XMARKDOWN_USAGE.md`

---

# 17) Appendix: current public API surface

Always verify the current exported surface here:
- `sdk/src/index.ts`
- `sdk/dist/index.d.ts`

This avoids drift between code and generated docs.
