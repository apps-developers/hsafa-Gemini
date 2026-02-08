// Provider
export { HsafaChatProvider, type HsafaChatProviderProps } from "./HsafaProvider";

// Prebuilt components
export { HsafaChat, type HsafaChatProps } from "./components/HsafaChat";
export { HsafaThread, type HsafaThreadProps } from "./components/HsafaThread";
export { HsafaModal, type HsafaModalProps } from "./components/HsafaModal";
export {
  ReasoningPart,
  type ReasoningPartProps,
} from "./components/HsafaReasoning";
export {
  ToolCallPart,
  type ToolCallPartProps,
} from "./components/HsafaToolCall";

// Runtime bridge
export {
  useHsafaChatRuntime,
  type UseHsafaChatRuntimeOptions,
  type UseHsafaChatRuntimeReturn,
} from "./useHsafaRuntime";

// Members context
export { MembersProvider, useMembers } from "./contexts";

// Re-export commonly used types from react-sdk for convenience
export type {
  HsafaClient,
  Entity,
  SmartSpace,
  SmartSpaceMessage,
} from "@hsafa/react-sdk";
