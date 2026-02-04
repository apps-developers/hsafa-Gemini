import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createHsafaClient, HsafaHttpError } from './client.js';
export function useHsafaClient(input = {}) {
    const gatewayUrl = input.gatewayUrl ?? '';
    return useMemo(() => createHsafaClient({ gatewayUrl }), [gatewayUrl]);
}
export function useSmartSpaces(client, input = {}) {
    const [smartSpaces, setSmartSpaces] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await client.listSmartSpaces(input);
            setSmartSpaces(res);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setIsLoading(false);
        }
    }, [client, input.entityId, input.limit, input.offset]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { smartSpaces, isLoading, error, refresh };
}
export function useSmartSpaceMembers(client, input) {
    const smartSpaceId = input.smartSpaceId;
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!smartSpaceId)
            return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await client.listSmartSpaceMembers({ smartSpaceId });
            const entities = res.map((m) => m.entity).filter((e) => !!e);
            setMembers(entities);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setIsLoading(false);
        }
    }, [client, smartSpaceId]);
    useEffect(() => {
        setMembers([]);
        setError(null);
        if (!smartSpaceId)
            return;
        refresh();
    }, [smartSpaceId, refresh]);
    const membersById = useMemo(() => {
        const map = {};
        for (const m of members)
            map[m.id] = m;
        return map;
    }, [members]);
    return { members, membersById, isLoading, error, refresh };
}
function parseHsafaEvent(raw) {
    const evt = JSON.parse(raw);
    if (!evt || typeof evt !== 'object')
        throw new Error('Invalid SSE event');
    return evt;
}
export function useSmartSpaceMessages(client, input) {
    const smartSpaceId = input.smartSpaceId;
    const limit = input.limit ?? 50;
    const toolExecutor = input.toolExecutor;
    const [messages, setMessages] = useState([]);
    const [streamingMessages, setStreamingMessages] = useState([]);
    const [streamingToolCalls, setStreamingToolCalls] = useState([]);
    const [pendingToolCalls, setPendingToolCalls] = useState([]);
    const toolExecutorRef = useRef(toolExecutor);
    useEffect(() => {
        toolExecutorRef.current = toolExecutor;
    }, [toolExecutor]);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [lastSeq, setLastSeq] = useState(null);
    const lastSeqRef = useRef(null);
    useEffect(() => {
        lastSeqRef.current = lastSeq;
    }, [lastSeq]);
    const refresh = useCallback(async () => {
        if (!smartSpaceId)
            return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await client.listSmartSpaceMessages({ smartSpaceId, limit });
            setMessages(res);
            const newest = res.length > 0 ? res[res.length - 1] : null;
            setLastSeq(newest?.seq ?? null);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setIsLoading(false);
        }
    }, [client, smartSpaceId, limit]);
    useEffect(() => {
        setMessages([]);
        setStreamingMessages([]);
        setStreamingToolCalls([]);
        setPendingToolCalls([]);
        setLastSeq(null);
        setError(null);
        setIsConnected(false);
        if (!smartSpaceId)
            return;
        refresh();
    }, [smartSpaceId, refresh]);
    useEffect(() => {
        if (!smartSpaceId)
            return;
        const base = client.apiBaseUrl;
        const url = new URL(`${base}/smart-spaces/${smartSpaceId}/stream`, window.location.origin);
        const es = new EventSource(url.toString());
        es.onopen = () => {
            setIsConnected(true);
            const currentLastSeq = lastSeqRef.current;
            client
                .listSmartSpaceMessages({
                smartSpaceId,
                afterSeq: currentLastSeq ?? undefined,
                limit: 200,
            })
                .then((newMsgs) => {
                if (newMsgs.length === 0)
                    return;
                setMessages((prev) => {
                    const existingIds = new Set(prev.map((m) => m.id));
                    const merged = [...prev];
                    for (const m of newMsgs) {
                        if (!existingIds.has(m.id))
                            merged.push(m);
                    }
                    return merged;
                });
                const newest = newMsgs[newMsgs.length - 1];
                setLastSeq(newest.seq);
            })
                .catch(() => { });
        };
        const handleMessage = (evt) => {
            try {
                const parsed = parseHsafaEvent(evt.data);
                const payload = parsed.data;
                const payloadData = (payload?.data ?? null);
                const runId = typeof payload?.runId === 'string'
                    ? payload.runId
                    : typeof payloadData?.runId === 'string'
                        ? payloadData.runId
                        : null;
                const agentEntityId = typeof payload?.agentEntityId === 'string'
                    ? payload.agentEntityId
                    : typeof payloadData?.agentEntityId === 'string'
                        ? payloadData.agentEntityId
                        : null;
                const upsertStreamingMessage = (input) => {
                    setStreamingMessages((prev) => {
                        const idx = prev.findIndex((m) => m.runId === input.runId);
                        // Can't create a placeholder without agentEntityId.
                        if (idx === -1 && !input.agentEntityId)
                            return prev;
                        const base = idx === -1
                            ? {
                                id: `streaming-${input.runId}`,
                                runId: input.runId,
                                entityId: input.agentEntityId,
                                role: 'assistant',
                                parts: [],
                                isStreaming: true,
                            }
                            : prev[idx];
                        let nextParts = base.parts;
                        if (input.appendTextDelta) {
                            const last = nextParts[nextParts.length - 1];
                            if (last && last.type === 'text') {
                                nextParts = [...nextParts.slice(0, -1), { type: 'text', text: last.text + input.appendTextDelta }];
                            }
                            else {
                                nextParts = [...nextParts, { type: 'text', text: input.appendTextDelta }];
                            }
                        }
                        const next = {
                            ...base,
                            parts: nextParts,
                            isStreaming: input.isStreaming ?? base.isStreaming,
                        };
                        if (idx === -1)
                            return [...prev, next];
                        return [...prev.slice(0, idx), next, ...prev.slice(idx + 1)];
                    });
                };
                const upsertStreamingToolCall = (input) => {
                    setStreamingToolCalls((prev) => {
                        const idx = prev.findIndex((t) => t.toolCallId === input.toolCallId);
                        const base = idx === -1
                            ? {
                                id: `toolcall-${input.toolCallId}`,
                                runId: input.runId,
                                toolCallId: input.toolCallId,
                                toolName: input.toolName ?? 'tool',
                                argsText: '',
                                isStreaming: true,
                            }
                            : prev[idx];
                        const next = {
                            ...base,
                            toolName: input.toolName ?? base.toolName,
                            argsText: input.appendDelta ? base.argsText + input.appendDelta : base.argsText,
                            isStreaming: input.isStreaming ?? base.isStreaming,
                        };
                        if (idx === -1)
                            return [...prev, next];
                        return [...prev.slice(0, idx), next, ...prev.slice(idx + 1)];
                    });
                };
                if (parsed.type === 'smartSpace.message') {
                    // A complete message was posted - fetch any new messages after the last *message* seq.
                    // Note: Redis stream seq is not the same as SmartSpaceMessage.seq.
                    const currentLastSeq = lastSeqRef.current;
                    client
                        .listSmartSpaceMessages({
                        smartSpaceId,
                        afterSeq: currentLastSeq ?? undefined,
                        limit: 200,
                    })
                        .then((newMsgs) => {
                        if (newMsgs.length === 0)
                            return;
                        setMessages((prev) => {
                            const existingIds = new Set(prev.map((m) => m.id));
                            const merged = [...prev];
                            for (const m of newMsgs) {
                                if (!existingIds.has(m.id))
                                    merged.push(m);
                            }
                            return merged;
                        });
                        const newest = newMsgs[newMsgs.length - 1];
                        setLastSeq(newest.seq);
                        // Only remove streaming messages when the final assistant text message is persisted.
                        // Tool-call and tool-result messages are also persisted mid-run and should not kill streaming UI.
                        const persistedAssistantTextRunIds = new Set();
                        for (const m of newMsgs) {
                            const rid = m.runId;
                            if (typeof rid !== 'string' || rid.length === 0)
                                continue;
                            if (m.role !== 'assistant')
                                continue;
                            if (typeof m.content === 'string' && m.content.trim().length > 0) {
                                persistedAssistantTextRunIds.add(rid);
                            }
                        }
                        if (persistedAssistantTextRunIds.size > 0) {
                            setStreamingMessages((prev) => prev.filter((sm) => !persistedAssistantTextRunIds.has(sm.runId)));
                        }
                        // Remove streaming tool calls if their toolCallId is now persisted in the DB
                        const persistedToolCallIds = new Set();
                        for (const m of newMsgs) {
                            const uiMessage = m.metadata?.uiMessage;
                            const parts = uiMessage?.parts;
                            if (!Array.isArray(parts))
                                continue;
                            for (const p of parts) {
                                if (p && typeof p === 'object' && p.type === 'tool-call' && typeof p.toolCallId === 'string') {
                                    persistedToolCallIds.add(p.toolCallId);
                                }
                            }
                        }
                        if (persistedToolCallIds.size > 0) {
                            setStreamingToolCalls((prev) => prev.filter((t) => !persistedToolCallIds.has(t.toolCallId)));
                        }
                    })
                        .catch(() => { });
                }
                else if (parsed.type === 'run.created') {
                    // A run started - create streaming message placeholder
                    if (!runId)
                        return;
                    upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
                }
                else if (parsed.type === 'run.started') {
                    // Runs can be restarted (e.g., after client tool results). Ensure placeholder exists.
                    if (!runId)
                        return;
                    upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
                }
                else if (parsed.type === 'run.waiting_tool') {
                    // The run is paused waiting for a tool result.
                    if (!runId)
                        return;
                    upsertStreamingMessage({ runId, agentEntityId, isStreaming: false });
                }
                else if (parsed.type === 'text.delta') {
                    // Streaming content update for a run
                    if (!runId)
                        return;
                    const data = payload.data;
                    const delta = typeof data?.delta === 'string' ? data.delta : null;
                    if (!delta)
                        return;
                    upsertStreamingMessage({ runId, agentEntityId, appendTextDelta: delta, isStreaming: true });
                }
                else if (parsed.type === 'tool.input.start') {
                    if (!runId)
                        return;
                    const data = payload.data;
                    const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
                    const toolName = typeof data?.toolName === 'string' ? data.toolName : null;
                    if (!toolCallId || !toolName)
                        return;
                    // Ensure we have a streaming message container so tool UI can show while args stream.
                    upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
                    upsertStreamingToolCall({ runId, toolCallId, toolName, isStreaming: true });
                }
                else if (parsed.type === 'tool.input.delta') {
                    if (!runId)
                        return;
                    const data = payload.data;
                    const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
                    const delta = typeof data?.delta === 'string' ? data.delta : null;
                    if (!toolCallId || !delta)
                        return;
                    // Ensure we have a streaming message container so tool UI can show while args stream.
                    upsertStreamingMessage({ runId, agentEntityId, isStreaming: true });
                    upsertStreamingToolCall({
                        runId,
                        toolCallId,
                        toolName: undefined,
                        appendDelta: delta,
                        isStreaming: true,
                    });
                }
                else if (parsed.type === 'tool.call') {
                    // A tool call is ready for execution (args fully streamed)
                    if (!runId)
                        return;
                    const data = payload.data;
                    const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
                    const toolName = typeof data?.toolName === 'string' ? data.toolName : null;
                    const args = data?.args ?? {};
                    const executionTarget = typeof data?.executionTarget === 'string' ? data.executionTarget : 'server';
                    if (!toolCallId || !toolName)
                        return;
                    // Mark tool input streaming complete and ensure argsText is populated.
                    upsertStreamingToolCall({
                        runId,
                        toolCallId,
                        toolName,
                        appendDelta: '',
                        isStreaming: false,
                    });
                    // Only handle client-side tools
                    if (executionTarget === 'client') {
                        const pending = {
                            runId,
                            toolCallId,
                            toolName,
                            args,
                            argsText: JSON.stringify(args),
                            status: 'pending',
                        };
                        setPendingToolCalls((prev) => {
                            // Don't add duplicates
                            if (prev.some((p) => p.toolCallId === toolCallId))
                                return prev;
                            return [...prev, pending];
                        });
                        // Auto-execute if toolExecutor is provided
                        if (toolExecutorRef.current) {
                            setPendingToolCalls((prev) => prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'executing' } : p)));
                            toolExecutorRef.current(toolName, args)
                                .then((result) => {
                                setPendingToolCalls((prev) => prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'completed', result } : p)));
                                // Submit result to gateway
                                client.submitToolResult({ runId, callId: toolCallId, result }).catch(() => { });
                            })
                                .catch((err) => {
                                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                                setPendingToolCalls((prev) => prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'error', error: errorMsg } : p)));
                                // Submit error result to gateway
                                client.submitToolResult({ runId, callId: toolCallId, result: { error: errorMsg } }).catch(() => { });
                            });
                        }
                    }
                }
                else if (parsed.type === 'tool.result') {
                    // A tool result was received - remove from pending
                    const data = payload.data;
                    const toolCallId = typeof data?.toolCallId === 'string' ? data.toolCallId : null;
                    if (toolCallId) {
                        setPendingToolCalls((prev) => prev.filter((p) => p.toolCallId !== toolCallId));
                    }
                }
                else if (parsed.type === 'run.completed' || parsed.type === 'run.failed') {
                    // Run finished - mark streaming complete, will be replaced by persisted message
                    if (!runId)
                        return;
                    upsertStreamingMessage({ runId, agentEntityId, isStreaming: false });
                }
            }
            catch {
                // ignore parse errors
            }
        };
        es.addEventListener('hsafa', handleMessage);
        es.onerror = () => {
            setIsConnected(false);
        };
        return () => {
            es.removeEventListener('hsafa', handleMessage);
            es.close();
            setIsConnected(false);
        };
    }, [client, smartSpaceId]);
    const sendMessage = useCallback(async (args) => {
        if (!smartSpaceId)
            return;
        setError(null);
        try {
            await client.sendSmartSpaceMessage({
                smartSpaceId,
                entityId: args.entityId,
                content: args.content,
            });
        }
        catch (e) {
            setError(e);
            if (e instanceof HsafaHttpError)
                throw e;
            throw e;
        }
    }, [client, smartSpaceId]);
    const submitToolResult = useCallback(async (toolCallId, result) => {
        const pending = pendingToolCalls.find((p) => p.toolCallId === toolCallId);
        if (!pending)
            return;
        setPendingToolCalls((prev) => prev.map((p) => (p.toolCallId === toolCallId ? { ...p, status: 'completed', result } : p)));
        await client.submitToolResult({
            runId: pending.runId,
            callId: toolCallId,
            result,
        });
    }, [client, pendingToolCalls]);
    return { messages, streamingMessages, streamingToolCalls, pendingToolCalls, isLoading, isConnected, error, sendMessage, submitToolResult, refresh, lastSeq };
}
//# sourceMappingURL=hooks.js.map