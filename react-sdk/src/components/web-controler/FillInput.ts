"use client";

/**
 * FillInput utilities
 *
 * Exports two helpers for programmatically filling inputs while dispatching the
 * same DOM events a user would normally trigger (input/change/click):
 *
 * - FillInput(inputId, value, options?)
 *   Fill a single field by its element id with the provided value.
 *
 * - FillActiveInput(value, options?)
 *   Fill the currently focused field without needing its id.
 *
 * Basic example:
 * ```ts
 * import { FillInput, FillActiveInput } from "./FillInput";
 *
 * // Fill individual fields by id
 * await FillInput("fi_name", "Jane Doe");
 * await FillInput("fi_email", "jane@example.com");
 * await FillInput("fi_role_admin", true);       // radio -> check this option
 * await FillInput("fi_country2", "sa");        // select value
 * await FillInput("fi_tags", ["a", "c"]);     // multi-select values
 * await FillInput("fi_newsletter", true);       // checkbox
 * await FillInput("fi_dob", "1995-05-15");     // date input
 * await FillInput("about", "Hello there");     // contenteditable by id
 *
 * // Fill the currently focused field
 * (document.getElementById("fi_name") as HTMLElement)?.focus();
 * await FillActiveInput("Alice");
 * ```
 *
 * Notes:
 * - Scrolling is disabled; these helpers will not scroll the page.
 * - typingDelayMs is ignored; filling is instantaneous.
 * - For file inputs, pass a File or File[]; browsers may restrict programmatic assignment.
 */

// Utility to fill a form (or any container) by id with data, firing realistic events
// Supported fields: input (text, email, password, number, range, date, time, color, checkbox, radio, file),
// textarea, select (single/multiple), and contenteditable elements.

export type FillInputOptions = {
  typingDelayMs?: number; // deprecated: ignored; filling is instantaneous
  scrollIntoView?: boolean; // deprecated: ignored; no scrolling performed
};

export type FillResult = {
  ok: boolean;
  filled: Array<{ key: string; status: "ok" | "skipped" | "error"; message?: string }>;
  errors?: string[];
};

function isHTMLElement(n: Element | null | undefined): n is HTMLElement {
  return !!n && n.nodeType === 1;
}

function looksLikeSelector(key: string) {
  return /[#.\[\] :]/.test(key);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function dispatch(el: Element, type: string) {
  el.dispatchEvent(new Event(type, { bubbles: true }));
}

function setTextLike(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
  if (setter) setter.call(el, value);
  else (el as any).value = value;
  dispatch(el, "input");
}

async function typeText(el: HTMLInputElement | HTMLTextAreaElement, value: string, delayMs: number) {
  el.focus();
  // clear existing value by selecting and deleting
  setTextLike(el, "");
  for (const ch of value.split("")) {
    const prev = (el as any).value as string;
    setTextLike(el, prev + ch);
    if (delayMs > 0) await delay(delayMs);
  }
  dispatch(el, "change");
  (el as any).blur?.();
}

// scrolling intentionally disabled in FillInput/FillActiveInput

// findFields no longer needed for single-element FillInput

function setCheckbox(el: HTMLInputElement, value: boolean) {
  if (el.checked !== value) {
    el.click(); // clicking fires the right sequence (pointer/mouse/input/change)
  }
}

function setRadio(group: HTMLInputElement[], value: string) {
  const target = group.find((r) => r.value === String(value));
  if (target && !target.checked) target.click();
}

function setSelectSingle(el: HTMLSelectElement, value: string | number | { label?: string; index?: number }) {
  if (typeof value === "object" && value && "index" in value && typeof value.index === "number") {
    el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, value.index));
  } else if (typeof value === "object" && value && "label" in value && typeof value.label === "string") {
    const i = Array.from(el.options).findIndex((o) => o.text === value.label);
    el.selectedIndex = i >= 0 ? i : 0;
  } else {
    el.value = String(value);
  }
  dispatch(el, "input");
  dispatch(el, "change");
}

