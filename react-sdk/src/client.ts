import type {
  Entity,
  SmartSpace,
  SmartSpaceMembership,
  SmartSpaceMessageRecord,
  JsonValue,
} from './types.js';

export interface CreateHsafaClientOptions {
  gatewayUrl?: string;
  fetchFn?: typeof fetch;
}

export class HsafaHttpError extends Error {
  status: number;
  url: string;
  body: unknown;

  constructor(input: { status: number; url: string; body: unknown; message?: string }) {
    super(input.message ?? `HTTP ${input.status}`);
    this.status = input.status;
    this.url = input.url;
    this.body = input.body;
  }
}

function normalizeGatewayUrl(gatewayUrl?: string): string {
  const raw = (gatewayUrl ?? '').trim();
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

async function fetchJson<T>(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = init;

  const res = await fetchFn(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const text = await res.text();
  const body = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new HsafaHttpError({
      status: res.status,
      url,
      body,
      message: (body as any)?.error || (body as any)?.message || res.statusText,
    });
  }

  return body as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface HsafaClient {
  gatewayUrl: string;
  apiBaseUrl: string;

  listEntities(input?: {
    type?: 'human' | 'agent' | 'system';
    limit?: number;
    offset?: number;
  }): Promise<Entity[]>;

  getEntity(input: { entityId: string }): Promise<Entity>;

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

  listSmartSpaceMembers(input: { smartSpaceId: string }): Promise<Array<SmartSpaceMembership & { entity?: Entity }>>;

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
  }): Promise<{ message: SmartSpaceMessageRecord; runs: Array<{ runId: string; agentEntityId: string }> }>;
}

export function createHsafaClient(options: CreateHsafaClientOptions = {}): HsafaClient {
  const gatewayUrl = normalizeGatewayUrl(options.gatewayUrl);
  const apiBaseUrl = `${gatewayUrl}/api`;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    gatewayUrl,
    apiBaseUrl,

    async listEntities(input = {}) {
      const params = new URLSearchParams();
      if (input.type) params.set('type', input.type);
      if (input.limit != null) params.set('limit', String(input.limit));
      if (input.offset != null) params.set('offset', String(input.offset));

      const qs = params.toString();
      const res = await fetchJson<{ entities: Entity[] }>(
        fetchFn,
        `${apiBaseUrl}/entities${qs ? `?${qs}` : ''}`,
        { method: 'GET' }
      );
      return res.entities;
    },

    async getEntity(input) {
      const res = await fetchJson<{ entity: Entity }>(fetchFn, `${apiBaseUrl}/entities/${input.entityId}`, {
        method: 'GET',
      });
      return res.entity;
    },

    async createHumanEntity(input) {
      const res = await fetchJson<{ entity: Entity }>(fetchFn, `${apiBaseUrl}/entities`, {
        method: 'POST',
        json: {
          type: 'human',
          externalId: input.externalId,
          displayName: input.displayName,
          metadata: input.metadata ?? null,
        },
      });
      return res.entity;
    },

    async createAgentEntity(input) {
      const res = await fetchJson<{ entity: Entity }>(fetchFn, `${apiBaseUrl}/entities/agent`, {
        method: 'POST',
        json: {
          agentId: input.agentId,
          externalId: input.externalId,
          displayName: input.displayName,
          metadata: input.metadata ?? null,
        },
      });
      return res.entity;
    },

    async createSmartSpace(input) {
      const res = await fetchJson<{ smartSpace: SmartSpace }>(fetchFn, `${apiBaseUrl}/smart-spaces`, {
        method: 'POST',
        json: {
          name: input.name,
          description: input.description,
          isPrivate: input.isPrivate,
          metadata: input.metadata ?? null,
        },
      });
      return res.smartSpace;
    },

    async listSmartSpaceMembers(input) {
      const res = await fetchJson<{ members: Array<SmartSpaceMembership & { entity?: Entity }> }>(
        fetchFn,
        `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/members`,
        { method: 'GET' }
      );
      return res.members;
    },

    async addSmartSpaceMember(input) {
      const res = await fetchJson<{ membership: SmartSpaceMembership }>(
        fetchFn,
        `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/members`,
        {
          method: 'POST',
          json: {
            entityId: input.entityId,
            role: input.role,
          },
        }
      );
      return res.membership;
    },

    async listSmartSpaces(input = {}) {
      const params = new URLSearchParams();
      if (input.entityId) params.set('entityId', input.entityId);
      if (input.limit != null) params.set('limit', String(input.limit));
      if (input.offset != null) params.set('offset', String(input.offset));

      const qs = params.toString();
      const res = await fetchJson<{ smartSpaces: SmartSpace[] }>(
        fetchFn,
        `${apiBaseUrl}/smart-spaces${qs ? `?${qs}` : ''}`,
        { method: 'GET' }
      );
      return res.smartSpaces;
    },

    async listSmartSpaceMessages(input) {
      const params = new URLSearchParams();
      if (input.afterSeq) params.set('afterSeq', input.afterSeq);
      if (input.beforeSeq) params.set('beforeSeq', input.beforeSeq);
      if (input.limit != null) params.set('limit', String(input.limit));

      const qs = params.toString();
      const res = await fetchJson<{ messages: SmartSpaceMessageRecord[] }>(
        fetchFn,
        `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/messages${qs ? `?${qs}` : ''}`,
        { method: 'GET' }
      );
      return res.messages;
    },

    async sendSmartSpaceMessage(input) {
      return fetchJson<{ message: SmartSpaceMessageRecord; runs: Array<{ runId: string; agentEntityId: string }> }>(
        fetchFn,
        `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/messages`,
        {
          method: 'POST',
          json: {
            entityId: input.entityId,
            content: input.content,
            metadata: input.metadata ?? null,
          },
        }
      );
    },
  };
}
