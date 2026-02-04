import type { Entity, SmartSpace, SmartSpaceMembership, SmartSpaceMessageRecord, JsonValue } from './types.js';
export interface CreateHsafaClientOptions {
    gatewayUrl?: string;
    fetchFn?: typeof fetch;
}
export declare class HsafaHttpError extends Error {
    status: number;
    url: string;
    body: unknown;
    constructor(input: {
        status: number;
        url: string;
        body: unknown;
        message?: string;
    });
}
export interface HsafaClient {
    gatewayUrl: string;
    apiBaseUrl: string;
    listEntities(input?: {
        type?: 'human' | 'agent' | 'system';
        limit?: number;
        offset?: number;
    }): Promise<Entity[]>;
    getEntity(input: {
        entityId: string;
    }): Promise<Entity>;
    createHumanEntity(input: {
        externalId?: string;
        displayName?: string;
        metadata?: JsonValue;
    }): Promise<Entity>;
    createAgentEntity(input: {
        agentId: string;
        externalId?: string;
        displayName?: string;
        metadata?: JsonValue;
    }): Promise<Entity>;
    createSmartSpace(input: {
        name?: string;
        description?: string;
        isPrivate?: boolean;
        metadata?: JsonValue;
    }): Promise<SmartSpace>;
    listSmartSpaceMembers(input: {
        smartSpaceId: string;
    }): Promise<Array<SmartSpaceMembership & {
        entity?: Entity;
    }>>;
    addSmartSpaceMember(input: {
        smartSpaceId: string;
        entityId: string;
        role?: string;
    }): Promise<SmartSpaceMembership>;
    listSmartSpaces(input?: {
        entityId?: string;
        limit?: number;
        offset?: number;
    }): Promise<SmartSpace[]>;
    listSmartSpaceMessages(input: {
        smartSpaceId: string;
        afterSeq?: string;
        beforeSeq?: string;
        limit?: number;
    }): Promise<SmartSpaceMessageRecord[]>;
    sendSmartSpaceMessage(input: {
        smartSpaceId: string;
        entityId: string;
        content: string;
        metadata?: JsonValue;
    }): Promise<{
        message: SmartSpaceMessageRecord;
        runs: Array<{
            runId: string;
            agentEntityId: string;
        }>;
    }>;
}
export declare function createHsafaClient(options?: CreateHsafaClientOptions): HsafaClient;
//# sourceMappingURL=client.d.ts.map