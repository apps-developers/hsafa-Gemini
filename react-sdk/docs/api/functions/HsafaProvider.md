[**@hsafa/ui-sdk API Documentation**](../README.md)

***

[@hsafa/ui-sdk API Documentation](../globals.md) / HsafaProvider

# Function: HsafaProvider()

> **HsafaProvider**(`__namedParameters`): `Element`

Defined in: [providers/HsafaProvider.tsx:66](https://github.com/husamabusafa/hsafa/blob/1bcff44fada407a2574b2306f2d974ade919aebf/sdk/src/providers/HsafaProvider.tsx#L66)

Provider component that sets up the Hsafa context for the SDK.
Wrap your app or chat components with this provider to enable Hsafa functionality.

## Parameters

### \_\_namedParameters

`HsafaProviderProps`

## Returns

`Element`

## Example

```tsx
<HsafaProvider baseUrl="https://api.example.com">
  <HsafaChat agentId="my-agent" />
</HsafaProvider>
```
