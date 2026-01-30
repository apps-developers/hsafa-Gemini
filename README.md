# Hsafa Logic - AI Agent Platform

A distributed AI agent platform with persistent memory, multi-device tool execution, and a powerful React SDK.

## 🏗️ Project Structure

This is a **pnpm monorepo** with the following packages:

```
hsafa-logic/
├── hsafa-gateway/        # Node.js server - Agent builder & runtime
├── react-sdk/            # React SDK for building agent UIs
├── vite-test-app/        # Vite test app for SDK development
├── hsafa-docs/           # Platform documentation
└── vercel-ai-sdk-docs/   # Vercel AI SDK documentation
```

### 📦 Packages

- **`hsafa-gateway`** - Node.js Express server that builds and runs agents from JSON configs. Supports distributed tool execution, streaming, and persistent memory.

- **`react-sdk`** - React components and hooks for integrating AI agents into your app. Includes `HsafaChat` component with theming, custom tool UIs, and more.

- **`vite-test-app`** - Vite-powered test application for SDK development and testing.

- **`hsafa-docs`** - Comprehensive platform documentation including architecture guides and API references.

- **`vercel-ai-sdk-docs`** - Documentation for the Vercel AI SDK integration.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+

### Installation

```bash
pnpm install
```

### Environment Setup

Create a `.env` file in the root (or in `hsafa-gateway/`):

```env
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
XAI_API_KEY=your-key-here
```

### Development

**Start everything:**
```bash
pnpm dev
```

This will start:
- Gateway server on `http://localhost:3001`
- Vite test app on `http://localhost:5173`

**Or run individually:**

```bash
# Gateway server only
pnpm dev:gateway

# React SDK (watch mode)
pnpm dev:sdk

# Vite test app only
pnpm dev:test
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:gateway
pnpm build:sdk
pnpm build:test
```

## 📖 Architecture

See [`hsafa-docs/idea-docs/11-agent-builder-server.mdx`](./hsafa-docs/idea-docs/11-agent-builder-server.mdx) for the complete platform architecture.

### Key Concepts

- **Agent Builder** - Create agents from JSON configs with model settings, tools, and MCP servers
- **Distributed Runtime** - Agents run on the server with tools executing on any connected device
- **Persistent Memory** - PostgreSQL for long-term storage, Redis for live streaming state
- **Multi-client Support** - Web, mobile, Node.js clients via SSE + WebSockets

## 🛠️ Tech Stack

| Purpose          | Technology                |
| ---------------- | ------------------------- |
| AI Agent Brain   | Vercel AI SDK (Core)      |
| Gateway Server   | Node.js + Express         |
| React SDK        | React + TypeScript        |
| Build Tool       | tsup / Vite               |
| Package Manager  | pnpm                      |

## 📚 Documentation

- [Platform Architecture](./hsafa-docs/idea-docs/11-agent-builder-server.mdx)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [React SDK Docs](./react-sdk/DOCUMENTATION.md)

## 🤝 Contributing

This is a monorepo managed with pnpm workspaces. Each package has its own `README.md` with specific documentation.

## 📄 License

MIT
