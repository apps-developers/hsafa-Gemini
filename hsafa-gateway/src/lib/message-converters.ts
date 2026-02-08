import { Prisma } from '@prisma/client';

/**
 * Converts a SmartSpaceMessage record to UI message format.
 * If the message has a uiMessage in metadata, uses that; otherwise constructs one.
 */
export function toUiMessageFromSmartSpaceMessage(m: {
  id: string;
  role: string;
  content: string | null;
  metadata: Prisma.JsonValue | null;
}) {
  const meta = (m.metadata ?? null) as Record<string, unknown> | null;
  const ui = meta && typeof meta === 'object' ? (meta as any).uiMessage : null;
  if (ui && typeof ui === 'object') {
    return ui;
  }

  return {
    id: m.id,
    role: m.role,
    parts: [{ type: 'text', text: m.content ?? '' }],
  };
}

/**
 * Converts UI messages to the format expected by AI SDK's convertToModelMessages.
 * Handles tool-call parts by converting them to dynamic-tool parts with proper state.
 */
export function toAiSdkUiMessages(rawUiMessages: Array<{ id?: string; role?: string; parts?: unknown }>) {
  const toolResultsById = new Map<string, unknown>();
  
  // Collect tool results from ALL messages:
  // - role:'tool' messages with tool-result parts (legacy)
  // - assistant messages with tool-result parts (current: tool-call + tool-result stored together)
  for (const m of rawUiMessages) {
    const parts = Array.isArray(m?.parts) ? (m.parts as any[]) : [];
    for (const p of parts) {
      if (!p || typeof p !== 'object') continue;
      if (p.type === 'tool-result' && typeof p.toolCallId === 'string') {
        toolResultsById.set(p.toolCallId, p.result ?? p.output);
      }
    }
  }

  const out: Array<{ role: 'system' | 'user' | 'assistant'; parts: any[] }> = [];

  for (const m of rawUiMessages) {
    const role = m?.role;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') continue;

    const partsIn = Array.isArray(m.parts) ? (m.parts as any[]) : [];
    const partsOut: any[] = [];

    for (const p of partsIn) {
      if (!p || typeof p !== 'object') continue;

      if (p.type === 'text' && typeof p.text === 'string') {
        partsOut.push({ type: 'text', text: p.text });
        continue;
      }

      if (p.type === 'reasoning' && typeof p.text === 'string') {
        partsOut.push({ type: 'reasoning', text: p.text });
        continue;
      }

      if (p.type === 'tool-call' && typeof p.toolCallId === 'string' && typeof p.toolName === 'string') {
        const input = 'input' in p ? (p as any).input : 'args' in p ? (p as any).args : {};
        const output = toolResultsById.get(p.toolCallId);

        if (output !== undefined) {
          partsOut.push({
            type: 'dynamic-tool',
            toolName: p.toolName,
            toolCallId: p.toolCallId,
            state: 'output-available',
            input,
            output,
          });
        } else {
          partsOut.push({
            type: 'dynamic-tool',
            toolName: p.toolName,
            toolCallId: p.toolCallId,
            state: 'input-available',
            input,
          });
        }

        continue;
      }
    }

    if (partsOut.length === 0) {
      partsOut.push({ type: 'text', text: '' });
    }

    out.push({ role, parts: partsOut });
  }

  return out;
}
