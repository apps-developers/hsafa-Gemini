import React from 'react';
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

/**
 * Example demonstrating nested HsafaChat components.
 * 
 * Scenario:
 * - Outer HsafaChat wraps the entire website/app (for general questions)
 * - Inner HsafaChat wraps a specific component (for component-specific help)
 * 
 * Result:
 * - Only the innermost (most specific) chat panel will be displayed
 * - The outer chat panel is automatically hidden when inner chat exists
 */

function App() {
  return (
    <HsafaProvider baseUrl="http://localhost:8000" apiKey="your-api-key">
      {/* Outer HsafaChat - wraps the whole website */}
      <HsafaChat
        agentId="general-agent"
        title="General Help"
        placeholder="Ask about anything..."
      >
        <div style={{ padding: '40px' }}>
          <h1>My Website</h1>
          <p>This is the main content of your website.</p>
          
          {/* Some component that needs specific help */}
          <SpecificComponent />
        </div>
      </HsafaChat>
    </HsafaProvider>
  );
}

function SpecificComponent() {
  return (
    <div style={{ 
      border: '2px solid #333', 
      padding: '20px', 
      marginTop: '20px',
      borderRadius: '8px'
    }}>
      {/* Inner HsafaChat - wraps only this specific component */}
      <HsafaChat
        agentId="product-agent"
        title="Product Help"
        placeholder="Ask about this product..."
      >
        <div>
          <h2>Product Details</h2>
          <p>This is a specific product component with its own chat assistant.</p>
          <p><strong>Only this chat panel will be shown, not the outer one!</strong></p>
        </div>
      </HsafaChat>
    </div>
  );
}

export default App;
