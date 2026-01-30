/**
 * Custom Tools & UI Components Example
 * 
 * This example shows how to:
 * 1. Add custom tools that the agent can use
 * 2. Add custom UI components to render tool results
 * 3. Handle tool execution and UI rendering
 */

import React from 'react';
import { useHsafaAgent } from '@hsafa/ui-sdk';

// Custom UI Component for displaying weather
function WeatherCard({ data }: { data: any }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#e3f2fd',
      borderRadius: '12px',
      border: '2px solid #2196f3',
      margin: '10px 0'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
        🌤️ Weather in {data.location}
      </h3>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
        {data.temperature}°C
      </div>
      <div style={{ marginTop: '8px', color: '#555' }}>
        {data.conditions}
      </div>
    </div>
  );
}

// Custom UI Component for displaying product info
function ProductCard({ data }: { data: any }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '2px solid #4caf50',
      margin: '10px 0'
    }}>
      <div style={{ display: 'flex', gap: '15px' }}>
        <img 
          src={data.image} 
          alt={data.name}
          style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
        />
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0' }}>{data.name}</h3>
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
            {data.description}
          </p>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
            ${data.price}
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#999' }}>
            Stock: {data.stock} units
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomToolsExample() {
  const agent = useHsafaAgent({
    agentId: 'custom-tools-demo',
    baseUrl: 'http://localhost:3000',

    // Define custom tools
    tools: {
      // Simple async tool
      getWeather: async ({ location }: { location: string }) => {
        console.log('Fetching weather for:', location);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          location,
          temperature: Math.floor(Math.random() * 30 + 10),
          conditions: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)]
        };
      },

      // Tool that returns product information
      searchProducts: async ({ query }: { query: string }) => {
        console.log('Searching products:', query);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
          results: [
            {
              id: '1',
              name: 'Wireless Headphones',
              description: 'Premium noise-cancelling headphones',
              price: 199.99,
              stock: 50,
              image: 'https://via.placeholder.com/100'
            },
            {
              id: '2',
              name: 'Smart Watch',
              description: 'Fitness tracker with heart rate monitor',
              price: 299.99,
              stock: 30,
              image: 'https://via.placeholder.com/100'
            }
          ]
        };
      },

      // Tool with streaming execution (executes on each token)
      calculateSum: {
        tool: async ({ numbers }: { numbers: number[] }) => {
          console.log('Calculating sum of:', numbers);
          const sum = numbers.reduce((a, b) => a + b, 0);
          return { sum, count: numbers.length };
        },
        executeEachToken: true // Execute immediately as tokens stream in
      },
    },

    // Define custom UI components for rendering
    uiComponents: {
      WeatherCard,
      ProductCard,
      
      // Inline component example
      SummaryCard: ({ data }) => (
        <div style={{
          padding: '15px',
          backgroundColor: '#fff3e0',
          borderRadius: '8px',
          border: '1px solid #ff9800',
          margin: '10px 0'
        }}>
          <strong>📊 Summary:</strong>
          <div style={{ marginTop: '8px' }}>{data.text}</div>
        </div>
      ),
    },

    // Callbacks
    onFinish: (message) => {
      console.log('✅ Message completed:', message);
    },

    onError: (error) => {
      console.error('❌ Error occurred:', error);
    },

    // Theme colors
    colors: {
      primaryColor: '#2196f3',
      backgroundColor: '#ffffff',
      textColor: '#212121',
      borderColor: '#e0e0e0',
    },
  });

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '50px auto', 
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>
      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h1 style={{ margin: '0 0 10px 0' }}>Custom Tools Demo</h1>
        <p style={{ margin: 0, color: '#666' }}>
          This agent has access to custom tools: weather, product search, and calculations.
        </p>
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>Try asking:</strong>
          <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
            <li>"What's the weather in New York?"</li>
            <li>"Search for wireless headphones"</li>
            <li>"Calculate the sum of 10, 20, and 30"</li>
          </ul>
        </div>
      </div>

      {/* Messages */}
      <div style={{ 
        minHeight: '400px',
        maxHeight: '500px',
        border: '1px solid #e0e0e0', 
        borderRadius: '12px',
        padding: '20px', 
        overflow: 'auto',
        marginBottom: '20px',
        backgroundColor: '#fafafa'
      }}>
        {agent.messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#999', 
            marginTop: '100px',
            fontSize: '16px'
          }}>
            💬 Start a conversation with the agent
          </div>
        ) : (
          agent.messages.map(msg => (
            <div 
              key={msg.id}
              style={{
                marginBottom: '16px',
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? '#2196f3' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#212121',
                border: msg.role === 'assistant' ? '1px solid #e0e0e0' : 'none',
                boxShadow: msg.role === 'assistant' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  opacity: 0.7, 
                  marginBottom: '4px',
                  fontWeight: '600'
                }}>
                  {msg.role === 'user' ? 'You' : '🤖 Agent'}
                </div>
                <div style={{ lineHeight: '1.5' }}>{msg.content}</div>
              </div>
            </div>
          ))
        )}
        
        {agent.isLoading && (
          <div style={{ 
            padding: '12px',
            color: '#666',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div className="loading-dots">●●●</div>
            Agent is processing...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ 
        display: 'flex', 
        gap: '12px',
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '12px'
      }}>
        <input
          type="text"
          value={agent.input}
          onChange={(e) => agent.setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !agent.isLoading && agent.input.trim()) {
              agent.sendMessage();
            }
          }}
          placeholder="Ask about weather, search products, or calculate..."
          disabled={agent.isLoading}
          style={{
            flex: 1,
            padding: '14px',
            fontSize: '15px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            outline: 'none',
            backgroundColor: agent.isLoading ? '#f5f5f5' : '#fff'
          }}
        />
        
        {agent.isLoading ? (
          <button
            onClick={agent.stop}
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '600',
              backgroundColor: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => agent.sendMessage()}
            disabled={!agent.input.trim()}
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '600',
              backgroundColor: agent.input.trim() ? '#2196f3' : '#e0e0e0',
              color: agent.input.trim() ? '#fff' : '#999',
              border: 'none',
              borderRadius: '8px',
              cursor: agent.input.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
          >
            Send
          </button>
        )}
      </div>

      {/* Error Display */}
      {agent.error && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '8px',
          fontSize: '14px',
          border: '1px solid #ef5350'
        }}>
          <strong>⚠️ Error:</strong> {agent.error.message}
        </div>
      )}

      {/* Controls */}
      <div style={{ 
        marginTop: '15px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={agent.newChat}
          disabled={agent.isLoading}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: agent.isLoading ? 'not-allowed' : 'pointer',
            color: '#666'
          }}
        >
          🔄 New Chat
        </button>
      </div>

      {/* Debug Info */}
      <details style={{ marginTop: '30px', fontSize: '13px', color: '#666' }}>
        <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
          Debug Info
        </summary>
        <pre style={{ 
          marginTop: '10px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '6px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            chatId: agent.chatId,
            messageCount: agent.messages.length,
            isLoading: agent.isLoading,
            status: agent.status,
            availableTools: Object.keys(agent.tools),
            availableUIComponents: Object.keys(agent.uiComponents),
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default CustomToolsExample;
