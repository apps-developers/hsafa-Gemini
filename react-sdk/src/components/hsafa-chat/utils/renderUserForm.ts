export type FormState = { submitted?: boolean; skipped?: boolean; values?: Record<string, any> };

export function renderOrUpdateUserForm(
  input: any,
  toolCallId: string,
  hosts: Map<string, HTMLDivElement>,
  states: Map<string, FormState>,
  addToolResult: (payload: { tool: string; toolCallId: string; output: any }) => void,
  colors?: Record<string, string>
) {
  let host = hosts.get(toolCallId);
  if (!host) {
    host = document.createElement('div');
    host.className = 'hsafa-inline-form';
    const toolHost = document.querySelector(`[data-get-from-user-host="${toolCallId}"]`) as HTMLElement | null;
    if (toolHost) {
      toolHost.innerHTML = '';
      toolHost.appendChild(host);
    } else {
      const chatEl = document.querySelector('.chat-scroll-container');
      (chatEl || document.body).appendChild(host);
    }
    hosts.set(toolCallId, host);
  } else {
    const currentParent = host.parentElement;
    const toolHost = document.querySelector(`[data-get-from-user-host="${toolCallId}"]`) as HTMLElement | null;
    if (toolHost && currentParent !== toolHost) {
      try { currentParent?.removeChild(host); } catch {}
      toolHost.innerHTML = '';
      toolHost.appendChild(host);
    }
  }

  const title = input?.title || 'Provide input';
  const description = input?.description || '';
  const submitLabel = input?.submitLabel || 'Submit';
  const skipLabel = input?.skipLabel || 'Skip';
  const fields = Array.isArray(input?.fields)
    ? input.fields
    : (input?.label || input?.placeholder)
      ? [{ id: 'value', label: input?.label || 'Value', type: 'text', placeholder: input?.placeholder || '' }]
      : [];

  const existingState = states.get(toolCallId) || { submitted: false, skipped: false, values: undefined };

  host.innerHTML = '';
  const form = document.createElement('form');
  form.style.margin = '12px 0';
  form.style.padding = '14px';
  form.style.border = '1px solid var(--hsafa-border, #2A2C33)';
  form.style.borderRadius = '12px';
  form.style.background = 'var(--hsafa-card, #121318)';
  form.style.color = 'var(--hsafa-text, #EDEEF0)';
  form.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';

  const h = document.createElement('div');
  h.style.fontWeight = '600';
  h.style.marginBottom = '6px';
  h.textContent = title;
  form.appendChild(h);

  if (description) {
    const d = document.createElement('div');
    d.style.fontSize = '12px';
    d.style.opacity = '0.8';
    d.style.marginBottom = '10px';
    d.textContent = description;
    form.appendChild(d);
  }

  fields.forEach((f: any) => {
    const wrap = document.createElement('div');
    wrap.style.margin = '10px 0';
    if (f.label) {
      const lab = document.createElement('label');
      lab.style.display = 'block';
      lab.style.fontSize = '12px';
      lab.style.marginBottom = '6px';
      lab.style.opacity = '0.9';
      lab.textContent = f.label;
      wrap.appendChild(lab);
    }
    let inputEl: HTMLElement;
    const type = (f.type || 'text').toLowerCase();
    if (type === 'textarea') {
      const el = document.createElement('textarea');
      el.placeholder = f.placeholder || '';
      (el as any).value = f.value ?? '';
      el.style.width = '100%';
      el.style.minHeight = '72px';
      el.style.padding = '10px 12px';
      el.style.border = '1px solid var(--hsafa-border, #2A2C33)';
      el.style.borderRadius = '10px';
      el.style.background = 'var(--hsafa-input-bg, #17181C)';
      el.style.color = 'inherit';
      inputEl = el;
    } else if (type === 'select' && Array.isArray(f.options)) {
      const el = document.createElement('select');
      el.style.width = '100%';
      el.style.padding = '10px 12px';
      el.style.border = '1px solid var(--hsafa-border, #2A2C33)';
      el.style.borderRadius = '10px';
      el.style.background = 'var(--hsafa-input-bg, #17181C)';
      el.style.color = 'inherit';
      f.options.forEach((opt: any) => {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.text = String(opt.label ?? opt.value);
        el.appendChild(o);
      });
      (el as any).value = f.value ?? '';
      inputEl = el;
    } else if (type === 'checkbox') {
      const el = document.createElement('input');
      el.type = 'checkbox';
      (el as any).checked = !!f.value;
      el.style.transform = 'scale(1.1)';
      inputEl = el;
    } else {
      const el = document.createElement('input');
      el.type = type as any;
      el.placeholder = f.placeholder || '';
      (el as any).value = f.value ?? '';
      el.style.width = '100%';
      el.style.padding = '10px 12px';
      el.style.border = '1px solid var(--hsafa-border, #2A2C33)';
      el.style.borderRadius = '10px';
      el.style.background = 'var(--hsafa-input-bg, #17181C)';
      el.style.color = 'inherit';
      inputEl = el;
    }
    const fieldId = f.id || 'value';
    (inputEl as any).dataset.fieldId = fieldId;
    const savedVal = existingState.values && Object.prototype.hasOwnProperty.call(existingState.values, fieldId)
      ? (existingState.values as any)[fieldId]
      : undefined;
    if (typeof savedVal !== 'undefined') {
      if ((inputEl as HTMLInputElement).type === 'checkbox') {
        (inputEl as HTMLInputElement).checked = !!savedVal;
      } else {
        (inputEl as HTMLInputElement).value = String(savedVal);
      }
    }
    if (existingState.submitted || existingState.skipped) {
      (inputEl as any).setAttribute('disabled', 'true');
      (inputEl as any).style.opacity = '0.7';
    }
    wrap.appendChild(inputEl);
    form.appendChild(wrap);
  });

  const trimmedSubmit = String(submitLabel || '').trim();
  const trimmedSkip = String(skipLabel || '').trim();
  const showActions = Boolean(trimmedSubmit || trimmedSkip);
  let submitBtn: HTMLButtonElement | null = null;
  let skipBtn: HTMLButtonElement | null = null;
  if (showActions) {
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '10px';
    submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = trimmedSubmit || 'Submit';
    submitBtn.style.padding = '6px 10px';
    submitBtn.style.borderRadius = '8px';
    submitBtn.style.background = 'var(--hsafa-button-bg, var(--hsafa-primary, #2563eb))';
    submitBtn.style.color = '#000000';
    skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.textContent = trimmedSkip || 'Skip';
    skipBtn.style.padding = '6px 10px';
    skipBtn.style.borderRadius = '8px';
    skipBtn.style.background = 'transparent';
    skipBtn.style.border = '1px solid var(--hsafa-border, #2A2C33)';
    skipBtn.style.color = 'inherit';
    actions.appendChild(submitBtn);
    actions.appendChild(skipBtn);
    form.appendChild(actions);
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const data: Record<string, any> = {};
    form.querySelectorAll('[data-field-id]').forEach((el) => {
      const id = (el as HTMLElement).dataset.fieldId || 'value';
      if ((el as HTMLInputElement).type === 'checkbox') data[id] = (el as HTMLInputElement).checked;
      else data[id] = (el as HTMLInputElement).value ?? '';
    });
    states.set(toolCallId, { submitted: true, skipped: false, values: data });
    addToolResult({ tool: 'requestInput', toolCallId, output: { success: true, submitted: true, values: data } });
    form.querySelectorAll('[data-field-id]').forEach((el) => { (el as HTMLInputElement).disabled = true; (el as HTMLInputElement).style.opacity = '0.7'; });
    if (submitBtn) { submitBtn.textContent = `${trimmedSubmit || 'Submit'} ✓`; submitBtn.style.opacity = '0.8'; (submitBtn as any).disabled = true; }
    if (skipBtn) (skipBtn as any).disabled = true;
  };
  if (skipBtn) {
    skipBtn.onclick = () => {
      states.set(toolCallId, { submitted: false, skipped: true, values: undefined });
      addToolResult({ tool: 'requestInput', toolCallId, output: { success: true, submitted: false, skipped: true } });
      form.querySelectorAll('[data-field-id]').forEach((el) => { (el as HTMLInputElement).disabled = true; (el as HTMLInputElement).style.opacity = '0.7'; });
      if (skipBtn) { skipBtn.textContent = `${trimmedSkip || 'Skip'} ✓`; skipBtn.style.opacity = '0.8'; (skipBtn as any).disabled = true; }
      if (submitBtn) (submitBtn as any).disabled = true;
    };
  }

  if (existingState.submitted || existingState.skipped) {
    const status = document.createElement('div');
    status.style.marginTop = '10px';
    status.style.fontSize = '12px';
    status.style.display = 'flex';
    status.style.alignItems = 'center';
    status.style.gap = '8px';
    const badge = document.createElement('span');
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.padding = '2px 8px';
    badge.style.borderRadius = '999px';
    badge.style.fontWeight = '600';
    badge.style.fontSize = '11px';
    if (existingState.submitted) { badge.style.background = 'rgba(16,185,129,0.15)'; badge.style.color = '#10b981'; badge.textContent = 'Submitted'; }
    else { badge.style.background = 'rgba(234,179,8,0.15)'; badge.style.color = '#eab308'; badge.textContent = 'Skipped'; }
    status.appendChild(badge);
    form.appendChild(status);

    // Ensure action buttons are disabled and labels updated on hydration
    try {
      if (submitBtn) {
        (submitBtn as any).disabled = true;
        submitBtn.style.opacity = '0.8';
        if (existingState.submitted) submitBtn.textContent = `${trimmedSubmit || 'Submit'} ✓`;
      }
      if (skipBtn) {
        (skipBtn as any).disabled = true;
        skipBtn.style.opacity = '0.8';
        if (existingState.skipped) skipBtn.textContent = `${trimmedSkip || 'Skip'} ✓`;
      }
    } catch {}
  }
  host.appendChild(form);
}


