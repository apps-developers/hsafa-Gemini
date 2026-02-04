export function extractMessageParts(m) {
    if (m.content != null && String(m.content).length > 0) {
        return [{ type: 'text', text: String(m.content) }];
    }
    const uiMessage = m.metadata?.uiMessage;
    const parts = uiMessage?.parts;
    if (!Array.isArray(parts))
        return [];
    const result = [];
    for (const p of parts) {
        if (!p || typeof p !== 'object')
            continue;
        if (p.type === 'text') {
            result.push({ type: 'text', text: String(p.text ?? '') });
        }
        else if (p.type === 'tool-call') {
            result.push({
                type: 'tool-call',
                toolCallId: String(p.toolCallId ?? ''),
                toolName: String(p.toolName ?? ''),
                args: p.input ?? p.args ?? {},
            });
        }
        else if (p.type === 'tool-result') {
            result.push({
                type: 'tool-result',
                toolCallId: String(p.toolCallId ?? ''),
                toolName: String(p.toolName ?? ''),
                result: p.output ?? p.result ?? {},
            });
        }
    }
    return result;
}
export function smartSpaceMessageToText(m) {
    if (m.content != null && String(m.content).length > 0)
        return String(m.content);
    const uiMessage = m.metadata?.uiMessage;
    const parts = uiMessage?.parts;
    if (!Array.isArray(parts))
        return '';
    const texts = [];
    for (const p of parts) {
        if (!p || typeof p !== 'object')
            continue;
        if (p.type === 'text') {
            texts.push(String(p.text ?? ''));
        }
        else if (p.type === 'tool-call') {
            texts.push(`[tool-call ${String(p.toolName ?? '')}]`);
        }
        else if (p.type === 'tool-result') {
            texts.push(`[tool-result ${String(p.toolName ?? '')}]`);
        }
    }
    return texts.join(' ');
}
export function smartSpaceStreamPartsToText(parts) {
    const texts = [];
    for (const p of parts) {
        if (!p || typeof p !== 'object')
            continue;
        if (p.type === 'text')
            texts.push(p.text);
    }
    return texts.join('');
}
//# sourceMappingURL=utils.js.map