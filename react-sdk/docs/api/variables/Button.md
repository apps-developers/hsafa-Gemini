[**@hsafa/ui-sdk API Documentation**](../README.md)

***

[@hsafa/ui-sdk API Documentation](../globals.md) / Button

# Variable: Button

> `const` **Button**: `React.FC`\<[`ButtonProps`](../interfaces/ButtonProps.md)\>

Defined in: [components/Button.tsx:36](https://github.com/husamabusafa/hsafa/blob/1bcff44fada407a2574b2306f2d974ade919aebf/sdk/src/components/Button.tsx#L36)

A versatile button component with multiple variants, sizes, and states.

## Example

```tsx
// Basic usage
<Button>Click me</Button>

// With variant and size
<Button variant="secondary" size="lg">Large Secondary Button</Button>

// Loading state
<Button loading>Processing...</Button>

// With click handler
<Button onClick={() => console.log('Clicked!')}>Click me</Button>
```
