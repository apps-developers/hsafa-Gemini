# HsafaChat CSS Customization Guide

Complete guide for customizing HsafaChat components using CSS. All styles are theme-aware and work seamlessly with both dark and light themes.

## Table of Contents
- [Quick Start](#quick-start)
- [CSS Variables](#css-variables)
- [Data Attributes](#data-attributes)
- [Component Selectors](#component-selectors)
- [Common Customizations](#common-customizations)
- [Theme-Aware Styling](#theme-aware-styling)
- [Advanced Examples](#advanced-examples)

---

## Quick Start

Pass custom CSS to `HsafaChat` using the `customStyles` prop:

```tsx
<HsafaChat
  agentId="my-agent"
  customStyles={`
    /* Your custom CSS here */
    [data-hsafa-chat] {
      font-family: 'Inter', sans-serif;
    }
  `}
/>
```

---

## CSS Variables

All color values are exposed as CSS variables that automatically update based on theme and props.

### Available Variables

```css
:root {
  /* Theme indicator */
  --hsafa-theme: dark | light;
  
  /* Base colors */
  --hsafa-primary: #4D78FF;           /* Primary brand color */
  --hsafa-background: #0B0B0F;       /* Main background */
  --hsafa-border: #2A2C33;           /* Border color */
  --hsafa-text: #EDEEF0;             /* Primary text */
  --hsafa-accent: #17181C;           /* Accent background */
  --hsafa-muted-text: #6f7276;       /* Secondary text */
  
  /* Component backgrounds */
  --hsafa-input-bg: #17181C;         /* Input field background */
  --hsafa-card-bg: #121318;          /* Card/message background */
  --hsafa-hover-bg: #1c1e25;         /* Hover state background */
  
  /* Status colors */
  --hsafa-error: #ef4444;            /* Error state */
  --hsafa-error-light: #fee2e2;      /* Error background */
  --hsafa-error-dark: #991b1b;       /* Error dark variant */
  
  --hsafa-success: #10b981;          /* Success state */
  --hsafa-success-light: rgba(16,185,129,0.15); /* Success background */
  
  --hsafa-warning: #eab308;          /* Warning state */
  --hsafa-warning-light: rgba(234,179,8,0.15); /* Warning background */
  
  --hsafa-info: #3b82f6;             /* Info state */
  --hsafa-info-light: rgba(59,130,246,0.15); /* Info background */
  
  --hsafa-danger: #ef4444;           /* Danger state */
  --hsafa-danger-light: rgba(239,68,68,0.1); /* Danger background */
  --hsafa-danger-dark: #991b1b;      /* Danger dark variant */
}
```

### Using Variables

```css
/* Example: Change input background */
[data-hsafa-chat] textarea {
  background: var(--hsafa-input-bg) !important;
}

/* Example: Custom primary color usage */
[data-hsafa-chat] button[aria-label="Send"] {
  background: var(--hsafa-primary) !important;
}
```

---

## Data Attributes

Use data attributes to target specific chat instances or themes:

### Chat Type
- `[data-hsafa-chat="fullpage"]` - Full-page chat layout
- `[data-hsafa-chat="panel"]` - Floating panel chat layout

### Theme
- `[data-hsafa-theme="dark"]` - Dark theme
- `[data-hsafa-theme="light"]` - Light theme

### Agent ID
- `[data-hsafa-agent-id="your-agent-id"]` - Specific agent

### Examples

```css
/* Style only full-page chats */
[data-hsafa-chat="fullpage"] {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

/* Style specific agent */
[data-hsafa-agent-id="support-agent"] {
  --hsafa-primary: #10b981;
}

/* Dark theme specific styles */
[data-hsafa-theme="dark"] {
  --hsafa-card-bg: #000000;
}

/* Light theme specific styles */
[data-hsafa-theme="light"] {
  --hsafa-card-bg: #f5f5f5;
}
```

---

## Component Selectors

### Chat Container

```css
/* Main chat container */
[data-hsafa-chat] {
  font-family: 'Your Font', sans-serif;
}
```

### Messages Area

```css
/* Messages container */
[data-hsafa-chat] > div > div[style*="flex-direction: column"] {
  padding: 20px;
}

/* Individual message */
[data-hsafa-chat] [style*="margin-bottom"] > div {
  border-radius: 12px;
}

/* User message */
[data-hsafa-chat] div[style*="align-items: flex-end"] {
  /* Styles for user messages */
}

/* Assistant message */
[data-hsafa-chat] div[style*="align-items: flex-start"] {
  /* Styles for assistant messages */
}
```

### Input Area

```css
/* Input container */
[data-hsafa-chat] div[style*="padding: 12px"] {
  background: var(--hsafa-input-bg);
  border-radius: 16px;
}

/* Textarea */
[data-hsafa-chat] textarea {
  background: var(--hsafa-input-bg) !important;
  color: var(--hsafa-text) !important;
  border: 1px solid var(--hsafa-border) !important;
  border-radius: 12px !important;
  padding: 12px 16px !important;
  font-size: 15px !important;
  line-height: 1.5 !important;
}

/* Send button */
[data-hsafa-chat] button[aria-label="Send"],
[data-hsafa-chat] button[title="Send message"] {
  background: var(--hsafa-primary) !important;
  color: white !important;
  border-radius: 10px !important;
  padding: 10px 16px !important;
}

/* Stop button */
[data-hsafa-chat] button[title="Stop generation"] {
  background: var(--hsafa-danger-light) !important;
  color: var(--hsafa-danger) !important;
  border: 1px solid var(--hsafa-danger) !important;
}

/* Attachment button */
[data-hsafa-chat] button[aria-label="Attach files"] {
  color: var(--hsafa-muted-text) !important;
}
```

### Header

```css
/* Header container */
[data-hsafa-chat] > div > div:first-child {
  background: var(--hsafa-card-bg);
  border-bottom: 1px solid var(--hsafa-border);
}

/* Title */
[data-hsafa-chat] div[style*="font-size: 16px"][style*="font-weight: 600"] {
  font-size: 18px !important;
  font-weight: 700 !important;
}

/* New chat button */
[data-hsafa-chat] button[title="New"] {
  background: var(--hsafa-accent) !important;
  border-radius: 8px !important;
}
```

### Chat History

```css
/* History panel */
[data-hsafa-chat] div[style*="width: 280px"] {
  background: var(--hsafa-card-bg);
  border-right: 1px solid var(--hsafa-border);
}

/* Search input */
[data-hsafa-chat] input[placeholder*="Search"] {
  background: var(--hsafa-input-bg) !important;
  border: 1px solid var(--hsafa-border) !important;
  border-radius: 8px !important;
}

/* Chat item */
[data-hsafa-chat] div[style*="cursor: pointer"][style*="padding: 12px"] {
  border-radius: 8px;
  margin: 4px 8px;
}

/* Delete button */
[data-hsafa-chat] button[title*="Delete"] {
  color: var(--hsafa-muted-text);
}

[data-hsafa-chat] button[title*="Delete"]:hover {
  color: var(--hsafa-danger) !important;
  background: var(--hsafa-danger-light) !important;
}
```

### Tool Calls & Status Badges

```css
/* Tool call container */
[data-hsafa-chat] div[style*="border-left"] {
  border-left: 2px solid var(--hsafa-primary) !important;
  background: var(--hsafa-accent);
}

/* Status badges */
[data-hsafa-chat] span[style*="padding: 2px"] {
  border-radius: 4px;
  font-weight: 500;
}

/* Error status */
[data-hsafa-chat] span[style*="color: #ef4444"] {
  color: var(--hsafa-error) !important;
}

/* Success status */
[data-hsafa-chat] span[style*="color: #10b981"] {
  color: var(--hsafa-success) !important;
}
```

### Error Messages

```css
/* Error banner */
[data-hsafa-chat] div[style*="backgroundColor"][style*="#ef4444"] {
  background: var(--hsafa-error) !important;
  border-radius: 8px;
  padding: 12px 16px;
}
```

### Floating Button

```css
/* Floating chat button */
button[style*="position: fixed"][style*="z-index: 1000"] {
  background: var(--hsafa-primary) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
  width: 60px !important;
  height: 60px !important;
  border-radius: 50% !important;
}
```

---

## Common Customizations

### Change Input Background

```css
/* Make input background transparent */
[data-hsafa-chat] textarea {
  background: transparent !important;
  border: 2px solid var(--hsafa-border) !important;
}
```

### Custom Message Bubbles

```css
/* Rounded message bubbles */
[data-hsafa-chat] [style*="margin-bottom"] > div > div {
  border-radius: 16px !important;
  padding: 12px 16px !important;
}

/* User message bubble */
[data-hsafa-chat] div[style*="align-items: flex-end"] > div {
  background: var(--hsafa-primary) !important;
  color: white !important;
}

/* Assistant message bubble */
[data-hsafa-chat] div[style*="align-items: flex-start"] > div {
  background: var(--hsafa-card-bg) !important;
  border: 1px solid var(--hsafa-border);
}
```

### Custom Fonts

```css
/* Apply custom font family */
[data-hsafa-chat] {
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Input specific font */
[data-hsafa-chat] textarea {
  font-family: 'Inter', sans-serif !important;
  font-size: 15px !important;
}
```

### Compact Mode

```css
/* Reduce spacing for compact layout */
[data-hsafa-chat] {
  --spacing-scale: 0.75;
}

[data-hsafa-chat] div[style*="padding"] {
  padding: calc(12px * var(--spacing-scale)) !important;
}

[data-hsafa-chat] div[style*="margin"] {
  margin: calc(8px * var(--spacing-scale)) !important;
}
```

### Glassmorphism Effect

```css
/* Glass effect for panel */
[data-hsafa-chat="panel"] {
  backdrop-filter: blur(20px) !important;
  background: rgba(11, 11, 15, 0.8) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

[data-hsafa-theme="dark"][data-hsafa-chat] textarea {
  background: rgba(23, 24, 28, 0.6) !important;
  backdrop-filter: blur(10px) !important;
}
```

---

## Theme-Aware Styling

### Conditional Styling by Theme

```css
/* Dark theme styles */
[data-hsafa-theme="dark"] {
  --hsafa-input-bg: #1a1b1f;
  --hsafa-card-bg: #0d0e11;
}

/* Light theme styles */
[data-hsafa-theme="light"] {
  --hsafa-input-bg: #f8f9fa;
  --hsafa-card-bg: #ffffff;
  --hsafa-border: #e1e4e8;
}
```

### Using CSS Custom Properties

```css
/* Define theme-specific values */
[data-hsafa-theme="dark"] {
  --message-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  --message-border: rgba(255, 255, 255, 0.1);
}

[data-hsafa-theme="light"] {
  --message-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --message-border: rgba(0, 0, 0, 0.1);
}

/* Apply them */
[data-hsafa-chat] div[style*="margin-bottom"] > div {
  box-shadow: var(--message-shadow) !important;
  border: 1px solid var(--message-border) !important;
}
```

---

## Advanced Examples

### Brand Customization

```tsx
<HsafaChat
  agentId="brand-agent"
  primaryColor="#6366f1"
  customStyles={`
    /* Brand colors */
    [data-hsafa-agent-id="brand-agent"] {
      --hsafa-primary: #6366f1;
      --hsafa-accent: #eef2ff;
    }
    
    /* Custom gradients */
    [data-hsafa-agent-id="brand-agent"] button[aria-label="Send"] {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
    }
    
    /* Brand fonts */
    [data-hsafa-agent-id="brand-agent"] {
      font-family: 'Poppins', sans-serif;
    }
  `}
/>
```

### Minimal UI

```tsx
<HsafaChat
  agentId="minimal-agent"
  customStyles={`
    /* Hide borders */
    [data-hsafa-chat] * {
      border: none !important;
    }
    
    /* Minimal input */
    [data-hsafa-chat] textarea {
      background: transparent !important;
      padding: 8px 0 !important;
      border-bottom: 1px solid var(--hsafa-border) !important;
      border-radius: 0 !important;
    }
    
    /* Simple messages */
    [data-hsafa-chat] [style*="margin-bottom"] > div > div {
      background: transparent !important;
      padding: 8px 0 !important;
    }
  `}
/>
```

### Animated Interactions

```tsx
<HsafaChat
  agentId="animated-agent"
  customStyles={`
    /* Smooth transitions */
    [data-hsafa-chat] * {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Button hover effects */
    [data-hsafa-chat] button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    /* Message fade in */
    [data-hsafa-chat] [style*="margin-bottom"] {
      animation: fadeInUp 0.3s ease-out;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `}
/>
```

### Scrollbar Styling

```tsx
<HsafaChat
  agentId="scrollbar-agent"
  customStyles={`
    /* Custom scrollbar for dark theme */
    [data-hsafa-theme="dark"] ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    [data-hsafa-theme="dark"] ::-webkit-scrollbar-track {
      background: var(--hsafa-accent);
      border-radius: 4px;
    }
    
    [data-hsafa-theme="dark"] ::-webkit-scrollbar-thumb {
      background: var(--hsafa-border);
      border-radius: 4px;
    }
    
    [data-hsafa-theme="dark"] ::-webkit-scrollbar-thumb:hover {
      background: var(--hsafa-muted-text);
    }
    
    /* Custom scrollbar for light theme */
    [data-hsafa-theme="light"] ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
    }
  `}
/>
```

---

## Tips & Best Practices

### 1. Use `!important` Sparingly
Only use `!important` when necessary to override inline styles. Prefer using more specific selectors.

### 2. Leverage CSS Variables
Always use CSS variables for colors to maintain theme consistency:
```css
/* Good */
background: var(--hsafa-primary);

/* Avoid */
background: #4D78FF;
```

### 3. Test Both Themes
Always test your customizations in both dark and light themes:
```tsx
<HsafaChat theme="dark" customStyles={yourStyles} />
<HsafaChat theme="light" customStyles={yourStyles} />
```

### 4. Scope Your Styles
Use data attributes to prevent affecting other components:
```css
/* Scoped to specific agent */
[data-hsafa-agent-id="your-agent"] {
  /* Your styles */
}
```

### 5. Responsive Design
Consider mobile views:
```css
@media (max-width: 768px) {
  [data-hsafa-chat] {
    /* Mobile-specific styles */
  }
}
```

---

## Debugging Styles

### Inspect Elements
Use browser DevTools to inspect elements and find their current styles.

### View Applied Variables
Check computed CSS variables in DevTools:
```javascript
getComputedStyle(document.documentElement).getPropertyValue('--hsafa-primary')
```

### Override Check
If styles aren't applying, check specificity:
```css
/* Lower specificity */
div { color: red; }

/* Higher specificity */
[data-hsafa-chat] div { color: blue; }

/* Highest (avoid) */
div { color: green !important; }
```

---

## Need Help?

- **Documentation**: [SDK Docs](../README.md)
- **Examples**: [examples/](../examples/)
- **Issues**: [GitHub Issues](https://github.com/husamabusafa/hsafa/issues)

---

**Version**: Compatible with @hsafa/ui-sdk v0.6.2+
