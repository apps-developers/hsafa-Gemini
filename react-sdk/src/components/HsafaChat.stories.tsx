import type { Meta, StoryObj } from '@storybook/react';
import { HsafaChat } from './HsafaChat';
import { HsafaProvider } from '../providers/HsafaProvider';

const meta: Meta<typeof HsafaChat> = {
  title: 'AI Agent/HsafaChat',
  component: HsafaChat,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# HsafaChat - AI Agent Interface

The main chat component for integrating AI agents built with HSAFA AI Agent Studio.

## Key Features
- 🤖 **Agent Communication**: Direct connection to your HSAFA agents
- ⚡ **Custom Actions**: Agents can call functions in your app
- 🎨 **Dynamic Components**: Agents can render custom UI elements
- 🔄 **Real-time Updates**: Live streaming responses from agents
- 🎯 **Easy Integration**: Simple setup with HsafaProvider

## How It Works
1. Your AI agent (built in HSAFA Studio) processes user input
2. Agent can call registered actions using \`useHsafaAction\`
3. Agent can display custom components using \`useHsafaComponent\`
4. Results are shown in the chat interface
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <HsafaProvider baseUrl="http://localhost:3900">
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story />
        </div>
      </HsafaProvider>
    ),
  ],
  argTypes: {
    agentId: {
      control: 'text',
      description: 'The ID of the agent to chat with',
    },
    primaryColor: {
      control: 'color',
      description: 'Primary color for accents and animations',
    },
    backgroundColor: {
      control: 'color',
      description: 'Background color of the chat',
    },
    borderColor: {
      control: 'color',
      description: 'Border color for elements',
    },
    textColor: {
      control: 'color',
      description: 'Text color',
    },
    accentColor: {
      control: 'color',
      description: 'Accent color for buttons and highlights',
    },
    width: {
      control: 'number',
      description: 'Width of the chat panel',
    },
    expandable: {
      control: 'boolean',
      description: 'Whether the chat can be expanded to fullscreen',
    },
    alwaysOpen: {
      control: 'boolean',
      description: 'Whether the chat is always open (cannot be closed)',
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Whether the chat is open by default',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the input field',
    },
    theme: {
      control: { type: 'select' },
      options: ['dark', 'light'],
      description: 'Theme mode - dark or light',
    },
    title: {
      control: 'text',
      description: 'Title displayed in the chat header',
    },
  },
};

// Story: Demonstrates registering actions and UI components and reacting to streamed items
export const MockedActionsAndUI: Story = {
  decorators: [
    (Story) => {
      // Register sample action and UI component
      const Registrar = () => {
        // Action that logs and sets window title
        useHsafaAction('SetTitle', (params) => {
          try { document.title = String(params?.title ?? 'Hsafa'); } catch {}
        });
        // UI component to render a callout
        useHsafaComponent('Callout', ({ tone = 'info', title = 'Note', body = '' }) => {
          const colors: Record<string, string> = { info: '#2563EB', success: '#059669', warning: '#D97706', danger: '#DC2626' };
          const c = colors[String(tone)] || colors.info;
          return (
            <div style={{ border: `1px solid ${c}66`, background: `${c}10`, color: '#EDEEF0', borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{String(title)}</div>
              <div style={{ opacity: 0.9 }}>{String(body)}</div>
            </div>
          );
        });
        return null;
      };

      // Mock fetch for demonstration
      const originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        if (url.toString().includes('/api/run/')) {
          const mockResponse = new Response(
            new ReadableStream({
              start(controller) {
                const messages = [
                  // meta conveys executeOnStream preference for actions
                  JSON.stringify({ type: 'meta', chatId: 'mock-actions-ui', assistantMessageId: 'assist-1', actionExecuteMap: { SetTitle: true } }) + '\n',
                  JSON.stringify({ type: 'reasoning', text: 'Thinking about setting the title and showing a callout...' }) + '\n',
                  // partial emits action (will execute due to executeOnStream:true)
                  JSON.stringify({ type: 'partial', value: { items: [ { type: 'action', name: 'SetTitle', params: { title: 'Partial Title' } } ] } }) + '\n',
                  // partial emits UI (rendered live)
                  JSON.stringify({ type: 'partial', value: { items: [ { type: 'ui', component: 'Callout', props: { tone: 'info', title: 'Working…', body: 'Please wait while I complete your request.' } } ] } }) + '\n',
                  // final emits both action (should not execute again because executeOnStream is true) and UI
                  JSON.stringify({ type: 'final', value: { items: [ { type: 'action', name: 'SetTitle', params: { title: 'Done Title' } }, { type: 'ui', component: 'Callout', props: { tone: 'success', title: 'Completed', body: 'Your request has been processed.' } }, 'Anything else?' ] } }) + '\n',
                  JSON.stringify({ type: 'usage', value: { reasoningTokens: 42 } }) + '\n'
                ];
                let index = 0;
                const interval = setInterval(() => {
                  if (index < messages.length) {
                    controller.enqueue(new TextEncoder().encode(messages[index]));
                    index++;
                  } else {
                    controller.close();
                    clearInterval(interval);
                    setTimeout(() => { window.fetch = originalFetch; }, 1000);
                  }
                }, 400);
              }
            }),
            { status: 200, headers: { 'Content-Type': 'text/plain' } }
          );
          return Promise.resolve(mockResponse);
        }
        return originalFetch(url, options);
      };

      return (
        <HsafaProvider baseUrl="http://localhost:3900">
          <Registrar />
          <div style={{ height: '100vh', width: '100vw' }}>
            <Story />
          </div>
        </HsafaProvider>
      );
    },
  ],
  args: {
    agentId: 'mock-actions-ui-agent',
    theme: 'dark',
    title: 'Actions + UI Demo',
  },
};

export default meta;
type Story = StoryObj<typeof HsafaChat>;

export const Default: Story = {
  args: {
    agentId: "cmfx4jbf900e9qgl98wregwim",
    theme: "dark"
  },
};

export const LightTheme: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'light',
    title: 'Light Theme Chat',
    placeholder: 'Ask me anything in light mode...',
  },
};

export const DarkTheme: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark',
    title: 'Dark Theme Chat',
    placeholder: 'Ask me anything in dark mode...',
  },
};

export const WithCustomAgent: Story = {
  args: {
    agentId: 'custom-agent-id',
    theme: 'dark',
    title: 'Custom Agent',
    placeholder: 'Chat with your custom agent...',
  },
};

export const WithChildren: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark',
    primaryColor: '#667eea',
  },
};

export const DifferentBaseUrl: Story = {
  decorators: [
    (Story) => (
      <HsafaProvider baseUrl="https://api.example.com">
        <div style={{ height: '100vh', width: '100vw' }}>
          <Story />
        </div>
      </HsafaProvider>
    ),
  ],
  args: {
    agentId: 'production-agent',
  },
};

// Customization Examples
export const CustomColors: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark', // Base theme
    primaryColor: '#FF6B6B', // Override primary color
    backgroundColor: '#1A1A2E', // Override background
    borderColor: '#16213E', // Override border
    textColor: '#EEEEFF', // Override text color
    accentColor: '#0F3460', // Override accent
    title: 'Custom Styled Agent',
    placeholder: 'Type your message with custom styling...',
  },
};

export const LightThemeCustom: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'light',
    primaryColor: '#059669', // Green primary
    title: 'Light Theme with Green Accent',
    placeholder: 'Light theme with custom green accent...',
  },
};

export const CompactChat: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark',
    width: 300,
    maxWidth: 300,
    title: 'Compact Chat',
  },
};

export const CompactLightChat: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'light',
    width: 300,
    maxWidth: 300,
    title: 'Compact Light Chat',
  },
};

export const WideChat: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark',
    width: 600,
    maxWidth: 600,
    title: 'Wide Chat Panel',
  },
};

export const AlwaysOpenChat: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark',
    alwaysOpen: true,
    expandable: false,
    title: 'Always Open Chat',
    primaryColor: '#10B981',
  },
};

export const AlwaysOpenLightChat: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'light',
    alwaysOpen: true,
    expandable: false,
    title: 'Always Open Light Chat',
    primaryColor: '#2563EB',
  },
};

export const CustomFloatingButton: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark',
    defaultOpen: false,
    floatingButtonPosition: {
      bottom: 20,
      left: 20,
    },
    primaryColor: '#8B5CF6',
    accentColor: '#7C3AED',
    title: 'Left-positioned Button',
  },
};

export const MinimalStyling: Story = {
  args: {
    agentId: 'test-agent-1',
    theme: 'dark', // Base theme
    backgroundColor: '#000000', // Override
    borderColor: '#333333', // Override
    textColor: '#FFFFFF', // Override
    accentColor: '#222222', // Override
    title: 'Minimal Chat',
    placeholder: 'Minimal styling...',
  },
};

export const MockedResponses: Story = {
  decorators: [
    (Story) => {
      // Mock fetch for demonstration
      const originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        if (url.toString().includes('/api/run/')) {
          // Return a mock streaming response
          const mockResponse = new Response(
            new ReadableStream({
              start(controller) {
                const messages = [
                  '{"type":"meta","chatId":"mock-chat-123"}\n',
                  '{"type":"reasoning","text":"I need to help the user with their question..."}\n',
                  '{"type":"partial","value":{"items":["Hello! I\'m a mock agent response."]}}\n',
                  '{"type":"final","value":{"items":["Hello! I\'m a mock agent response. This is a demonstration of the chat component in Storybook."]}}\n',
                  '{"type":"usage","value":{"reasoningTokens":150}}\n'
                ];
                
                let index = 0;
                const interval = setInterval(() => {
                  if (index < messages.length) {
                    controller.enqueue(new TextEncoder().encode(messages[index]));
                    index++;
                  } else {
                    controller.close();
                    clearInterval(interval);
                    // Restore original fetch after demo
                    setTimeout(() => {
                      window.fetch = originalFetch;
                    }, 1000);
                  }
                }, 500);
              }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'text/plain' }
            }
          );
          return Promise.resolve(mockResponse);
        }
        return originalFetch(url, options);
      };
      
      return (
        <HsafaProvider baseUrl="http://localhost:3900">
          <div style={{ height: '100vh', width: '100vw' }}>
            <Story />
          </div>
        </HsafaProvider>
      );
    },
  ],
  args: {
    agentId: 'mock-agent',
    theme: 'dark',
    primaryColor: '#F59E0B',
    title: 'Demo Chat with Mocked Responses',
  },
  parameters: {
    docs: {
      description: {
        story: 'This story includes mocked API responses to demonstrate the chat functionality without needing a real backend.',
      },
    },
  },
};

export const MockedResponsesLight: Story = {
  decorators: [
    (Story) => {
      // Mock fetch for demonstration
      const originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        if (url.toString().includes('/api/run/')) {
          // Return a mock streaming response
          const mockResponse = new Response(
            new ReadableStream({
              start(controller) {
                const messages = [
                  '{"type":"meta","chatId":"mock-chat-light-123"}\n',
                  '{"type":"reasoning","text":"I\'m responding in light theme mode..."}\n',
                  '{"type":"partial","value":{"items":["Hello! This is a light theme demo."]}}\n',
                  '{"type":"final","value":{"items":["Hello! This is a light theme demonstration of the chat component with mocked responses."]}}\n',
                  '{"type":"usage","value":{"reasoningTokens":120}}\n'
                ];
                
                let index = 0;
                const interval = setInterval(() => {
                  if (index < messages.length) {
                    controller.enqueue(new TextEncoder().encode(messages[index]));
                    index++;
                  } else {
                    controller.close();
                    clearInterval(interval);
                    // Restore original fetch after demo
                    setTimeout(() => {
                      window.fetch = originalFetch;
                    }, 1000);
                  }
                }, 500);
              }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'text/plain' }
            }
          );
          return Promise.resolve(mockResponse);
        }
        return originalFetch(url, options);
      };
      
      return (
        <HsafaProvider baseUrl="http://localhost:3900">
          <div style={{ height: '100vh', width: '100vw' }}>
            <Story />
          </div>
        </HsafaProvider>
      );
    },
  ],
  args: {
    agentId: 'mock-agent-light',
    theme: 'light',
    title: 'Light Theme Demo with Mocked Responses',
  },
  parameters: {
    docs: {
      description: {
        story: 'Light theme version with mocked API responses.',
      },
    },
  },
};

// TODO: Add ContentContainer examples showing the new pattern for wrapping content
