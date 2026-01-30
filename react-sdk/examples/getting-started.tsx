/**
 * Getting Started Example
 * 
 * Simple example showing how to set up an AI agent with basic actions.
 */

import React from 'react';
import { HsafaProvider, HsafaChat, useHsafaAction, useHsafaComponent } from '@hsafa/ui-sdk';

// Simple action providers
function BasicActionProviders() {
  // Register a simple greeting action
  useHsafaAction('getGreeting', async (params) => {
    const { name } = params;
    return {
      message: `Hello ${name}! Welcome to HSAFA AI Agent Studio!`,
      timestamp: new Date().toLocaleTimeString()
    };
  });

  // Register a simple calculation action
  useHsafaAction('calculate', async (params) => {
    const { operation, a, b } = params;
    
    let result;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = b !== 0 ? a / b : 'Cannot divide by zero'; break;
      default: result = 'Unknown operation';
    }
    
    return {
      operation,
      operands: [a, b],
      result
    };
  });

  // Register a simple info card component
  useHsafaComponent('InfoCard', ({ title, content, type = 'info' }) => {
    const colors = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    };
    
    return (
      <div className={`p-4 border rounded-lg ${colors[type as keyof typeof colors]}`}>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p>{content}</p>
      </div>
    );
  });

  return null;
}

export function GettingStartedExample() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
          Getting Started with HSAFA AI Agent SDK
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <HsafaProvider baseUrl="http://localhost:3900">
            <BasicActionProviders />
            
            <HsafaChat
              agentId="demo-agent"
              width={600}
              height={500}
              placeholder="Try asking me to greet you or do some math!"
              welcomeMessage="Hi! I'm your AI assistant. I can greet people and do simple calculations. Try asking me something!"
            />
            
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
              <strong>Try these examples:</strong>
              <ul className="mt-1 space-y-1">
                <li>• "Greet me, my name is John"</li>
                <li>• "Calculate 15 + 25"</li>
                <li>• "What's 100 divided by 4?"</li>
                <li>• "Show me an info card about AI"</li>
              </ul>
            </div>
          </HsafaProvider>
        </div>
      </div>
    </div>
  );
}

export default GettingStartedExample;
