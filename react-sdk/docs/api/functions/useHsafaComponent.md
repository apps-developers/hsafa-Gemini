[**@hsafa/ui-sdk API Documentation**](../README.md)

***

[@hsafa/ui-sdk API Documentation](../globals.md) / useHsafaComponent

# Function: useHsafaComponent()

> Note: this page may be stale. `useHsafaComponent` is not part of the current SDK export surface.
> Prefer `sdk/src/index.ts` / `sdk/dist/index.d.ts` as the source of truth.

> **useHsafaComponent**(`name`, `component`): `void`

Defined in: [hooks/useHsafaComponent.ts:9](https://github.com/husamabusafa/hsafa/blob/1bcff44fada407a2574b2306f2d974ade919aebf/sdk/src/hooks/useHsafaComponent.ts#L9)

Register a UI component by name within the nearest HsafaProvider.
The component will be automatically unregistered on unmount.

## Parameters

### name

`string`

### component

`ComponentType`\<`any`\>

## Returns

`void`
