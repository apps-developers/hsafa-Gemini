# Headless Hsafa Agent - Build Your Own UI

The Hsafa SDK provides headless hooks that let you build completely custom chat interfaces while leveraging all the powerful agent capabilities.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Hooks](#core-hooks)
  - [useHsafaAgent](#usehsafaagent)
  - [useFileUpload](#usefileupload)
  - [useChatStorage](#usechatstorage)
  - [useMessageEditor](#usemessageeditor)
  - [useAutoScroll](#useautoscroll)
- [Complete Examples](#complete-examples)
- [API Reference](#api-reference)

## Quick Start

Here's the simplest example of using the headless API:

```tsx
import { useHsafaAgent } from '@hsafa/ui-sdk';

function MyCustomChat() {
  const agent = useHsafaAgent({
    agentId: 'my-agent-id',
    baseUrl: 'http://localhost:3000',
  });

  return (
    <div>
      {/* Messages */}
      <div>
        {agent.messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div>
        <input 
          value={agent.input} 
          onChange={(e) => agent.setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              agent.sendMessage();
            }
          }}
          disabled={agent.isLoading}
        />
        <button onClick={() => agent.sendMessage()} disabled={agent.isLoading}>
          {agent.isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

## Core Hooks

### useHsafaAgent

The main hook that provides all agent functionality.

```tsx
import { useHsafaAgent } from '@hsafa/ui-sdk';

const agent = useHsafaAgent({
  agentId: 'my-agent-id',
  baseUrl: 'http://localhost:3000',
  
  // Optional: Add custom tools
  tools: {
    customTool: async (input) => {
      console.log('Custom tool called with:', input);
      return { result: 'Success!' };
    },
  },
  
  // Optional: Add custom UI components
  uiComponents: {
    MyCustomComponent: ({ data }) => <div>{data.message}</div>,
  },

  // Optional: Callbacks
  onFinish: (message) => console.log('Message finished:', message),
  onError: (error) => console.error('Error:', error),
  onMessagesChange: (messages) => console.log('Messages updated:', messages),
  
});

// Access the API
agent.input          // Current input text
agent.setInput()     // Set input text
agent.messages       // All messages
agent.isLoading      // Loading state
agent.status         // 'idle' | 'submitted' | 'streaming'
agent.error          // Error if any
agent.sendMessage()  // Send a message
agent.stop()         // Stop generation
agent.newChat()      // Start new chat
agent.setMessages()  // Load messages (for history)
agent.chatId         // Current chat ID
agent.tools          // All available tools
agent.uiComponents   // All UI components
```

### useFileUpload

Handle file uploads for messages.

```tsx
import { useFileUpload } from '@hsafa/ui-sdk';

function FileUploadExample() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: 'http://localhost:3000' });
  const fileUpload = useFileUpload('http://localhost:3000');

  const handleSend = async () => {
    await agent.sendMessage({
      text: agent.input,
      files: fileUpload.attachments.map(att => ({
        type: 'file',
        url: att.url,
        mediaType: att.mimeType,
        name: att.name,
        size: att.size,
      })),
    });
    fileUpload.clearAttachments();
  };

  return (
    <div>
      {/* File input */}
      <input
        type="file"
        ref={fileUpload.fileInputRef}
        onChange={(e) => fileUpload.handleFileSelection(e.target.files, console.error)}
        multiple
        hidden
      />
      <button onClick={() => fileUpload.fileInputRef.current?.click()}>
        Attach Files
      </button>

      {/* Show attachments */}
      {fileUpload.attachments.map(att => (
        <div key={att.id}>
          {att.name} ({fileUpload.formatBytes(att.size || 0)})
          <button onClick={() => fileUpload.handleRemoveAttachment(att.id)}>×</button>
        </div>
      ))}

      {/* Send */}
      <button onClick={handleSend} disabled={fileUpload.uploading}>
        {fileUpload.uploading ? 'Uploading...' : 'Send'}
      </button>
    </div>
  );
}
```

### useChatStorage

Persist and manage chat history.

```tsx
import { useHsafaAgent, useChatStorage } from '@hsafa/ui-sdk';

function ChatWithHistory() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: 'http://localhost:3000' });
  const storage = useChatStorage({
    agentId: 'my-agent',
    chatId: agent.chatId,
    messages: agent.messages,
    isLoading: agent.isLoading,
    autoSave: true,      // Auto-save messages
    autoRestore: true,   // Auto-restore last chat on mount
  });

  return (
    <div>
      {/* Chat history sidebar */}
      <div>
        <h3>Chat History</h3>
        <button onClick={() => storage.createNewChat(agent.newChat)}>
          New Chat
        </button>
        {storage.chatList.map(chat => (
          <div 
            key={chat.id}
            onClick={() => storage.switchToChat(chat.id, agent.setMessages)}
            style={{ 
              fontWeight: chat.id === agent.chatId ? 'bold' : 'normal' 
            }}
          >
            {chat.title}
            <button onClick={() => storage.deleteChat(chat.id)}>Delete</button>
          </div>
        ))}
      </div>

      {/* Chat interface */}
      <div>
        {agent.messages.map(msg => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
    </div>
  );
}
```

### useMessageEditor

Edit messages and regenerate responses.

```tsx
import { useHsafaAgent, useMessageEditor } from '@hsafa/ui-sdk';

function EditableChat() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: 'http://localhost:3000' });
  const editor = useMessageEditor({
    messages: agent.messages,
    isLoading: agent.isLoading,
    sendMessage: agent.sendMessage,
    setMessages: agent.setMessages,
    baseUrl: 'http://localhost:3000',
  });

  return (
    <div>
      {agent.messages.map(msg => {
        if (msg.role !== 'user') return <div key={msg.id}>{msg.content}</div>;

        return editor.isEditing(msg.id) ? (
          <div key={msg.id}>
            <textarea 
              value={editor.editingText}
              onChange={(e) => editor.setEditingText(e.target.value)}
            />
            <button onClick={() => editor.saveEdit(msg.id)}>Save & Regenerate</button>
            <button onClick={editor.cancelEdit}>Cancel</button>
          </div>
        ) : (
          <div key={msg.id}>
            {msg.content}
            <button onClick={() => editor.startEdit(msg.id, msg.content || '')}>
              Edit
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

### useAutoScroll

Auto-scroll to bottom during streaming.

```tsx
import { useHsafaAgent, useAutoScroll } from '@hsafa/ui-sdk';

function AutoScrollChat() {
  const agent = useHsafaAgent({ agentId: 'my-agent', baseUrl: 'http://localhost:3000' });
  const scrollRef = useAutoScroll<HTMLDivElement>(agent.isLoading);

  return (
    <div ref={scrollRef} style={{ height: '500px', overflow: 'auto' }}>
      {agent.messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

## Complete Examples

### Minimal Chat Interface

```tsx
import { useHsafaAgent } from '@hsafa/ui-sdk';

function MinimalChat() {
  const agent = useHsafaAgent({
    agentId: 'my-agent',
    baseUrl: 'http://localhost:3000',
  });

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>My Custom Chat</h1>
      
      {/* Messages */}
      <div style={{ 
        height: '400px', 
        overflow: 'auto', 
        border: '1px solid #ccc',
        padding: '10px',
        marginBottom: '10px'
      }}>
        {agent.messages.length === 0 ? (
          <p style={{ color: '#888' }}>Start a conversation...</p>
        ) : (
          agent.messages.map(msg => (
            <div 
              key={msg.id}
              style={{
                marginBottom: '10px',
                padding: '10px',
                backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '8px'
              }}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong>
              <div>{msg.content}</div>
            </div>
          ))
        )}
        {agent.isLoading && <div>Agent is typing...</div>}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={agent.input}
          onChange={(e) => agent.setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !agent.isLoading) {
              agent.sendMessage();
            }
          }}
          placeholder="Type a message..."
          style={{ 
            flex: 1, 
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          disabled={agent.isLoading}
        />
        <button
          onClick={() => agent.sendMessage()}
          disabled={agent.isLoading || !agent.input.trim()}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: agent.isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {agent.isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Error display */}
      {agent.error && (
        <div style={{ 
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px'
        }}>
          Error: {agent.error.message}
        </div>
      )}
    </div>
  );
}
```

### Full-Featured Chat with All Hooks

```tsx
import { 
  useHsafaAgent, 
  useFileUpload, 
  useChatStorage, 
  useMessageEditor,
  useAutoScroll 
} from '@hsafa/ui-sdk';

function FullFeaturedChat() {
  const [showHistory, setShowHistory] = useState(false);

  const agent = useHsafaAgent({
    agentId: 'my-agent',
    baseUrl: 'http://localhost:3000',
    tools: {
      // Your custom tools
    },
  });

  const fileUpload = useFileUpload('http://localhost:3000');
  
  const storage = useChatStorage({
    agentId: 'my-agent',
    chatId: agent.chatId,
    messages: agent.messages,
    isLoading: agent.isLoading,
  });

  const editor = useMessageEditor({
    messages: agent.messages,
    isLoading: agent.isLoading,
    sendMessage: agent.sendMessage,
    setMessages: agent.setMessages,
    baseUrl: 'http://localhost:3000',
  });

  const scrollRef = useAutoScroll<HTMLDivElement>(agent.isLoading);

  const handleSend = async () => {
    await agent.sendMessage({
      text: agent.input,
      files: fileUpload.attachments.map(att => ({
        type: 'file',
        url: att.url,
        mediaType: att.mimeType,
        name: att.name,
      })),
    });
    fileUpload.clearAttachments();
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar - Chat History */}
      {showHistory && (
        <div style={{ width: '250px', borderRight: '1px solid #ccc', padding: '10px' }}>
          <h3>Conversations</h3>
          <button onClick={() => {
            storage.createNewChat(agent.newChat);
            setShowHistory(false);
          }}>
            New Chat
          </button>
          <div style={{ marginTop: '10px' }}>
            {storage.chatList.map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  storage.switchToChat(chat.id, agent.setMessages);
                  setShowHistory(false);
                }}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  backgroundColor: chat.id === agent.chatId ? '#e3f2fd' : 'transparent',
                  borderRadius: '4px',
                  marginBottom: '5px'
                }}
              >
                {chat.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ 
          padding: '15px', 
          borderBottom: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2>Chat</h2>
          <div>
            <button onClick={() => setShowHistory(!showHistory)}>
              History
            </button>
            <button onClick={agent.newChat}>New Chat</button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {agent.messages.map(msg => {
            if (msg.role === 'user') {
              return editor.isEditing(msg.id) ? (
                <div key={msg.id} style={{ marginBottom: '15px' }}>
                  <textarea
                    value={editor.editingText}
                    onChange={(e) => editor.setEditingText(e.target.value)}
                    style={{ width: '100%', minHeight: '60px', padding: '8px' }}
                  />
                  <button onClick={() => editor.saveEdit(msg.id)}>
                    Save & Regenerate
                  </button>
                  <button onClick={editor.cancelEdit}>Cancel</button>
                </div>
              ) : (
                <div key={msg.id} style={{ marginBottom: '15px', textAlign: 'right' }}>
                  <div style={{ 
                    display: 'inline-block',
                    padding: '10px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    borderRadius: '8px',
                    maxWidth: '70%'
                  }}>
                    {msg.content}
                  </div>
                  <button 
                    onClick={() => editor.startEdit(msg.id, msg.content || '')}
                    style={{ marginLeft: '5px' }}
                  >
                    Edit
                  </button>
                </div>
              );
            }

            return (
              <div key={msg.id} style={{ marginBottom: '15px' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '10px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  maxWidth: '70%'
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          {agent.isLoading && <div>Agent is typing...</div>}
        </div>

        {/* Input Area */}
        <div style={{ borderTop: '1px solid #ccc', padding: '15px' }}>
          {/* File attachments */}
          {fileUpload.attachments.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              {fileUpload.attachments.map(att => (
                <div key={att.id} style={{ 
                  display: 'inline-block',
                  padding: '5px 10px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '4px',
                  marginRight: '5px'
                }}>
                  {att.name}
                  <button onClick={() => fileUpload.handleRemoveAttachment(att.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="file"
              ref={fileUpload.fileInputRef}
              onChange={(e) => fileUpload.handleFileSelection(e.target.files, console.error)}
              multiple
              hidden
            />
            <button 
              onClick={() => fileUpload.fileInputRef.current?.click()}
              disabled={fileUpload.uploading}
            >
              📎
            </button>
            <input
              type="text"
              value={agent.input}
              onChange={(e) => agent.setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !agent.isLoading) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '10px', fontSize: '14px' }}
              disabled={agent.isLoading}
            />
            {agent.isLoading ? (
              <button onClick={agent.stop}>Stop</button>
            ) : (
              <button onClick={handleSend} disabled={fileUpload.uploading}>
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Custom Tool Example

```tsx
import { useHsafaAgent } from '@hsafa/ui-sdk';

function ChatWithCustomTools() {
  const agent = useHsafaAgent({
    agentId: 'my-agent',
    baseUrl: 'http://localhost:3000',
    tools: {
      // Simple function tool
      getCurrentWeather: async ({ location }) => {
        const response = await fetch(`https://api.weather.com/${location}`);
        const data = await response.json();
        return { temperature: data.temp, conditions: data.conditions };
      },

      // Tool with streaming support
      searchDatabase: {
        tool: async ({ query }) => {
          const results = await searchDB(query);
          return { results };
        },
        executeEachToken: true, // Execute on each token update
      },
    },
  });

  // Rest of your UI...
}
```

## API Reference

See individual hook files for complete TypeScript interfaces:
- `/hooks/useHsafaAgent.ts` - Main agent hook
- `/hooks/useFileUpload.ts` - File upload handling
- `/hooks/useChatStorage.ts` - Chat persistence
- `/hooks/useMessageEditor.ts` - Message editing
- `/hooks/useAutoScroll.ts` - Auto-scroll behavior

## Tips

1. **Always provide a baseUrl**: Either through the hook config or the HsafaProvider
2. **Handle loading states**: Disable inputs when `agent.isLoading` is true
3. **Handle errors**: Display `agent.error` to users
4. **Clear attachments**: Call `fileUpload.clearAttachments()` after sending
5. **Use TypeScript**: All hooks are fully typed for better DX

## Next Steps

- Browse the `/examples` folder for more use cases
