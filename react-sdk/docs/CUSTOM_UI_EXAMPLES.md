# Custom UI Customization Examples

This document provides examples for the customization features added to the `HsafaChat` component.

## Table of Contents

1. [Custom Tool UI with HsafaUI](#1-custom-tool-ui-with-hsafaui)
2. [Component Above Chat Input](#2-component-above-chat-input)

---

## 1. Custom Tool UI with HsafaUI

Create custom UIs for specific tool calls using the `HsafaUI` prop. Your components will receive all tool data including `addToolResult` callback to send results back to the agent.

### Usage Example

```tsx
import { HsafaChat, CustomToolUIRenderProps } from '@hsafa/ui-sdk';

// Custom UI component for a tool
function ChoiceToolUI({ toolName, toolCallId, input, output, status, addToolResult, ...restInputProps }: CustomToolUIRenderProps & any) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  
  const handleChoice = (choice: string) => {
    setSelectedChoice(choice);
    
    // Send the result back to the agent
    addToolResult({
      tool: toolName,
      toolCallId: toolCallId,
      output: {
        choice: choice,
        timestamp: Date.now()
      }
    });
  };
  
  return (
    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>Make a choice:</h3>
      <p>{input?.question || 'Please select an option'}</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button 
          onClick={() => handleChoice('yes')}
          disabled={selectedChoice !== null}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedChoice === 'yes' ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedChoice ? 'default' : 'pointer'
          }}
        >
          Yes
        </button>
        <button 
          onClick={() => handleChoice('no')}
          disabled={selectedChoice !== null}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedChoice === 'no' ? '#10b981' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedChoice ? 'default' : 'pointer'
          }}
        >
          No
        </button>
      </div>
      {selectedChoice && (
        <p style={{ marginTop: '8px', color: '#10b981' }}>
          ✓ Choice sent: {selectedChoice}
        </p>
      )}
    </div>
  );
}

// Use in HsafaChat with HsafaUI prop
function App() {
  return (
    <HsafaChat
      agentId="my-agent"
      HsafaUI={{
        'getUserChoice': ChoiceToolUI,
        'confirmAction': ChoiceToolUI,
      }}
    />
  );
}
```

### Props Available

Your HsafaUI components receive **both** the standard tool data **and** all input parameters:

- `toolName: string` - Name of the tool being called
- `toolCallId: string` - Unique ID for this tool call instance
- `input: any` - Input parameters object
- `output: any` - Output from the tool (if available)
- `status?: string` - Current status of the tool call
- `addToolResult: (result: any) => void` - Function to send result back to the agent
- `...restInputProps` - All input parameters are also spread as individual props

### Key Points

- Use the **HsafaUI** prop (same as for regular UI components)
- Components automatically receive **enhanced props** including `addToolResult`
- The custom UI has **full control** over when to send results
- You can create interactive UIs that wait for user input
- Multiple buttons/actions can send different results
- Access tool data via structured props OR spread input props

---

## 2. Component Above Chat Input

Add a persistent component above the chat input (e.g., quick actions, status bar, suggestions).

### Usage Example

```tsx
import { HsafaChat } from '@hsafa/ui-sdk';

function QuickActions() {
  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action);
    // You can trigger actions here
  };
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      <p style={{ 
        fontSize: '12px', 
        color: '#6B7280', 
        marginBottom: '8px',
        fontWeight: 500
      }}>
        Quick Actions:
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleQuickAction('summarize')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📝 Summarize
        </button>
        <button
          onClick={() => handleQuickAction('analyze')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📊 Analyze
        </button>
        <button
          onClick={() => handleQuickAction('translate')}
          style={{
            padding: '6px 12px',
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🌐 Translate
        </button>
      </div>
    </div>
  );
}

// Example 2: Smart Suggestions
function SmartSuggestions() {
  const suggestions = [
    "What can you help me with?",
    "Show me recent updates",
    "Generate a report"
  ];
  
  return (
    <div style={{
      padding: '8px',
      backgroundColor: '#EEF2FF',
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      <p style={{ fontSize: '11px', color: '#6366F1', marginBottom: '6px' }}>
        💡 Try asking:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {suggestions.map((suggestion, i) => (
          <div
            key={i}
            style={{
              padding: '6px 10px',
              backgroundColor: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              border: '1px solid #C7D2FE'
            }}
          >
            {suggestion}
          </div>
        ))}
      </div>
    </div>
  );
}

// Use in HsafaChat
function App() {
  return (
    <HsafaChat
      agentId="my-agent"
      componentAboveInput={QuickActions}
      // Or use SmartSuggestions
      // componentAboveInput={SmartSuggestions}
    />
  );
}
```

### Key Points

- Component is rendered **above** the chat input
- Always visible (sticky with the input area)
- Perfect for:
  - Quick action buttons
  - Smart suggestions
  - Status indicators
  - Context-aware tools
  - File upload shortcuts

---

## Complete Example

Combining all customizations:

```tsx
import { HsafaChat } from '@hsafa/ui-sdk';
import { ChoiceToolUI } from './components/ChoiceToolUI';
import { QuickActions } from './components/QuickActions';

function App() {
  return (
    <HsafaChat
      agentId="my-agent"
      theme="dark"
      
      // Custom tool UIs (same prop as regular UI components!)
      HsafaUI={{
        'getUserChoice': ChoiceToolUI,
        'confirmAction': ChoiceToolUI,
      }}
      
      // Component above input
      componentAboveInput={QuickActions}
      
      // Other props...
      HsafaTools={{
        // Your custom tools
      }}
    />
  );
}

export default App;
```

---

## TypeScript Types

All types are exported from the SDK:

```tsx
import type {
  CustomToolUIRenderProps,
  Attachment
} from '@hsafa/ui-sdk';
```
