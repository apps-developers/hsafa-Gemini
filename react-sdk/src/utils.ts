import type { SmartSpaceMessageRecord, SmartSpaceStreamMessage } from './types.js';

export function smartSpaceMessageToText(m: SmartSpaceMessageRecord): string {
  if (m.content != null && String(m.content).length > 0) return String(m.content);

  const uiMessage = (m.metadata as any)?.uiMessage;
  const parts = uiMessage?.parts;
  if (!Array.isArray(parts)) return '';

  const texts: string[] = [];
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    if (p.type === 'text') {
      texts.push(String(p.text ?? ''));
    } else if (p.type === 'tool-call') {
      texts.push(`[tool-call ${String(p.toolName ?? '')}]`);
    } else if (p.type === 'tool-result') {
      texts.push(`[tool-result ${String(p.toolName ?? '')}]`);
    }
  }

  return texts.join(' ');
}

export function smartSpaceStreamPartsToText(parts: SmartSpaceStreamMessage['parts']): string {
  const texts: string[] = [];
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    if (p.type === 'text') texts.push(p.text);
  }
  return texts.join('');
}
