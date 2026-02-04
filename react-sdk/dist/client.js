export class HsafaHttpError extends Error {
    constructor(input) {
        super(input.message ?? `HTTP ${input.status}`);
        this.status = input.status;
        this.url = input.url;
        this.body = input.body;
    }
}
function normalizeGatewayUrl(gatewayUrl) {
    const raw = (gatewayUrl ?? '').trim();
    if (!raw)
        return '';
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}
async function fetchJson(fetchFn, url, init = {}) {
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
            message: body?.error || body?.message || res.statusText,
        });
    }
    return body;
}
function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
export function createHsafaClient(options = {}) {
    const gatewayUrl = normalizeGatewayUrl(options.gatewayUrl);
    const apiBaseUrl = `${gatewayUrl}/api`;
    const fetchFn = options.fetchFn ?? fetch;
    return {
        gatewayUrl,
        apiBaseUrl,
        async listEntities(input = {}) {
            const params = new URLSearchParams();
            if (input.type)
                params.set('type', input.type);
            if (input.limit != null)
                params.set('limit', String(input.limit));
            if (input.offset != null)
                params.set('offset', String(input.offset));
            const qs = params.toString();
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/entities${qs ? `?${qs}` : ''}`, { method: 'GET' });
            return res.entities;
        },
        async getEntity(input) {
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/entities/${input.entityId}`, {
                method: 'GET',
            });
            return res.entity;
        },
        async createHumanEntity(input) {
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/entities`, {
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
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/entities/agent`, {
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
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/smart-spaces`, {
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
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/members`, { method: 'GET' });
            return res.members;
        },
        async addSmartSpaceMember(input) {
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/members`, {
                method: 'POST',
                json: {
                    entityId: input.entityId,
                    role: input.role,
                },
            });
            return res.membership;
        },
        async listSmartSpaces(input = {}) {
            const params = new URLSearchParams();
            if (input.entityId)
                params.set('entityId', input.entityId);
            if (input.limit != null)
                params.set('limit', String(input.limit));
            if (input.offset != null)
                params.set('offset', String(input.offset));
            const qs = params.toString();
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/smart-spaces${qs ? `?${qs}` : ''}`, { method: 'GET' });
            return res.smartSpaces;
        },
        async listSmartSpaceMessages(input) {
            const params = new URLSearchParams();
            if (input.afterSeq)
                params.set('afterSeq', input.afterSeq);
            if (input.beforeSeq)
                params.set('beforeSeq', input.beforeSeq);
            if (input.limit != null)
                params.set('limit', String(input.limit));
            const qs = params.toString();
            const res = await fetchJson(fetchFn, `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/messages${qs ? `?${qs}` : ''}`, { method: 'GET' });
            return res.messages;
        },
        async sendSmartSpaceMessage(input) {
            return fetchJson(fetchFn, `${apiBaseUrl}/smart-spaces/${input.smartSpaceId}/messages`, {
                method: 'POST',
                json: {
                    entityId: input.entityId,
                    content: input.content,
                    metadata: input.metadata ?? null,
                },
            });
        },
    };
}
//# sourceMappingURL=client.js.map