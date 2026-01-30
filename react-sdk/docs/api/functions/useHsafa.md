[**@hsafa/ui-sdk API Documentation**](../README.md)

***

[@hsafa/ui-sdk API Documentation](../globals.md) / useHsafa

# Function: useHsafa()

> **useHsafa**(): `HsafaContextValue`

Defined in: [providers/HsafaProvider.tsx:161](https://github.com/husamabusafa/hsafa/blob/1bcff44fada407a2574b2306f2d974ade919aebf/sdk/src/providers/HsafaProvider.tsx#L161)

Hook to access the Hsafa context.
Must be used within a HsafaProvider.

## Returns

`HsafaContextValue`

The Hsafa context value with actions, components, and configuration

## Example

```tsx
function MyComponent() {
  const { registerAction, baseUrl } = useHsafa();
  
  useEffect(() => {
    const unregister = registerAction('myAction', async (params) => {
      console.log('Action called with:', params);
      return { success: true };
    });
    
    return unregister;
  }, [registerAction]);
  
  return <div>My Component</div>;
}
```
