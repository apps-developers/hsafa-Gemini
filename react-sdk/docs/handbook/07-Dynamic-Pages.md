# 07 — Dynamic Pages

Dynamic Pages let the agent construct and manipulate a UI page (grid of objects/components) by calling dedicated tools. This is useful for dashboards, inspectors, and interactive builders.

## Files

- Runtime: `sdk/src/components/dynamic-page/DynamicPage.tsx`
- Operations: `sdk/src/components/dynamic-page/operations.ts`
- Tools factory: `sdk/src/components/dynamic-page/tools.ts`
- Storage: `sdk/src/components/dynamic-page/storage.ts`
- Types: `sdk/src/components/dynamic-page/types.ts`
- Hook: `sdk/src/components/dynamic-page/useDynamicPage.ts`

## Enabling in HsafaChat

1) Declare supported dynamic page types in your app and pass as `dynamicPageTypes` prop (or via `useHsafaAgent`).
2) `HsafaChat` registers types with `HsafaProvider` and creates dynamic page tools using `createDynamicPageTools(getOperations)`.

```tsx
<HsafaChat
  agentId="my-agent"
  dynamicPageTypes={[ /* type configs */ ]}
/>
```

## Tools

From `createDynamicPageTools(getOperations)`:

- `setGrid(input)` / `readGrid()` / `validateGrid()`
- `readAvailableTypes()`
- `setObject(input)` (streaming friendly)
- `editObject(input)` (streaming friendly; merges options for safe defaults)
- `deleteObject(input)`
- `readAllObjects()` / `readObject(input)` / `readAtPointer(input)`
- `renameObject(input)` / `moveObject(input)`
- `readComponentErrors(input)` / `clearComponentErrors()`

All functions call into `DynamicPageOperations` returned by `useDynamicPage().getOperations`.

## Storage helpers

- `saveDynamicPageState(id, state)` / `loadDynamicPageState(id)` / `deleteDynamicPageState(id)` / `dynamicPageExists(id)`

## Recommended usage pattern

- Enable dynamic pages only for specific chats where needed.
- Let the agent progressively build the page while streaming tool inputs.
- Use UI components to visualize objects; integrate with your own component library.
