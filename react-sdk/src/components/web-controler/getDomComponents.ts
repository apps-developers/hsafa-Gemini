"use client";

/**
 * getDomComponents - Scan and analyze all interactive DOM elements inside ContentContainer
 * 
 * Returns a structured list of all inputs, buttons, links, and interactive elements
 * that the agent can interact with using the web controller tools.
 */

export interface DomComponent {
  id: string | null;
  tag: string;
  type?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: string | boolean | string[];
  options?: Array<{ value: string; label: string; selected: boolean; disabled: boolean }>; // for selects
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  text?: string;
  href?: string;
  role?: string;
  ariaLabel?: string;
  selector?: string;
  isVisible: boolean;
  isInteractive: boolean;
}

export interface GetDomComponentsOptions {
  includeHidden?: boolean;
  selector?: string;
  what?: 'inputs' | 'content';
  limit?: number; // max number of components to return (default 50)
}

export interface GetDomComponentsResult {
  ok: boolean;
  components: DomComponent[];
  count: number;
  total: number; // total components before limiting
  truncated?: boolean; // true if limited
  containerFound: boolean;
  error?: string;
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  const style = window.getComputedStyle(el);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    el.offsetParent !== null
  );
}

function getElementLabel(el: Element): string | undefined {
  // Check for associated label
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent?.trim();
  }
  
  // Check for parent label
  const parentLabel = el.closest('label');
  if (parentLabel) {
    // Get label text excluding the input's own text
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const input = clone.querySelector('input, select, textarea');
    if (input) input.remove();
    return clone.textContent?.trim();
  }
  
  return undefined;
}

function getElementText(el: Element): string | undefined {
  if (el.textContent && el.textContent.trim()) {
    return el.textContent.trim().slice(0, 100); // Limit to 100 chars
  }
  return undefined;
}

function getElementValue(el: Element): string | boolean | string[] | undefined {
  if (el instanceof HTMLInputElement) {
    const type = el.type.toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      return el.checked;
    }
    return el.value;
  }
  
  if (el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  
  if (el instanceof HTMLSelectElement) {
    if (el.multiple) {
      return Array.from(el.selectedOptions).map(opt => opt.value);
    }
    return el.value;
  }
  
  if (el instanceof HTMLElement && el.isContentEditable) {
    return el.textContent || undefined;
  }
  
  return undefined;
}

function getUniqueSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  
  // Build a path-based selector
  const path: string[] = [];
  let current: Element | null = el;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c.trim()).slice(0, 2);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    // Add nth-child if needed for uniqueness
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child: Element) => child.tagName === (current as Element).tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = parent;
  }
  
  return path.slice(-3).join(' > '); // Last 3 levels for brevity
}

