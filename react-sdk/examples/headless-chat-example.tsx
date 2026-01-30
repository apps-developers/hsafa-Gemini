/**
 * Example: Building a Custom Chat UI with Headless Hooks
 * 
 * This example demonstrates how to build a completely custom chat interface
 * using the headless hooks provided by the Hsafa SDK.
 */

import React, { useState } from 'react';
import { 
  useHsafaAgent, 
  useFileUpload, 
  useChatStorage,
  useMessageEditor,
  useAutoScroll
} from '@hsafa/ui-sdk';

export function HeadlessChatExample() {
  const [showSidebar, setShowSidebar] = useState(false);

  // 1. Initialize the agent
  const agent = useHsafaAgent({
    agentId: 'customer-support',
    baseUrl: 'http://localhost:3000',
    
    // Add custom tools
    tools: {
      checkOrderStatus: async ({ orderId }) => {
        // Your custom logic here
        return { status: 'shipped', tracking: '123456' };
      },
    },

    // Add custom UI components
    uiComponents: {
      OrderStatusCard: ({ data }) => (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #0ea5e9'
        }}>
          <h4>Order Status</h4>
          <p>Status: {data.status}</p>
          <p>Tracking: {data.tracking}</p>
        </div>
      ),
    },

    // Callbacks
    onFinish: (message) => {
      console.log('Message completed:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      alert(`Error: ${error.message}`);
    },

    // Theme colors
    colors: {
      primaryColor: '#0ea5e9',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  });

  // 2. File upload handling
  const fileUpload = useFileUpload('http://localhost:3000');

  // 3. Chat storage (history)
  const storage = useChatStorage({
    agentId: 'customer-support',
    chatId: agent.chatId,
    messages: agent.messages,
    isLoading: agent.isLoading,
    autoSave: true,
    autoRestore: true,
  });

  // 4. Message editing
  const editor = useMessageEditor({
    messages: agent.messages,
    isLoading: agent.isLoading,
    sendMessage: agent.sendMessage,
    setMessages: agent.setMessages,
    baseUrl: 'http://localhost:3000',
  });

  // 5. Auto-scroll
  const scrollRef = useAutoScroll<HTMLDivElement>(agent.isLoading);

  // Send message handler
  const handleSendMessage = async () => {
    try {
      await agent.sendMessage({
        text: agent.input,
        files: fileUpload.attachments.map(att => ({
          type: 'file' as const,
          url: att.url,
          mediaType: att.mimeType || 'application/octet-stream',
          name: att.name,
          size: att.size,
        })),
      });
      fileUpload.clearAttachments();
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>
      {/* Sidebar - Chat History */}
      {showSidebar && (
        <aside style={{ 
          width: '280px', 
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              Conversations
            </h2>
          </div>

          <div style={{ padding: '10px' }}>
            <button
              onClick={() => {
                storage.createNewChat(agent.newChat);
                setShowSidebar(false);
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              + New Chat
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
            {storage.chatList.map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  storage.switchToChat(chat.id, agent.setMessages);
                  setShowSidebar(false);
                }}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  backgroundColor: chat.id === agent.chatId ? '#e0f2fe' : 'transparent',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  transition: 'background-color 0.2s',
                  border: chat.id === agent.chatId ? '1px solid #0ea5e9' : '1px solid transparent'
                }}
              >
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: '#0f172a',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {chat.title}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ 
          padding: '20px', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white'
        }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Customer Support Chat
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showSidebar ? 'Hide' : 'Show'} History
            </button>
            <button
              onClick={agent.newChat}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              New Chat
            </button>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '20px',
            backgroundColor: '#f8fafc'
          }}
        >
          {agent.messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: '#64748b'
            }}>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>
                Welcome to Support Chat
              </h3>
              <p style={{ fontSize: '14px' }}>
                How can we help you today?
              </p>
            </div>
          ) : (
            agent.messages.map(msg => {
              if (msg.role === 'user') {
                // User message with edit capability
                return editor.isEditing(msg.id) ? (
                  <div key={msg.id} style={{ marginBottom: '20px', textAlign: 'right' }}>
                    <div style={{ 
                      display: 'inline-block',
                      maxWidth: '70%',
                      textAlign: 'left'
                    }}>
                      <textarea
                        value={editor.editingText}
                        onChange={(e) => editor.setEditingText(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '12px',
                          fontSize: '14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => editor.saveEdit(msg.id)}
                          disabled={editor.editingText.trim() === ''}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Save & Regenerate
                        </button>
                        <button
                          onClick={editor.cancelEdit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} style={{ marginBottom: '20px', textAlign: 'right' }}>
                    <div style={{ 
                      display: 'inline-block',
                      maxWidth: '70%'
                    }}>
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#0ea5e9',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        wordWrap: 'break-word'
                      }}>
                        {msg.content}
                      </div>
                      <button
                        onClick={() => editor.startEdit(msg.id, msg.content || '')}
                        style={{
                          marginTop: '4px',
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                );
              }

              // Assistant message
              return (
                <div key={msg.id} style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'inline-block',
                    maxWidth: '70%',
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    wordWrap: 'break-word'
                  }}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          
          {agent.isLoading && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'inline-block',
                padding: '12px 16px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#64748b'
              }}>
                <span className="typing-indicator">Agent is typing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ 
          borderTop: '1px solid #e2e8f0', 
          padding: '20px',
          backgroundColor: 'white'
        }}>
          {/* File attachments preview */}
          {fileUpload.attachments.length > 0 && (
            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {fileUpload.attachments.map(att => (
                <div key={att.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  <span>📎 {att.name}</span>
                  <span style={{ color: '#64748b' }}>
                    ({fileUpload.formatBytes(att.size || 0)})
                  </span>
                  <button
                    onClick={() => fileUpload.handleRemoveAttachment(att.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0 4px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error display */}
          {agent.error && (
            <div style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              Error: {agent.error.message}
            </div>
          )}

          {/* Input controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <input
              type="file"
              ref={fileUpload.fileInputRef}
              onChange={(e) => fileUpload.handleFileSelection(e.target.files, console.error)}
              multiple
              hidden
            />
            <button
              onClick={() => fileUpload.fileInputRef.current?.click()}
              disabled={fileUpload.uploading || agent.isLoading}
              style={{
                padding: '10px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: fileUpload.uploading ? 'not-allowed' : 'pointer',
                fontSize: '18px'
              }}
              title="Attach files"
            >
              📎
            </button>

            <textarea
              value={agent.input}
              onChange={(e) => agent.setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !agent.isLoading) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              disabled={agent.isLoading}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                resize: 'none',
                minHeight: '48px',
                maxHeight: '120px',
                fontFamily: 'inherit'
              }}
              rows={1}
            />

            {agent.isLoading ? (
              <button
                onClick={agent.stop}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={(!agent.input.trim() && fileUpload.attachments.length === 0) || fileUpload.uploading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!agent.input.trim() && fileUpload.attachments.length === 0) || fileUpload.uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: (!agent.input.trim() && fileUpload.attachments.length === 0) || fileUpload.uploading ? 0.5 : 1
                }}
              >
                {fileUpload.uploading ? 'Uploading...' : 'Send'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default HeadlessChatExample;
