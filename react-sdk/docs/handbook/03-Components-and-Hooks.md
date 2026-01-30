# 03 — Components & Hooks

This is a practical catalogue of public components, hooks, and types, with examples and source references.

## Components

- **`HsafaChat`** (`sdk/src/components/HsafaChat.tsx`)
  - Full-featured chat UI built on Vercel AI SDK v5.
  - Props (selected — see `sdk/src/types/chat.ts` for all):
    - `agentId: string` (required)
    - `theme?: 'dark' | 'light'`
    - Colors: `primaryColor`, `primaryColorDark`, `primaryColorLight`, `backgroundColor`, `borderColor`, `textColor`, `accentColor`
    - Layout: `width`, `height`, `defaultOpen`, `floatingButtonPosition`
    - Behavior/UI: `componentAboveInput`, `editProcessContent`
    - Extensions: `HsafaTools?: Record<string, HsafaTool>`, `HsafaUI?: Record<string, React.ComponentType<any>>`
  - Example:
    ```tsx
    <HsafaChat
      agentId="my-agent"
      theme="dark"
      HsafaTools={{ add: async ({ a, b }) => ({ sum: a + b }) }}
      HsafaUI={{ ProductCard: (p: any) => <div>{p.name}</div> }}
    />
    ```

- **`ContentContainer`** (`sdk/src/components/ContentContainer.tsx`)
  - Generic content wrapper used across docs/examples.

- **`FloatingChatButton`** (`sdk/src/components/FloatingChatButton.tsx`)
  - Floating FAB to reopen a minimized chat.

## Provider

- **`HsafaProvider`** (`sdk/src/providers/HsafaProvider.tsx`)
  - Props: `baseUrl?: string`, `dir?: 'ltr' | 'rtl'`, `theme?: 'dark' | 'light'`.
  - Context via `useHsafa()`:
    - Streaming/open state per chat: `setStreamingState(chatId, isStreaming)`, `setChatOpenState(chatId, isOpen)`.
    - `currentChatId`.
  - Extensions are passed directly to `HsafaChat` (`HsafaTools`, `HsafaUI`) or to `useHsafaAgent` (`tools`, `uiComponents`).

## Hooks

- **`useHsafaAgent(config)`** (`sdk/src/hooks/useHsafaAgent.ts`)
  - Headless agent hook used by `HsafaChat`.
  - Input (selected): `{ agentId, baseUrl?, tools: HsafaTools?, uiComponents: HsafaUI?, onFinish?, onError?, initialMessages?, onMessagesChange? }`
  - Output (selected):
    - State: `input`, `messages`, `isLoading`, `status`, `error`
    - Actions: `setInput`, `sendMessage({ text?, files? })`, `stop()`, `newChat()`, `setMessages(messages)`
    - Advanced: `chatApi`, `chatId`, `setChatId(id)`, `tools`, `uiComponents`
    - Inline forms/UI: `formHostRef`, `formStateRef`, `cleanupForms()`, `onUISuccess()`, `onUIError()`
  - Example:
    ```tsx
    const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '' });
    agent.setInput('Hello');
    await agent.sendMessage();
    ```

- **`useChatStorage(config)`** (`sdk/src/hooks/useChatStorage.ts`)
  - Input: `{ agentId, chatId, messages, isLoading?, autoSave?, autoRestore? }`
  - Output: `{ chatList, currentChatMeta, refreshChatList, loadChat, saveCurrentChat, deleteChat, switchToChat, createNewChat, searchChats, storage }`
  - `storage` is the raw util from `sdk/src/utils/chat-storage.ts` with keys prefixed by `hsafaChat_${agentId}`.

- **`useFileUploadHook(baseUrl?)`** (`sdk/src/hooks/useFileUploadHook.ts`)
  - Output: `{ attachments, uploading, fileInputRef, formatBytes, handleRemoveAttachment, handleFileSelection, buildUserContent, clearAttachments, setAttachments }`
  - Posts to `{baseUrl}/api/uploads`.

- **`useMessageEditor(config)`** (`sdk/src/hooks/useMessageEditor.ts`)
  - Utilities for message editing+regeneration from a point in history.
  - Output: `{ editingMessageId, editingText, setEditingText, editAttachments, setEditAttachments, editUploading, startEdit, cancelEdit, saveEdit, isEditing, addEditAttachments, removeEditAttachment }`

- **`useAutoScroll<T>()`** (`sdk/src/hooks/useAutoScroll.ts`)
  - Auto-scroll container to bottom while streaming.

## Types

- From `sdk/src/types/chat.ts` (selected):
  - `Attachment`, `UserContentPart`, `AssistantContentPart`, `ChatMessage`
  - `HsafaTool`
  - `HsafaChatProps`, `EditProcessContent`

Refer to `sdk/src/index.ts` for the full export surface.
