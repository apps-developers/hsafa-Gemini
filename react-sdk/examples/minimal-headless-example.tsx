/**
 * Minimal Headless Chat Example
 * 
 * This is the simplest possible implementation of a custom chat UI
 * using the useHsafaAgent hook.
 */

import React from 'react';
import { useHsafaAgent } from '@hsafa/ui-sdk';

export function MinimalHeadlessChat() {
  const agent = useHsafaAgent({
    agentId: 'my-agent',
    baseUrl: 'http://localhost:3000',
  });

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '50px auto', 
      fontFamily: 'Arial, sans-serif' 
    }}>
      <h1>Minimal Chat Example</h1>

      {/* Messages Display */}
      <div style={{ 
        height: '400px', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        padding: '15px', 
        overflow: 'auto',
        marginBottom: '15px',
        backgroundColor: '#f9f9f9'
      }}>
        {agent.messages.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>
            No messages yet. Start chatting!
          </p>
        ) : (
          agent.messages.map(msg => (
            <div 
              key={msg.id}
              style={{
                marginBottom: '12px',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: msg.role === 'user' ? '#007bff' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#000',
                border: msg.role === 'assistant' ? '1px solid #ddd' : 'none',
                maxWidth: '80%',
                marginLeft: msg.role === 'user' ? 'auto' : '0',
                marginRight: msg.role === 'user' ? '0' : 'auto',
              }}
            >
              <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong>
              <div style={{ marginTop: '5px' }}>{msg.content}</div>
            </div>
          ))
        )}
        
        {agent.isLoading && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Agent is typing...
          </div>
        )}
      </div>

      {/* Input Area */}
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
          placeholder="Type your message..."
          disabled={agent.isLoading}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            outline: 'none',
          }}
        />
        
        <button
          onClick={() => agent.sendMessage()}
          disabled={agent.isLoading || !agent.input.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            backgroundColor: agent.isLoading || !agent.input.trim() ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: agent.isLoading || !agent.input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {agent.isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Error Display */}
      {agent.error && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          Error: {agent.error.message}
        </div>
      )}

      {/* New Chat Button */}
      <button
        onClick={agent.newChat}
        style={{
          marginTop: '15px',
          padding: '8px 16px',
          fontSize: '13px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Start New Chat
      </button>
    </div>
  );
}

export default MinimalHeadlessChat;