export async function getDomComponents(options: GetDomComponentsOptions = {}): Promise<GetDomComponentsResult> {
  try {
    const { includeHidden = false, selector, what = 'content', limit } = options;
    
    // Find ContentContainer
    const contentContainer = document.querySelector('.hsafa-content-container');
    
    if (!contentContainer) {
      return {
        ok: false,
        components: [],
        count: 0,
        total: 0,
        containerFound: false,
        error: 'ContentContainer not found on page. Make sure you have wrapped your app with <ContentContainer>.'
      };
    }
    
    // Determine search scope
    const searchScope = selector 
      ? contentContainer.querySelector(selector) || contentContainer
      : contentContainer;
    
    const components: DomComponent[] = [];
    
    // Build selectors based on requested scope
    let selectors: string[] = [];
    if (what === 'inputs') {
      selectors = [
        'input', 'textarea', 'select', '[contenteditable="true"]', '[contenteditable=""]'
      ];
    } else {
      // content (default): semantic structure + rich content + interactive elements
      selectors = [
        // Structural regions
        'header','nav','main','section','article','aside','footer',
        // Headings and text
        'h1','h2','h3','h4','h5','h6','p',
        // Media and lists
        'img[alt]','ul','ol','li',
        // Tables
        'table','thead','tbody','tr','td','th',
        // Forms and labels
        'form','label',
        // Inputs and editable content
        'input','textarea','select','[contenteditable="true"]','[contenteditable=""]',
        // Interactive
        'a[href]','button','[role="button"]','[role="link"]','[onclick]','[tabindex]',
        // Containers (last to avoid flooding low-importance items)
        'div'
      ];
    }
    
    const elements = searchScope.querySelectorAll(selectors.join(', '));
    
    elements.forEach((el) => {
      const visible = isVisible(el);
      
      // Skip hidden elements unless requested
      if (!visible && !includeHidden) return;
      
      const component: DomComponent = {
        id: el.id || null,
        tag: el.tagName.toLowerCase(),
        className: el.className && typeof el.className === 'string' ? el.className : undefined,
        isVisible: visible,
        isInteractive: true,
        selector: getUniqueSelector(el)
      };
      
      // Add type-specific properties
      if (el instanceof HTMLInputElement) {
        component.type = el.type;
        component.name = el.name || undefined;
        component.placeholder = el.placeholder || undefined;
        component.value = getElementValue(el);
        component.checked = el.type === 'checkbox' || el.type === 'radio' ? el.checked : undefined;
        component.disabled = el.disabled;
        component.required = el.required;
      } else if (el instanceof HTMLTextAreaElement) {
        component.name = el.name || undefined;
        component.placeholder = el.placeholder || undefined;
        component.value = getElementValue(el);
        component.disabled = el.disabled;
        component.required = el.required;
      } else if (el instanceof HTMLSelectElement) {
        component.name = el.name || undefined;
        component.value = getElementValue(el);
        component.disabled = el.disabled;
        component.required = el.required;
        component.options = Array.from(el.options).map(opt => ({
          value: opt.value,
          label: opt.text,
          selected: opt.selected,
          disabled: opt.disabled
        }));
      } else if (el instanceof HTMLButtonElement) {
        component.type = el.type;
        component.disabled = el.disabled;
        component.text = getElementText(el);
      } else if (el instanceof HTMLAnchorElement) {
        component.href = el.href;
        component.text = getElementText(el);
      } else if (el instanceof HTMLImageElement) {
        component.text = el.alt || undefined;
        component.label = el.alt || component.label;
      } else {
        component.text = getElementText(el);
      }
      
      // Add label and ARIA
      component.label = getElementLabel(el);
      component.role = el.getAttribute('role') || undefined;
      component.ariaLabel = el.getAttribute('aria-label') || undefined;
      
      components.push(component);
    });
    
    // Sort: tailor importance based on requested 'what'
    const importance = (c: DomComponent) => {
      if (!c.isVisible) return 0;
      if (what === 'inputs') {
        if (c.tag === 'input' || c.tag === 'textarea' || c.tag === 'select' || c.role === 'textbox') return 3;
        if (c.tag === 'button' || c.tag === 'a') return 2;
        return 1;
      }
      // content (default)
      if (['header','nav','main','footer'].includes(c.tag)) return 5;
      if (['section','article','aside'].includes(c.tag)) return 4;
      if (['h1','h2','h3'].includes(c.tag)) return 4;
      if (['h4','h5','h6'].includes(c.tag)) return 3;
      if (c.tag === 'form') return 4;
      if (c.tag === 'label') return 3;
      if (c.tag === 'input' || c.tag === 'textarea' || c.tag === 'select') return 4;
      if (c.tag === 'p' || c.tag === 'img') return 3;
      if (c.tag === 'button' || c.tag === 'a') return 3;
      return 1;
    };
    
    components.sort((a, b) => importance(b) - importance(a));
    const total = components.length;
    const defaultLimit = what === 'inputs' ? 100 : 150;
    const maxItems = Math.max(1, Math.min(200, typeof limit === 'number' ? Math.floor(limit) : defaultLimit));
    const truncated = total > maxItems;
    const limited = truncated ? components.slice(0, maxItems) : components;
    return {
      ok: true,
      components: limited,
      count: limited.length,
      total,
      truncated,
      containerFound: true
    };
  } catch (error: any) {
    return {
      ok: false,
      components: [],
      count: 0,
      total: 0,
      containerFound: false,
      error: error?.message || String(error)
    };
  }
}

// Expose globally for console testing
if (typeof window !== 'undefined') {
  (window as any).getDomComponents = getDomComponents;
}

