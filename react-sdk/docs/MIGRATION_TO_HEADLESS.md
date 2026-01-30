# Migrating from HsafaChat to Headless Hooks

This guide helps you migrate from using the pre-built `HsafaChat` component to the headless hooks for full UI customization.

## Why Migrate?

**Benefits of Headless Hooks:**
- 🎨 Complete control over UI/UX
- 🔧 Custom styling with your design system
- ⚡ Optimize for your specific use case
- 📦 Use only what you need (smaller bundle)
- 🧩 Integrate seamlessly with existing components

## Before: Using HsafaChat

```tsx
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

function App() {
  return (
    <HsafaProvider baseUrl="http://localhost:3000">
      <HsafaChat 
        agentId="my-agent"
        theme="dark"
        primaryColor="#0ea5e9"
        HsafaTools={{
          customTool: async (input) => {
            return { result: 'Done!' };
          }
        }}
        HsafaUI={{
          CustomCard: ({ data }) => <div>{data.text}</div>
        }}
      />
    </HsafaProvider>
  );
}
```

## After: Using Headless Hooks

```tsx
import { useHsafaAgent, useAutoScroll } from '@hsafa/ui-sdk';

function App() {
  const agent = useHsafaAgent({
    agentId: 'my-agent',
    baseUrl: 'http://localhost:3000',
    
    // Same tools, just passed differently
    tools: {
      customTool: async (input) => {
        return { result: 'Done!' };
      }
    },
    
    // Same UI components
    uiComponents: {
      CustomCard: ({ data }) => <div>{data.text}</div>
    },
  });

  const scrollRef = useAutoScroll<HTMLDivElement>(agent.isLoading);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {agent.messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: '15px' }}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        {agent.isLoading && <div>Loading...</div>}
      </div>

      {/* Input */}
      <div style={{ padding: '20px' }}>
        <input
          value={agent.input}
          onChange={(e) => agent.setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && agent.sendMessage()}
          disabled={agent.isLoading}
        />
        <button onClick={() => agent.sendMessage()} disabled={agent.isLoading}>
          Send
        </button>
      </div>
    </div>
  );
}
```

## Feature-by-Feature Migration

### 1. Basic Chat

**Before:**
```tsx
<HsafaChat agentId="my-agent" />
```

**After:**
```tsx
const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: '...' });
// Then build your UI using agent.messages, agent.input, etc.
```

### 2. File Uploads

**Before:**
Built-in file upload in HsafaChat

**After:**
```tsx
import { useFileUpload } from '@hsafa/ui-sdk';

const fileUpload = useFileUpload('http://localhost:3000');

// In your component:
<input
  type="file"
  ref={fileUpload.fileInputRef}
  onChange={(e) => fileUpload.handleFileSelection(e.target.files, setError)}
/>

// When sending:
agent.sendMessage({
  text: agent.input,
  files: fileUpload.attachments.map(att => ({
    type: 'file',
    url: att.url,
    mediaType: att.mimeType,
  }))
});
```

### 3. Chat History

**Before:**
Built-in history modal in HsafaChat

**After:**
```tsx
import { useChatStorage } from '@hsafa/ui-sdk';

const storage = useChatStorage({
  agentId: 'my-agent',
  chatId: agent.chatId,
  messages: agent.messages,
  isLoading: agent.isLoading,
  autoSave: true,
  autoRestore: true,
});

// Build your own history UI:
<div>
  {storage.chatList.map(chat => (
    <div key={chat.id} onClick={() => storage.switchToChat(chat.id, agent.setMessages)}>
      {chat.title}
    </div>
  ))}
</div>
```

### 4. Message Editing

**Before:**
Built-in edit functionality in HsafaChat

**After:**
```tsx
import { useMessageEditor } from '@hsafa/ui-sdk';

const editor = useMessageEditor({
  messages: agent.messages,
  isLoading: agent.isLoading,
  sendMessage: agent.sendMessage,
  setMessages: agent.setMessages,
});

// In your message rendering:
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
  <div>
    {msg.content}
    <button onClick={() => editor.startEdit(msg.id, msg.content)}>Edit</button>
  </div>
)}
```

