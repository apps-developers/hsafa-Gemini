# Vite Test App

Test application for the Hsafa React SDK.

## Development

```bash
pnpm dev
```

This will start the Vite dev server on `http://localhost:5173` and proxy API requests to the hsafa-gateway server on port 3001.

## Usage

Make sure the hsafa-gateway server is running:

```bash
cd ../hsafa-gateway
pnpm dev
```

Then start this app:

```bash
pnpm dev
```

## Features

- Full-page chat interface using `@hsafa/react-sdk`
- Custom approval UI component
- Dark theme
- MCP server integration
