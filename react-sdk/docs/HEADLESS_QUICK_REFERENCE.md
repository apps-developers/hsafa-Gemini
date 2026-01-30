# Headless Hooks - Quick Reference

A quick reference guide for all headless hooks in the Hsafa SDK.

## Installation

```bash
npm install @hsafa/ui-sdk
```

## Import

```tsx
import {
  useHsafaAgent,
  useChatStorage,
  useMessageEditor,
  useFileUpload,
  useAutoScroll,
} from '@hsafa/ui-sdk';
```

---

## useHsafaAgent

**Purpose:** Main hook for agent chat functionality

### Configuration

```tsx
const agent = useHsafaAgent({
  // Required
  agentId: string,
  
  // Optional
  baseUrl?: string,
  tools?: Record<string, Function | { tool: Function, executeEachToken?: boolean }>,
  uiComponents?: Record<string, React.ComponentType>,
  onFinish?: (message: any) => void,
  onError?: (error: Error) => void,
  onMessagesChange?: (messages: any[]) => void,
  initialMessages?: any[],
});
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `input` | `string` | Current input text |
| `setInput(value)` | `(value: string) => void` | Set input text |
| `messages` | `any[]` | All chat messages |
| `isLoading` | `boolean` | Whether agent is processing |
| `status` | `'idle' \| 'submitted' \| 'streaming'` | Current status |
| `error` | `Error \| undefined` | Any error that occurred |
| `sendMessage(options?)` | `(options?: { text?: string; files?: any[] }) => Promise<void>` | Send a message |
| `stop()` | `() => void` | Stop generation |
| `newChat()` | `() => void` | Start new chat |
| `setMessages(msgs)` | `(messages: any[]) => void` | Set messages directly |
| `chatApi` | `object` | Direct access to AI SDK chat API |
| `chatId` | `string` | Current chat ID |
| `tools` | `object` | All available tools |
| `uiComponents` | `object` | All UI components |
| `formHostRef` | `React.MutableRefObject` | Form host elements ref |
| `formStateRef` | `React.MutableRefObject` | Form state ref |
| `cleanupForms()` | `() => void` | Cleanup all forms |
| `onUISuccess(id, name)` | `(toolCallId: string, toolName: string) => void` | UI success callback |
| `onUIError(id, name, err)` | `(toolCallId: string, toolName: string, error: Error) => void` | UI error callback |

### Example

```tsx
const agent = useHsafaAgent({
  agentId: 'my-agent',
  baseUrl: 'http://localhost:3000',
});

<input value={agent.input} onChange={(e) => agent.setInput(e.target.value)} />
<button onClick={() => agent.sendMessage()}>Send</button>
```

---

## useChatStorage

**Purpose:** Persist and manage chat history

### Configuration

```tsx
const storage = useChatStorage({
  // Required
  agentId: string,
  chatId: string,
  messages: any[],
  
  // Optional
  isLoading?: boolean,
  autoSave?: boolean,     // default: true
  autoRestore?: boolean,  // default: true
});
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `chatList` | `ChatMetadata[]` | All saved chats |
| `currentChatMeta` | `ChatMetadata \| null` | Current chat metadata |
| `refreshChatList()` | `() => void` | Refresh chat list |
| `loadChat(chatId)` | `(chatId: string) => SavedChat \| null` | Load specific chat |
| `saveCurrentChat()` | `() => void` | Save current chat manually |
| `deleteChat(chatId)` | `(chatId: string) => void` | Delete a chat |
| `switchToChat(chatId, setMessages)` | `(chatId: string, setMessages: Function) => void` | Switch to chat |
| `createNewChat(onNewChat)` | `(onNewChat: Function) => void` | Create new chat |
| `searchChats(query)` | `(query: string) => ChatMetadata[]` | Search chats |
| `storage` | `object` | Underlying storage utility |

### Types

```tsx
interface ChatMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface SavedChat {
  id: string;
  messages: any[];
  agentId: string;
}
```

### Example

```tsx
const storage = useChatStorage({
  agentId: 'my-agent',
  chatId: agent.chatId,
  messages: agent.messages,
  isLoading: agent.isLoading,
});

<button onClick={() => storage.createNewChat(agent.newChat)}>New Chat</button>
{storage.chatList.map(chat => (
  <div onClick={() => storage.switchToChat(chat.id, agent.setMessages)}>
    {chat.title}
  </div>
))}
```

---

## useMessageEditor

**Purpose:** Edit messages and regenerate responses

### Configuration

```tsx
const editor = useMessageEditor({
  // Required
  messages: any[],
  isLoading: boolean,
  sendMessage: (options: { text: string; files?: any[] }) => Promise<void>,
  setMessages: (messages: any[]) => void,
  
  // Optional
  baseUrl?: string,
});
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `editingMessageId` | `string \| null` | ID of message being edited |
| `editingText` | `string` | Current edit text |
| `setEditingText(text)` | `(text: string) => void` | Set edit text |
| `editAttachments` | `any[]` | Attachments for edited message |
| `setEditAttachments(atts)` | `(attachments: any[]) => void` | Set edit attachments |
| `editUploading` | `boolean` | Whether uploading files |
| `startEdit(id, text, atts?)` | `(messageId: string, text: string, attachments?: any[]) => void` | Start editing |
| `cancelEdit()` | `() => void` | Cancel editing |
| `saveEdit(id)` | `(messageId: string) => Promise<void>` | Save and regenerate |
| `isEditing(id)` | `(messageId: string) => boolean` | Check if editing |
| `addEditAttachments(files)` | `(files: FileList) => Promise<void>` | Add attachments |
| `removeEditAttachment(id)` | `(id: string) => void` | Remove attachment |

### Example

```tsx
const editor = useMessageEditor({
  messages: agent.messages,
  isLoading: agent.isLoading,
  sendMessage: agent.sendMessage,
  setMessages: agent.setMessages,
});