### 5. Custom Tools

**Before:**
```tsx
<HsafaChat
  HsafaTools={{
    myTool: async (input) => { /* ... */ }
  }}
/>
```

**After:**
```tsx
const agent = useHsafaAgent({
  tools: {
    myTool: async (input) => { /* ... */ }
  }
});
```

### 6. Custom UI Components

**Before:**
```tsx
<HsafaChat
  HsafaUI={{
    MyComponent: ({ data }) => <div>{data.text}</div>
  }}
/>
```

**After:**
```tsx
const agent = useHsafaAgent({
  uiComponents: {
    MyComponent: ({ data }) => <div>{data.text}</div>
  }
});
```

### 7. Theme/Colors

**Before:**
```tsx
<HsafaChat
  theme="dark"
  primaryColor="#0ea5e9"
  backgroundColor="#0B0B0F"
  textColor="#EDEEF0"
/>
```

**After:**
```tsx
// In headless mode, you control styling directly.
// If you need theme colors, keep them in your app state/theme system and apply them
// when rendering your custom UI.
```

### 8. Callbacks

**Before:**
```tsx
<HsafaChat
  onMessagesChange={(messages) => console.log(messages)}
/>
```

**After:**
```tsx
const agent = useHsafaAgent({
  onMessagesChange: (messages) => console.log(messages),
  onFinish: (message) => console.log('Message done:', message),
  onError: (error) => console.error('Error:', error),
});
```

## Common Patterns

### Pattern 1: Minimal Chat

```tsx
function MinimalChat() {
  const agent = useHsafaAgent({
    agentId: 'my-agent',
    baseUrl: 'http://localhost:3000',
  });

  return (
    <div className="chat-container">
      <div className="messages">
        {agent.messages.map(msg => (
          <div key={msg.id} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          value={agent.input}
          onChange={(e) => agent.setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && agent.sendMessage()}
        />
        <button onClick={() => agent.sendMessage()}>Send</button>
      </div>
    </div>
  );
}
```

### Pattern 2: Full-Featured Chat

```tsx
function FullChat() {
  const agent = useHsafaAgent({ /* config */ });
  const fileUpload = useFileUpload('http://localhost:3000');
  const storage = useChatStorage({ /* config */ });
  const editor = useMessageEditor({ /* config */ });
  const scrollRef = useAutoScroll(agent.isLoading);

  return (
    <div className="chat-layout">
      {/* Sidebar with history */}
      <aside>
        {storage.chatList.map(chat => (
          <ChatItem key={chat.id} {...chat} />
        ))}
      </aside>

      {/* Main chat */}
      <main>
        <div ref={scrollRef} className="messages">
          {agent.messages.map(msg => (
            <Message key={msg.id} {...msg} editor={editor} />
          ))}
        </div>
        <ChatInput 
          agent={agent} 
          fileUpload={fileUpload}
        />
      </main>
    </div>
  );
}
```

## Migration Checklist

- [ ] Identify all HsafaChat props you're using
- [ ] Map each prop to the corresponding hook configuration
- [ ] Replace `<HsafaChat />` with your custom UI
- [ ] Use `useHsafaAgent` for core chat functionality
- [ ] Add `useFileUpload` if you need file attachments
- [ ] Add `useChatStorage` if you need chat history
- [ ] Add `useMessageEditor` if you need message editing
- [ ] Add `useAutoScroll` for auto-scrolling behavior
- [ ] Test all functionality thoroughly
- [ ] Update your styling to match your design system

## Benefits After Migration

1. **Full Control**: Style everything exactly as you want
2. **Better Integration**: Seamlessly match your existing design system
3. **Optimized Bundle**: Only include the hooks you need
4. **Enhanced UX**: Build flows specific to your use case
5. **Easier Testing**: Test UI and logic independently

## Need Help?

- 📚 [Headless Usage Guide](./HEADLESS_USAGE.md)
- 📁 [Example Implementations](../examples/)
- 🐛 [Report Issues](https://github.com/husamabusafa/hsafa/issues)
