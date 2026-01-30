# 11 — API Reference Map

Use this as a directory to the TypeDoc API and key source files.

## TypeDoc (generated)

- `sdk/docs/api/README.md` (entry)
- Common pages:
  - `sdk/docs/api/functions/HsafaChat.md`
  - `sdk/docs/api/functions/HsafaProvider.md`
  - `sdk/docs/api/functions/useHsafaAgent.md`
  - `sdk/docs/api/functions/useChatStorage.md`
  - `sdk/docs/api/functions/useFileUploadHook.md`

## Source references

- Provider: `sdk/src/providers/HsafaProvider.tsx`
- Chat component: `sdk/src/components/HsafaChat.tsx`
- Hooks:
  - `sdk/src/hooks/useHsafaAgent.ts`
  - `sdk/src/hooks/useChatStorage.ts`
  - `sdk/src/hooks/useFileUploadHook.ts`
  - `sdk/src/hooks/useMessageEditor.ts`
  - `sdk/src/hooks/useAutoScroll.ts`
- Tools & UI:
  - `sdk/src/components/hsafa-chat/utils/transport.ts`
  - `sdk/src/components/hsafa-chat/utils/builtInTools.ts`
  - `sdk/src/components/hsafa-chat/utils/builtInUI.tsx`
  - `sdk/src/components/hsafa-chat/utils/renderUserForm.ts`
  - `sdk/src/components/hsafa-chat/hooks/useStreamingToolInput.ts`
- Types:
  - `sdk/src/types/chat.ts`
  - `sdk/src/types/messages.ts`

## Related server code

- Server entry: `server/src/modules/agents/run-agent-handler.ts`
- Server core: `server/src/modules/agents/run-core/*`
- Agent CRUD: `server/src/modules/agents/agent-service.ts`

See also the high-level guide: `sdk/docs/README.md`.
