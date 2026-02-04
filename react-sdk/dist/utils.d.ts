import type { SmartSpaceMessageRecord, SmartSpaceStreamMessage } from './types.js';
export type MessagePart = {
    type: 'text';
    text: string;
} | {
    type: 'tool-call';
    toolCallId: string;
    toolName: string;
    args: unknown;
} | {
    type: 'tool-result';
    toolCallId: string;
    toolName: string;
    result: unknown;
};
export declare function extractMessageParts(m: SmartSpaceMessageRecord): MessagePart[];
export declare function smartSpaceMessageToText(m: SmartSpaceMessageRecord): string;
export declare function smartSpaceStreamPartsToText(parts: SmartSpaceStreamMessage['parts']): string;
//# sourceMappingURL=utils.d.ts.map