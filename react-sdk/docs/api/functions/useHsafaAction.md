[**@hsafa/ui-sdk API Documentation**](../README.md)

***

[@hsafa/ui-sdk API Documentation](../globals.md) / useHsafaAction

# Function: useHsafaAction()

> Note: this page may be stale. `useHsafaAction` is not part of the current SDK export surface.
> Prefer `sdk/src/index.ts` / `sdk/dist/index.d.ts` as the source of truth.

> **useHsafaAction**(`name`, `handler`): `void`

Defined in: [hooks/useHsafaAction.ts:9](https://github.com/husamabusafa/hsafa/blob/1bcff44fada407a2574b2306f2d974ade919aebf/sdk/src/hooks/useHsafaAction.ts#L9)

Register an action handler by name within the nearest HsafaProvider.
The handler will be automatically unregistered on unmount.

## Parameters

### name

`string`

### handler

`HsafaActionHandler`

## Returns

`void`
