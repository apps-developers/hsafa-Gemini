# @hsafa/ui-sdk Documentation

React SDK for integrating AI agents built with HSAFA AI Agent Studio into your applications.

## 📚 Documentation Structure

### 1. **Getting Started**
- [Installation & Setup](README.md#installation)
- [Basic AI Agent Chat](README.md#basic-ai-agent-chat)
- [Getting Started Example](examples/getting-started.tsx)

### 2. **Core Components**
- [HsafaChat](README.md#hsafachat) - AI agent chat interface
- [HsafaProvider](README.md#hsafaprovider) - SDK context provider

### 3. **Agent Integration**
- [useHsafaAction](README.md#usehsafaaction) - Register functions for agents
- [useHsafaComponent](README.md#usehsafacomponent) - Register UI components
- [useHsafa](README.md#usehsafa) - Advanced context access

### 4. **Examples**
- [Getting Started](examples/getting-started.tsx) - Simple setup with basic actions
- [E-commerce Agent](examples/ecommerce-agent.tsx) - Product search & ordering

### 5. **API Reference**
- [Complete API Documentation](docs/api/) - Generated from TypeScript definitions
- [Interactive Storybook](http://localhost:6006) - Component playground

## 🚀 Quick Navigation

### For Beginners
1. Start with the [Installation](README.md#installation)
2. Try the [Basic Usage Example](examples/basic-usage.tsx)
3. Explore the [Interactive Storybook](#interactive-documentation)

### For Advanced Users
1. Check out [Chat Integration](examples/chat-integration.tsx)
2. Review [Custom Actions](README.md#custom-actions--components)
3. Browse the [API Reference](docs/api/)

## 📖 Interactive Documentation

### Storybook
Run the interactive component documentation:

```bash
cd sdk
pnpm storybook
```

Then visit [http://localhost:6006](http://localhost:6006) to:
- 🎮 **Play with components** interactively
- 📝 **View live documentation** with examples
- 🎨 **Test different props** and configurations
- 📱 **See responsive behavior**

### API Documentation
Generate comprehensive API documentation:

```bash
cd sdk
pnpm docs:api
```

This creates detailed API docs in `docs/api/` with:
- 📋 **Complete type definitions**
- 🔍 **Function signatures**
- 💡 **Usage examples**
- 🏷️ **Parameter descriptions**

## 🎨 Theming & Styling

### CSS Modules
The SDK uses CSS Modules for styling. Each component has its own stylesheet:

```
src/components/
├── Button.tsx
├── Button.module.css
├── HsafaChat.tsx
└── HsafaChat.module.css
```

### Customization
You can customize the appearance by:

1. **Using component props** (recommended):
```tsx
<HsafaChat
  // Base colors
  primaryColor="#3b82f6"
  backgroundColor="#ffffff"
  borderColor="#e5e7eb"
  textColor="#111827"
  accentColor="#F9FAFB"
  // Status colors (v0.6.2+)
  errorColor="#ef4444"
  errorColorLight="#fef2f2"
  successColor="#10b981"
  warningColor="#eab308"
  infoColor="#3b82f6"
  dangerColor="#dc2626"
/>
```

**Status Colors (v0.6.2+)**: All status colors are now fully customizable:
- `errorColor`, `errorColorLight`, `errorColorDark` - Error states and validation
- `successColor`, `successColorLight` - Success notifications and completed tools
- `warningColor`, `warningColorLight` - Warning states
- `infoColor`, `infoColorLight` - Info messages and running tools
- `dangerColor`, `dangerColorLight`, `dangerColorDark` - Delete actions and stop buttons

2. **CSS custom properties**:
```css
.my-chat {
  --hsafa-primary-color: #3b82f6;
  --hsafa-background-color: #ffffff;
}
```

3. **CSS Module overrides**:
```tsx
import styles from './MyCustomStyles.module.css';

<Button className={styles.customButton} />
```

## 🔧 Development Workflow

### Building Documentation
```bash
# Build all documentation
pnpm docs:build

# Development mode with hot reload
pnpm docs:dev

# Build API docs only
pnpm docs:api
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Type checking
pnpm type-check
```

## 📁 Project Structure

```
sdk/
├── src/
│   ├── components/          # React components
│   ├── hooks/              # Custom hooks
│   ├── providers/          # Context providers
│   └── index.ts           # Main exports
├── examples/              # Usage examples
├── docs/                  # Generated documentation
├── .storybook/           # Storybook configuration
└── README.md             # Main documentation
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](README.md#contributing) for details.

### Documentation Contributions
- 📝 Improve existing documentation
- 🌟 Add new examples
- 🐛 Fix documentation bugs
- 💡 Suggest better explanations

## 📞 Support

- 📖 **Documentation**: You're reading it!
- 🐛 **Issues**: [GitHub Issues](https://github.com/husamabusafa/hsafa/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/husamabusafa/hsafa/discussions)

## 📄 License

MIT © [Husam Abu Safa](https://github.com/husamabusafa)

---

**Happy coding!** 🎉
