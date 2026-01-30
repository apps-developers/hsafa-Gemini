**@hsafa/ui-sdk API Documentation**

> Note: this API reference is generated and can become stale if not regenerated.
> For an implementation-aligned guide, use `sdk/docs/PROFESSIONAL_SDK_GUIDE.md` and the public exports in `sdk/src/index.ts` / `sdk/dist/index.d.ts`.

***

# @hsafa/ui-sdk

React SDK for building AI agent interfaces with custom actions and interactive components.

## Features

- 🤖 **AI Agent Chat**: Ready-to-use chat interface for AI agents
- ⚡ **Custom Actions**: Register functions that AI agents can call
- 🎨 **Dynamic Components**: Create UI components that agents can render
- 🔧 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 📦 **Lightweight**: Tree-shakable with minimal dependencies
- 🎯 **Agent-Focused**: Built specifically for AI agent interactions

## Installation

```bash
npm install @hsafa/ui-sdk
# or
yarn add @hsafa/ui-sdk
# or
pnpm add @hsafa/ui-sdk
```

## Quick Start

### Basic AI Agent Chat

```tsx
import { HsafaProvider, HsafaChat } from '@hsafa/ui-sdk';

function App() {
  return (
    <HsafaProvider baseUrl="https://your-hsafa-api.com">
      <HsafaChat 
        agentId="your-agent-id"
        width={400}
        height={600}
        placeholder="Ask your AI agent anything..."
      />
    </HsafaProvider>
  );
}
```

### Adding Custom Actions

```tsx
import { HsafaProvider, HsafaChat, useHsafaAction } from '@hsafa/ui-sdk';

function MyApp() {
  return (
    <HsafaProvider baseUrl="https://your-hsafa-api.com">
      <ActionProviders />
      <HsafaChat agentId="your-agent-id" />
    </HsafaProvider>
  );
}

function ActionProviders() {
  // Register an action that your AI agent can call
  useHsafaAction('getUserData', async (params) => {
    const { userId } = params;
    // Fetch user data from your database
    return { 
      name: 'John Doe', 
      email: 'john@example.com',
      status: 'active'
    };
  });

  useHsafaAction('createTask', async (params) => {
    const { title, description } = params;
    // Create task in your system
    return { taskId: '123', status: 'created' };
  });

  return null;
}
```

### Custom UI Components

```tsx
import { useHsafaComponent } from '@hsafa/ui-sdk';

function ComponentProviders() {
  // Register UI components that agents can render
  useHsafaComponent('ProductCard', ({ product }) => (
    <div className="border rounded-lg p-4">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button>Add to Cart</button>
    </div>
  ));

  useHsafaComponent('StatusChart', ({ data }) => (
    <div className="chart-container">
      {/* Your chart implementation */}
      <h4>Status Overview</h4>
      {data.map(item => (
        <div key={item.id}>{item.label}: {item.value}</div>
      ))}
    </div>
  ));

  return null;
}
```

## Components

### Button

A versatile button component with multiple variants and states.

```tsx
import { Button } from '@hsafa/ui-sdk';

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// With loading state
<Button loading>Loading...</Button>

// Disabled
<Button disabled>Disabled</Button>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Show loading spinner |
| `disabled` | `boolean` | `false` | Disable the button |
| `children` | `ReactNode` | - | Button content |

## Core Concepts

### AI Agent Integration

The SDK connects to your HSAFA AI Agent Studio, allowing your agents to:
- **Execute Actions**: Call functions in your application
- **Render Components**: Display custom UI elements in chat
- **Access Data**: Interact with your backend systems

### How It Works

1. **Agent Calls Action**: Your AI agent (built in HSAFA Studio) decides to call a registered action
2. **SDK Executes**: The action runs in your React app with the provided parameters  
3. **Return Data**: Results are sent back to the agent to continue the conversation
4. **Render UI**: Agent can display custom components based on the data

## API Reference

### Components

#### HsafaChat

Chat interface for your AI agents built in HSAFA Studio.

```tsx
<HsafaChat
  agentId="your-agent-id"
  width={400}
  height={600}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `agentId` | `string` | **Required** - ID of your agent from HSAFA Studio |
| `width` | `number` | Chat panel width (default: 400) |
| `height` | `number` | Chat panel height (default: 600) |
| `placeholder` | `string` | Input placeholder text |
| `primaryColor` | `string` | Primary theme color |

#### HsafaProvider

Provides context for agent communication.

```tsx
<HsafaProvider baseUrl="https://your-hsafa-api.com">
  {/* Your app */}
</HsafaProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `baseUrl` | `string` | **Required** - Your HSAFA API endpoint |
| `children` | `ReactNode` | **Required** - App components |

### Hooks

#### useHsafaAction

Register functions that your AI agent can call. Perfect for connecting agents to your business logic.

```tsx
import { useHsafaAction } from '@hsafa/ui-sdk';

function MyApp() {
  // Register actions your agent can use
  useHsafaAction('getUserProfile', async ({ userId }) => {
    const user = await fetchUserFromDatabase(userId);
    return { name: user.name, email: user.email };
  });

  useHsafaAction('placeOrder', async ({ productId, quantity }) => {
    const order = await createOrder(productId, quantity);
    return { orderId: order.id, total: order.total };
  });

  return <YourApp />;
}
```

#### useHsafaComponent

Register UI components that agents can render in chat. Great for displaying data visually.

```tsx
import { useHsafaComponent } from '@hsafa/ui-sdk';

function MyApp() {
  // Register components your agent can display
  useHsafaComponent('OrderSummary', ({ order }) => (
    <div className="order-card">
      <h3>Order #{order.id}</h3>
      <p>Total: ${order.total}</p>
      <p>Status: {order.status}</p>
    </div>
  ));

  useHsafaComponent('ProductList', ({ products }) => (
    <div className="grid">
      {products.map(product => (
        <div key={product.id} className="product-card">
          <img src={product.image} alt={product.name} />
          <h4>{product.name}</h4>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  ));

  return <YourApp />;
}
```

#### useHsafa

Advanced hook for manual registration and context access.

```tsx
import { useHsafa } from '@hsafa/ui-sdk';

function MyComponent() {
  const { registerAction, registerComponent } = useHsafa();
  
  // Manual registration with cleanup
  useEffect(() => {
    const cleanup1 = registerAction('customAction', handler);
    const cleanup2 = registerComponent('CustomComponent', Component);
    
    return () => {
      cleanup1();
      cleanup2();
    };
  }, []);
}
```

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/husamabusafa/hsafa.git
cd hsafa/sdk

# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test

# Start Storybook
pnpm storybook
```

### Scripts

- `pnpm build` - Build the library for production
- `pnpm dev` - Build in watch mode
- `pnpm test` - Run tests
- `pnpm test:ui` - Run tests with UI
- `pnpm storybook` - Start Storybook development server
- `pnpm build:storybook` - Build Storybook for production
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Publishing

```bash
# Build the library
pnpm build

# Publish to npm
npm publish --access public
```

## License

MIT © [Husam Abu Safa](https://github.com/husamabusafa)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
