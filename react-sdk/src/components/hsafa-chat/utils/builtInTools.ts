import { getDomComponents, guideCursor, FillActiveInput } from "../../web-controler";

export function createBuiltInTools() {
  return {
    getDomComponents: {
      tool: async ({ includeHidden, selector }: any) => {
        return await getDomComponents({ includeHidden, selector });
      },
      executeEachToken: false,
    },
    controlCursor: {
      tool: async ({ target, action, anchor, durationMs, dragTo }: any) => {
        const res = await guideCursor(target, { action, anchor, durationMs, dragTo });
        if (res && res.ok) {
          const last = Array.isArray(res.steps) && res.steps.length ? res.steps[res.steps.length - 1] : undefined;
          const clicked = last?.clickedElementId ? ` (clicked element id: ${last.clickedElementId})` : '';
          const act = action || last?.action || 'none';
          return { success: true, message: act === 'click' ? `Cursor moved and clicked successfully${clicked}` : act === 'drag' ? `Cursor dragged successfully` : `Cursor moved successfully`, details: res };
        }
        return { success: false, message: 'Cursor action failed', details: res };
      },
      executeEachToken: false,
    },
    fillActiveInput: {
      tool: async ({ value }: any) => {
        const res = await FillActiveInput(value);
        return { success: !!res?.ok, message: res?.ok ? 'Active input filled successfully' : (res?.errors?.[0] || 'Failed to fill active input'), details: res };
      },
      executeEachToken: true,
    },
    requestInput: {
      tool: async (_: any) => ({ ok: true }),
      executeEachToken: true,
    },
  } as Record<string, any>;
}