function setSelectMultiple(el: HTMLSelectElement, values: Array<string | number>) {
  const setVals = new Set(values.map(String));
  Array.from(el.options).forEach((opt) => {
    opt.selected = setVals.has(opt.value) || setVals.has(opt.text);
  });
  dispatch(el, "input");
  dispatch(el, "change");
}

function coerceDate(v: any): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // assume string 'YYYY-MM-DD' or other
  return String(v);
}

function setFiles(el: HTMLInputElement, files: File | File[]) {
  const list = Array.isArray(files) ? files : [files];
  const dt = new DataTransfer();
  for (const f of list) dt.items.add(f);
  Object.defineProperty(el, "files", { value: dt.files, configurable: true });
  dispatch(el, "input");
  dispatch(el, "change");
}

// The FillInput function has been removed to enforce using FillActiveInput only.

export async function FillActiveInput(value: any, options: FillInputOptions = {}): Promise<FillResult> {
  let el = (document.activeElement as Element | null) || null;
  // If focus is within a shadow root or child, try to find the nearest contenteditable host
  if (el && isHTMLElement(el)) {
    const ce = (el as HTMLElement).closest('[contenteditable="true"], [contenteditable=""]') as HTMLElement | null;
    if (ce) el = ce;
  }

  if (!el || el === document.body) {
    return { ok: false, filled: [{ key: "active", status: "skipped", message: "No active input element" }], errors: ["No active input element"] };
  }

  try {
    const tag = el.tagName.toLowerCase();

    if (tag === "input") {
      const inp = el as HTMLInputElement;
      const type = (inp.type || "text").toLowerCase();
      if (type === "checkbox") {
        setCheckbox(inp, Boolean(value));
      } else if (type === "radio") {
        const name = inp.name;
        if (name && value != null && String(inp.value) !== String(value)) {
          const alt = document.querySelector(`input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(String(value))}"]`) as HTMLInputElement | null;
          if (alt) alt.click();
          else inp.click(); // fallback to clicking the active one
        } else {
          inp.click();
        }
      } else if (type === "file") {
        if (value instanceof File || (Array.isArray(value) && value.every((v) => v instanceof File))) {
          setFiles(inp, value as any);
        } else {
          return { ok: false, filled: [{ key: "active", status: "skipped", message: "Provide File or File[] for file input" }], errors: ["Provide File or File[] for file input"] };
        }
      } else {
        const vStr = type === "date" ? coerceDate(value) : String(value ?? "");
        setTextLike(inp, vStr);
        dispatch(inp, "change");
      }
      return { ok: true, filled: [{ key: "active", status: "ok" }] };
    }

    if (tag === "textarea") {
      const ta = el as HTMLTextAreaElement;
      const vStr = String(value ?? "");
      setTextLike(ta, vStr);
      dispatch(ta, "change");
      return { ok: true, filled: [{ key: "active", status: "ok" }] };
    }

    if (tag === "select") {
      const sel = el as HTMLSelectElement;
      if (sel.multiple) setSelectMultiple(sel, Array.isArray(value) ? value : [value]);
      else setSelectSingle(sel, value);
      return { ok: true, filled: [{ key: "active", status: "ok" }] };
    }

    // contenteditable
    if (isHTMLElement(el) && (el as HTMLElement).isContentEditable) {
      const host = el as HTMLElement;
      host.focus();
      host.textContent = String(value ?? "");
      dispatch(host, "input");
      dispatch(host, "change");
      (host as any).blur?.();
      return { ok: true, filled: [{ key: "active", status: "ok" }] };
    }

    return { ok: false, filled: [{ key: "active", status: "skipped", message: `Unsupported active element: ${tag}` }], errors: [`Unsupported active element: ${tag}`] };
  } catch (e: any) {
    return { ok: false, filled: [{ key: "active", status: "error", message: e?.message ?? String(e) }], errors: [e?.message ?? String(e)] };
  }
}

// Optional: expose globally for easy console testing in the demo
if (typeof window !== "undefined") {
  (window as any).FillActiveInput = FillActiveInput;
}
