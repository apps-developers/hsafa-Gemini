import { type HsafaClient } from './client.js';
import type { Entity, SmartSpace, SmartSpaceMessageRecord, SmartSpaceStreamMessage, PendingToolCall } from './types.js';
export declare function useHsafaClient(input?: {
    gatewayUrl?: string;
}): HsafaClient;
export declare function useSmartSpaces(client: HsafaClient, input?: {
    entityId?: string;
    limit?: number;
    offset?: number;
}): {
    smartSpaces: SmartSpace[];
    isLoading: boolean;
    error: unknown;
    refresh: () => Promise<void>;
};
export declare function useSmartSpaceMembers(client: HsafaClient, input: {
    smartSpaceId: string | null;
}): {
    members: Entity[];
    membersById: Record<string, Entity>;
    isLoading: boolean;
    error: unknown;
    refresh: () => Promise<void>;
};
interface StreamingMessage {
    id: string;
    runId: string;
    entityId: string;
    role: string;
    parts: SmartSpaceStreamMessage['parts'];
    isStreaming: boolean;
}
export interface StreamingToolCall {
    id: string;
    runId: string;
    toolCallId: string;
    toolName: string;
    argsText: string;
    isStreaming: boolean;
}
export type ToolExecutor = (toolName: string, args: unknown) => Promise<unknown>;
export declare function useSmartSpaceMessages(client: HsafaClient, input: {
    smartSpaceId: string | null;
    limit?: number;
    toolExecutor?: ToolExecutor;
}): {
    messages: SmartSpaceMessageRecord[];
    streamingMessages: StreamingMessage[];
    streamingToolCalls: StreamingToolCall[];
    pendingToolCalls: PendingToolCall[];
    isLoading: boolean;
    isConnected: boolean;
    error: unknown;
    sendMessage: (args: {
        entityId: string;
        content: string;
    }) => Promise<void>;
    submitToolResult: (toolCallId: string, result: unknown) => Promise<void>;
    refresh: () => Promise<void>;
    lastSeq: string | null;
};
export {};
//# sourceMappingURL=hooks.d.ts.map