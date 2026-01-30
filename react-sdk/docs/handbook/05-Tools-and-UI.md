# 05 — Tools & UI

This section documents built-in tools/UI and how to add your own front-end tools and renderable UI components.

## Built-in tools (frontend)

File: `sdk/src/components/hsafa-chat/utils/builtInTools.ts`

- **`getDomComponents`**
  - Discovers DOM components (optionally including hidden) for web control scenarios.
  - Signature: `{ includeHidden?: boolean, selector?: string }` → DOM metadata
- **`controlCursor`**
  - Guides a visual cursor to move/click/drag on elements for demos or automation.
  - Signature: `{ target: string | { x,y }, action?: 'move'|'click'|'drag', anchor?, durationMs?, dragTo? }`
- **`fillActiveInput`**
  - Fills the currently focused input.
  - Signature: `{ value: string }`
- **`requestInput`**
  - Special tool to request form input from the user inside a message. The form is rendered inline and its submission posts a tool result.

All built-ins are available automatically via `useHsafaAgent`/`HsafaChat` under their tool names.

### Progressive tool execution

If a tool config has `{ executeEachToken: true }`, it will be executed on streaming deltas via `useStreamingToolInput.ts` when the input changes.

```ts
// Example from dynamic page tools
editObject: {
  executeEachToken: true,
  tool: async (input) => { /* ... */ }
}
```

## Built-in UI components

File: `sdk/src/components/hsafa-chat/utils/builtInUI.tsx`

- **`plainText`**: renders markdown text with Mermaid support using `MarkdownRendererWithMermaid`.
- Always available (no need to register in `HsafaUI`).

## Rendering custom UI from agent

Expose UI to the agent by passing `HsafaUI` to `HsafaChat` (or `uiComponents` to `useHsafaAgent`). The agent can then emit a UI tool call to render the component by name.

```tsx
<HsafaChat agentId="my-agent" HsafaUI={{ ProductCard }} />
```

The agent can request a UI component by returning a tool call named `'ui'` or the exact component name. Rendering is deferred and when complete, `addToolResult` is emitted with `{ rendered: true }`.

## Inline forms: `requestInput`

File: `sdk/src/components/hsafa-chat/utils/renderUserForm.ts`

- Renders a form host inside the assistant message for a specific `toolCallId`.
- Persists form state across rerenders (submitted/skipped/values).
- Posts results via `addToolResult({ tool: 'requestInput', toolCallId, output })`.

## Adding your own tools

Pass a map of tools to the chat component or the headless hook.

```tsx
const tools = {
  add: async ({ a, b }: any) => ({ sum: a + b }),
  myTool: { executeEachToken: false, tool: async (input: any) => ({ ok: true }) },
};

<HsafaChat agentId="my-agent" HsafaTools={tools} />
```

Each tool receives `input` from the agent. Return values are serialized and sent back via `addToolResult`.
