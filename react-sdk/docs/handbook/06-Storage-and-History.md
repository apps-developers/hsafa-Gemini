# 06 — Storage & History

Local persistence is handled via `useChatStorage` and the lower-level `createChatStorage` utility.

## Storage utility

File: `sdk/src/utils/chat-storage.ts`

- Prefix: `hsafaChat_${agentId}`
- Keys:
  - Index: `hsafaChat_${agentId}.chats` — array of `{ id, title, createdAt, updatedAt }`
  - Chat data: `hsafaChat_${agentId}.chat.${chatId}` — `{ id, messages, agentId? }`
  - Current chat id: `hsafaChat_${agentId}.currentChatId`
  - Show chat flag: `hsafaChat_${agentId}.showChat`
- API:
  - `loadChatsIndex()`, `saveChatsIndex(list)`
  - `loadChat(id)`, `saveChat(data)`
  - `upsertChatMeta(meta)`
  - `deleteChatMeta(id)`, `deleteChatData(id)`, `deleteChat(id)`
  - `loadShowChatPreference(default)`, `saveShowChatPreference(value)`
  - `loadCurrentChatId()`, `saveCurrentChatId(id)`, `removeCurrentChatId()`

## Hook: useChatStorage

File: `sdk/src/hooks/useChatStorage.ts`

Input:
```ts
useChatStorage({ agentId, chatId, messages, isLoading?, autoSave = true, autoRestore = true })
```

Output (selected):
- `chatList: ChatMetadata[]`
- `currentChatMeta: ChatMetadata | null`
- `refreshChatList()`
- `loadChat(chatId)`
- `saveCurrentChat()`
- `deleteChat(chatId)`
- `switchToChat(chatId, setMessages)` — loads and applies stored messages
- `createNewChat(onNewChat)` — not a saver; executes `onNewChat()` which should set a new `chatId`
- `searchChats(query)`
- `storage` — underlying `createChatStorage(agentId)` instance

### Auto-save behavior

- On first user message, inserts a chat meta with a title derived from the first user text part.
- On subsequent message updates (and when `!isLoading`), saves chat data and updates `updatedAt`.
- After a streaming session finishes, saves one more time to ensure the final assistant message is captured.

### Using with `HsafaChat` or headless

- `HsafaChat` uses the same storage semantics, saving UI preferences (`.showChat`) as well.
- In headless UIs, couple `useChatStorage` with `useHsafaAgent` by wiring `chatId`, `messages`, and `setMessages`.

### Example: chat switching

```tsx
const storage = useChatStorage({ agentId, chatId, messages, isLoading });

function openChat(id: string) {
  storage.switchToChat(id, agent.setMessages);
}
```