{editor.isEditing(msg.id) ? (
  <div>
    <textarea 
      value={editor.editingText}
      onChange={(e) => editor.setEditingText(e.target.value)}
    />
    <button onClick={() => editor.saveEdit(msg.id)}>Save</button>
    <button onClick={editor.cancelEdit}>Cancel</button>
  </div>
) : (
  <button onClick={() => editor.startEdit(msg.id, msg.content)}>Edit</button>
)}
```

---

## useFileUpload

**Purpose:** Handle file attachments

### Configuration

```tsx
const fileUpload = useFileUpload(baseUrl: string);
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `attachments` | `Attachment[]` | Current attachments |
| `uploading` | `boolean` | Whether uploading |
| `fileInputRef` | `React.RefObject<HTMLInputElement>` | File input ref |
| `formatBytes(bytes)` | `(bytes: number) => string` | Format file size |
| `handleRemoveAttachment(id)` | `(id: string) => void` | Remove attachment |
| `handleFileSelection(files, setError)` | `(files: FileList \| null, setError: Function) => Promise<void>` | Handle file selection |
| `clearAttachments()` | `() => void` | Clear all attachments |
| `MAX_UPLOAD_SIZE` | `number` | Max upload size (25MB) |

### Types

```tsx
interface Attachment {
  id: string;
  name?: string;
  url: string;
  mimeType?: string;
  size?: number;
}
```

### Example

```tsx
const fileUpload = useFileUpload('http://localhost:3000');

<input
  type="file"
  ref={fileUpload.fileInputRef}
  onChange={(e) => fileUpload.handleFileSelection(e.target.files, setError)}
  multiple
/>

<button onClick={() => fileUpload.fileInputRef.current?.click()}>
  Attach Files
</button>

{fileUpload.attachments.map(att => (
  <div key={att.id}>
    {att.name} ({fileUpload.formatBytes(att.size || 0)})
    <button onClick={() => fileUpload.handleRemoveAttachment(att.id)}>×</button>
  </div>
))}
```

---

## useAutoScroll

**Purpose:** Auto-scroll to bottom during streaming

### Configuration

```tsx
const scrollRef = useAutoScroll<HTMLDivElement>(shouldScroll: boolean);
```

### API

Returns a ref to attach to your scrollable container.

### Example

```tsx
const scrollRef = useAutoScroll<HTMLDivElement>(agent.isLoading);

<div ref={scrollRef} style={{ overflow: 'auto', height: '400px' }}>
  {agent.messages.map(msg => (
    <div key={msg.id}>{msg.content}</div>
  ))}
</div>
```

---

## Common Patterns

### Basic Chat

```tsx
function BasicChat() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '...' });
  
  return (
    <div>
      <div>
        {agent.messages.map(msg => <div key={msg.id}>{msg.content}</div>)}
      </div>
      <input value={agent.input} onChange={(e) => agent.setInput(e.target.value)} />
      <button onClick={() => agent.sendMessage()}>Send</button>
    </div>
  );
}
```

### With File Upload

```tsx
function ChatWithFiles() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '...' });
  const fileUpload = useFileUpload('http://localhost:3000');
  
  const handleSend = () => {
    agent.sendMessage({
      text: agent.input,
      files: fileUpload.attachments.map(att => ({
        type: 'file',
        url: att.url,
        mediaType: att.mimeType,
      }))
    });
    fileUpload.clearAttachments();
  };
  
  return (
    <div>
      <input type="file" ref={fileUpload.fileInputRef} onChange={/*...*/} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### With Chat History

```tsx
function ChatWithHistory() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '...' });
  const storage = useChatStorage({
    agentId: 'my-agent',
    chatId: agent.chatId,
    messages: agent.messages,
    isLoading: agent.isLoading,
  });
  
  return (
    <div>
      <aside>
        {storage.chatList.map(chat => (
          <div onClick={() => storage.switchToChat(chat.id, agent.setMessages)}>
            {chat.title}
          </div>
        ))}
      </aside>
      <main>
        {/* Chat UI */}
      </main>
    </div>
  );
}
```

### Full Featured

```tsx
function FullChat() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '...' });
  const fileUpload = useFileUpload('http://localhost:3000');
  const storage = useChatStorage({ /*...*/ });
  const editor = useMessageEditor({ /*...*/ });
  const scrollRef = useAutoScroll(agent.isLoading);
  
  // Build your complete UI with all features
}
```

---

## Tips

1. **Always provide baseUrl** - Either via hook config or HsafaProvider
2. **Handle loading states** - Disable inputs when `agent.isLoading` is true
3. **Clear attachments after send** - Call `fileUpload.clearAttachments()`
4. **Use TypeScript** - All hooks are fully typed
5. **Check examples** - See `/examples` folder for complete implementations

## Links

- [Full Headless Guide](./HEADLESS_USAGE.md)
- [Migration Guide](./MIGRATION_TO_HEADLESS.md)
- [Examples](../examples/)
