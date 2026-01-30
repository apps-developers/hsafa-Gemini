"use client";

import React, { useEffect } from "react";
import { createRoot, Root } from "react-dom/client";

/**
 * CursorController
 *
 * Mount this component once on a page (e.g. in the demo at `/demo`). It registers a
 * global function `window.__cursorGuide(stepsOrTarget, options?)` that moves a fake
 * cursor to a target and optionally performs actions (click, drag).
 *
 * In `app/demo/page.tsx`, a convenience wrapper `guideCursorTo(targetOrSteps, options?)`
 * is also exported and exposed globally as `window.guideCursorTo`.
 *
 * Quick examples (run in DevTools on /demo):
 * ```js
 * // Move to a screen position
 * await window.guideCursorTo({ position: { x: 140, y: 160 } }, { durationMs: 700 });
 *
 * // Click an element by selector or id
 * await window.guideCursorTo('#submitBtn', { action: 'click', anchor: 'center' });
 *
 * // Drag from one element to another
 * await window.guideCursorTo({ selector: '#cardBacklog0' }, { action: 'drag', dragTo: '#doingDrop' });
 *
 * // Multi-step sequence
 * await window.guideCursorTo([
 *   { target: '#tabStats', action: 'click', options: { durationMs: 600 } },
 *   { target: { position: { x: 100, y: 120 } } },
 *   { target: '#progressStartBtn', action: 'click' },
 * ]);
 * ```
 *
 * Options highlights (see `GuideOptions`):
 * - action: 'none' | 'click' | 'drag'
 * - durationMs, easing: control motion speed/curve
 * - path: 'straight' | 'curve', curveStrength, curveDirection
 * - anchor: where inside the element to aim (e.g. 'center', 'top-left' or {x:0..1,y:0..1})
 * - cursorHotspot: px offset to the click location
 * - dragTo: target for drag action
 */

// Types for the public API
export type GuideAction = "none" | "click" | "drag";

export type GuideTarget =
  | string // id or selector (resolved as id first)
  | Element
  | { selector: string; nth?: number; within?: Element | string }
  | { position: { x: number; y: number } };

export type Anchor = "center" | "top-left" | "bottom-right" | { x: number; y: number };

export type GuideOptions = {
  action?: GuideAction;
  durationMs?: number; // total travel duration
  easing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
  offset?: { x?: number; y?: number };
  highlight?: boolean; // briefly highlight target when reached
  // Path options
  path?: "straight" | "curve"; // default curve
  curveStrength?: number; // 0..1, fraction of distance used as bend magnitude (default 0.25)
  curveDirection?: "auto" | "left" | "right"; // default auto
  // New options
  anchor?: Anchor; // where inside the element to aim
  cursorHotspot?: { x?: number; y?: number }; // px offset added to click/press location
  dragTo?: GuideTarget; // destination target for action='drag'
};

export type GuideStep = { target: GuideTarget; action?: GuideAction; options?: GuideOptions };
export type GuideStepResult = { ok: boolean; action: GuideAction; targetKind: "element" | "position"; durationMs: number; clickedElementId?: string | null; error?: string };
export type GuideRunResult = { ok: boolean; steps: GuideStepResult[] };

// Cursor controller state (DOM-based, no React re-renders)
let cursorReactRoot: Root | null = null;
let cursorSvgCache: { arrow?: string; pointer?: string } = {};
let cursorStylesInjected = false;

// Visibility/idle management so the cursor never disappears while moving
let cursorHideTimer: number | null = null;
let cursorIsMoving = false;

function ensureCursorVisible(cursor: HTMLElement) {
  cursor.classList.add("visible");
}

function keepCursorVisibleWhileMoving() {
  cursorIsMoving = true;
  if (cursorHideTimer != null) {
    clearTimeout(cursorHideTimer);
    cursorHideTimer = null;
  }
}

function scheduleCursorHide(cursor: HTMLElement, ms = 1500) {
  if (cursorIsMoving) return;
  if (cursorHideTimer != null) {
    clearTimeout(cursorHideTimer);
  }
  cursorHideTimer = window.setTimeout(() => {
    if (!cursorIsMoving) cursor.classList.remove("visible");
  }, ms);
}

function stopMovingAndMaybeHide(cursor: HTMLElement, ms = 1200) {
  cursorIsMoving = false;
  scheduleCursorHide(cursor, ms);
}

// Get all scrollable ancestors of an element
function getScrollableAncestors(el: Element | null): Element[] {
  const scrollable: Element[] = [];
  let current = el?.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    const overflow = style.overflow + style.overflowY + style.overflowX;
    if (/(auto|scroll)/.test(overflow)) {
      scrollable.push(current);
    }
    current = current.parentElement;
  }
  return scrollable;
}

// Wait until element position and all scroll positions are settled
async function waitForScrollSettled(targetElement?: Element | null, timeoutMs = 1500, quietMs = 160) {
  const start = performance.now();
  
  // Monitor window scroll and all scrollable ancestors
  const scrollableElements = targetElement ? getScrollableAncestors(targetElement) : [];
  
  const getScrollPositions = () => {
    const positions: number[] = [
      window.scrollX || document.documentElement.scrollLeft || 0,
      window.scrollY || document.documentElement.scrollTop || 0,
    ];
    scrollableElements.forEach(el => {
      positions.push(el.scrollLeft, el.scrollTop);
    });
    return positions;
  };
  
  // Also monitor target element's position if provided
  const getTargetPos = () => {
    if (!targetElement) return { x: 0, y: 0 };
    const rect = targetElement.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  };
  
  let lastScrollPos = getScrollPositions();
  let lastTargetPos = getTargetPos();
  let lastChange = performance.now();
  
  return new Promise<void>((resolve) => {
    function tick(now: number) {
      const curScrollPos = getScrollPositions();
      const curTargetPos = getTargetPos();
      
      // Check if any scroll position or target position changed
      let changed = false;
      for (let i = 0; i < curScrollPos.length; i++) {
        if (curScrollPos[i] !== lastScrollPos[i]) {
          changed = true;
          break;
        }
      }
      if (!changed && targetElement) {
        if (curTargetPos.x !== lastTargetPos.x || curTargetPos.y !== lastTargetPos.y) {
          changed = true;
        }
      }
      
      if (changed) {
        lastScrollPos = curScrollPos;
        lastTargetPos = curTargetPos;
        lastChange = now;
      }
      
      if (now - lastChange >= quietMs || now - start >= timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// Inline SVG assets (use provided cursor images)
const DEFAULT_ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 32 32" width="32px" height="32px"><path d="M 7.2304688 4.9863281 C 5.9215232 4.8276681 4.8053213 6.0177722 5.0234375 7.3066406 A 1.0001 1.0001 0 0 0 5.0253906 7.3085938 C 5.9996339 12.981516 7.7205826 18.716222 10 24.515625 A 1.0001 1.0001 0 0 0 10 24.517578 C 10.26886 25.199332 10.914322 25.653844 11.5625 25.738281 C 12.210678 25.822721 12.879213 25.592031 13.359375 25.09375 C 14.505165 23.921134 15.214424 22.695429 15.90625 21.498047 C 17.56565 23.217848 19.256845 24.909775 21.0625 26.484375 L 21.060547 26.480469 C 21.799528 27.12933 22.841378 27.205969 23.673828 26.78125 A 1.0001 1.0001 0 0 0 23.691406 26.771484 C 24.987999 26.077693 26.028685 25.052256 26.71875 23.746094 L 26.71875 23.744141 C 27.174557 22.900924 27.06954 21.854242 26.439453 21.119141 A 1.0001 1.0001 0 0 0 26.433594 21.113281 C 24.867416 19.313474 23.193611 17.633865 21.488281 15.986328 C 22.714141 15.237691 23.933938 14.51508 25.158203 13.414062 A 1.0001 1.0001 0 0 0 25.162109 13.410156 C 26.052979 12.600274 25.977319 11.169141 25.101562 10.404297 A 1.0001 1.0001 0 0 0 24.669922 10.042969 C 18.793373 7.4738953 12.973806 5.6931843 7.2324219 4.9882812 A 1.0001 1.0001 0 0 0 7.2304688 4.9863281 z M 6.9960938 6.9746094 C 12.468883 7.6474978 18.081513 9.3573116 23.796875 11.849609 A 1.0001 1.0001 0 0 0 23.867188 11.884766 C 23.901248 11.899796 23.884276 11.867987 23.816406 11.929688 C 22.403891 13.198979 20.999383 14.076858 19.457031 14.976562 A 1.0001 1.0001 0 0 0 19.275391 16.568359 C 21.250864 18.425305 23.134972 20.36916 24.919922 22.419922 C 25.009402 22.524309 25.024026 22.676488 24.960938 22.792969 A 1.0001 1.0001 0 0 0 24.955078 22.804688 C 24.446951 23.770198 23.730542 24.476149 22.755859 25 C 22.611605 25.06851 22.457885 25.047856 22.378906 24.978516 A 1.0001 1.0001 0 0 0 22.376953 24.976562 C 20.293628 23.159824 18.307991 21.233373 16.419922 19.216797 A 1.0001 1.0001 0 0 0 14.835938 19.378906 C 13.841812 21.004716 13.152668 22.447221 11.925781 23.701172 A 1.0001 1.0001 0 0 0 11.919922 23.707031 C 11.883822 23.744501 11.865156 23.739957 11.847656 23.742188 C 9.6161121 18.057657 7.9395914 12.46667 6.9960938 6.9746094 z"/></svg>`;
const DEFAULT_POINTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 48 48" width="32px" height="32px"><path d="M 22.5 3 C 19.480226 3 17 5.4802259 17 8.5 L 17 23.412109 L 14.871094 22.697266 C 13.308963 22.172461 11.892528 22 10.703125 22 C 9.5908429 22 8.5540295 22.197475 7.640625 22.65625 C 5.2906802 23.831199 3.9427678 26.197397 4.0019531 28.90625 C 4.0019531 28.90625 4.0019531 28.908203 4.0019531 28.908203 C 4.0019531 28.908203 4.0019531 28.910156 4.0019531 28.910156 C 4.0184171 29.660452 4.4596385 30.354695 5.1328125 30.6875 A 1.50015 1.50015 0 0 0 5.1367188 30.689453 C 5.1367188 30.689453 9.4097266 32.789754 11.599609 33.949219 C 12.445613 34.397848 13.696939 34.926046 15.210938 36.09375 C 16.724935 37.261454 18.423179 39.012543 19.826172 41.792969 C 21.023611 44.165544 23.672779 45.195669 26.144531 44.955078 A 1.50015 1.50015 0 0 0 26.146484 44.955078 C 31.427085 44.439215 32.081856 44.381732 35.59375 44.023438 C 37.044229 43.875625 38.276993 43.213524 39.111328 42.289062 C 39.945663 41.364602 40.422895 40.257718 40.798828 39.125 C 41.561218 36.826116 42.933037 33.169846 43.671875 30.599609 C 45.018525 25.913269 41.884024 21.194549 37.246094 19.953125 L 37.242188 19.951172 C 36.99827 19.885452 36.756736 19.832884 36.521484 19.789062 A 1.50015 1.50015 0 0 0 36.513672 19.787109 L 28 18.248047 L 28 8.5 C 28 5.4802259 25.519774 3 22.5 3 z M 22.5 6 C 23.898226 6 25 7.1017741 25 8.5 L 25 19.5 A 1.50015 1.50015 0 0 0 26.232422 20.976562 L 35.980469 22.740234 C 36.14895 22.771804 36.312663 22.808524 36.464844 22.849609 A 1.50015 1.50015 0 0 0 36.46875 22.849609 C 39.614436 23.689967 41.641993 26.803286 40.789062 29.771484 C 40.115901 32.113248 38.752735 35.768572 37.953125 38.179688 C 37.641059 39.119968 37.279727 39.837554 36.882812 40.277344 C 36.485898 40.717133 36.095584 40.956874 35.289062 41.039062 C 31.783676 41.396695 31.135884 41.452908 25.855469 41.96875 C 24.423221 42.108159 23.024467 41.472831 22.503906 40.441406 C 20.887905 37.238832 18.854971 35.116296 17.042969 33.71875 C 15.230967 32.321204 13.560902 31.594199 13.003906 31.298828 C 10.939171 30.205625 7.8041786 28.665144 7.1035156 28.320312 C 7.1954033 26.8809 7.6810328 25.989859 8.9824219 25.339844 A 1.50015 1.50015 0 0 0 8.9863281 25.337891 C 9.3949198 25.132713 9.9434071 25 10.703125 25 C 11.605722 25 12.680146 25.12582 13.916016 25.541016 L 18.021484 26.921875 A 1.50015 1.50015 0 0 0 20 25.5 L 20 8.5 C 20 7.1017741 21.101774 6 22.5 6 z"/></svg>`;

async function loadCursorSvgs() {
  if (!cursorSvgCache.arrow) {
    try {
      cursorSvgCache.arrow = DEFAULT_ARROW_SVG;
      cursorSvgCache.pointer = DEFAULT_POINTER_SVG;
    } catch (e) {
      console.warn("Failed to set cursor SVGs", e);
    }
  }
  return cursorSvgCache;
}

function CursorVisual({ arrowSvg, pointerSvg }: { arrowSvg?: string; pointerSvg?: string }) {
  return (
    <>
      {arrowSvg && (
        <div className="arrow" dangerouslySetInnerHTML={{ __html: arrowSvg }} />
      )}
      {pointerSvg && (
        <div className="pointer" dangerouslySetInnerHTML={{ __html: pointerSvg }} />
      )}
    </>
  );
}

async function getOrCreateCursor(): Promise<HTMLDivElement> {
  const id = "demo-fake-cursor";
  let cursor = document.getElementById(id) as HTMLDivElement | null;
  const svgs = await loadCursorSvgs();

  // Inject CSS once to toggle arrow/pointer visibility
  if (!cursorStylesInjected) {
    const styleId = "cursor-controller-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .fake-cursor { pointer-events: none; opacity: 0; transition: opacity 0.2s ease; z-index: 2147483647; }
        .fake-cursor.visible { opacity: 1; }
        .fake-cursor .arrow { display: none; }
        .fake-cursor .pointer { display: none; }
        .fake-cursor.as-arrow .arrow { display: block; }
        .fake-cursor.as-arrow .pointer { display: none; }
        .fake-cursor.as-pointer .arrow { display: none; }
        .fake-cursor.as-pointer .pointer { display: block; }
        .fake-cursor.pressing .pointer svg path { filter: brightness(0.9); }
      `;
      document.head.appendChild(style);
    }
    cursorStylesInjected = true;
  }

  if (!cursor) {
    cursor = document.createElement("div");
    cursor.id = id;
    cursor.className = "fake-cursor as-arrow";
    cursor.style.position = "fixed";
    cursor.style.left = "20px";
    cursor.style.top = "20px";
    document.body.appendChild(cursor);
    // mount React visuals
    cursorReactRoot = createRoot(cursor);
    cursorReactRoot.render(<CursorVisual arrowSvg={svgs.arrow} pointerSvg={svgs.pointer} />);
  } else {
    cursor.classList.add("as-arrow");
    if (!cursorReactRoot) {
      cursorReactRoot = createRoot(cursor);
      cursorReactRoot.render(<CursorVisual arrowSvg={svgs.arrow} pointerSvg={svgs.pointer} />);
    }
  }
  return cursor;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Background color sampling and contrast
function cssColorToRgba(css: string): { r: number; g: number; b: number; a: number } | null {
  if (!css) return null;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillStyle = css; // triggers parsing
  // computed value will be in rgb/rgba
  const parsed = ctx.fillStyle as string;
  const m = parsed.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/\s*,\s*/).map(Number);
  const [r, g, b, a = 1] = parts;
  return { r, g, b, a };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const srgb = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function isDarkColor(css: string | null) {
  const rgba = css ? cssColorToRgba(css) : null;
  if (!rgba) return false;
  // Consider fully transparent as light (to prefer dark cursor)
  if (rgba.a === 0) return false;
  return relativeLuminance(rgba) < 0.5;
}

function getEffectiveBackgroundAtPoint(x: number, y: number): string | null {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;
  const seen = new Set<HTMLElement>();
  while (el && !seen.has(el)) {
    seen.add(el);
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const rgba = cssColorToRgba(bg);
    if (rgba && rgba.a > 0) return bg;
    el = el.parentElement as HTMLElement | null;
  }
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  return bodyBg || "rgb(255,255,255)";
}

function updateCursorColorAt(cursor: HTMLElement, x: number, y: number) {
  const bg = getEffectiveBackgroundAtPoint(x, y);
  const dark = isDarkColor(bg);
  const strokeColor = dark ? "#ffffff" : "#000000";

  // Update all path elements in the cursor SVGs
  const paths = cursor.querySelectorAll("svg path");
  paths.forEach((path) => {
    (path as SVGPathElement).style.fill = "white";
    (path as SVGPathElement).style.stroke = strokeColor;
    (path as SVGPathElement).style.strokeWidth = "1";
  });

  // Add contrasting shadow for extra visibility
  cursor.style.filter = dark
    ? "drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
    : "drop-shadow(0 1px 2px rgba(255,255,255,0.9))";
}

async function animatePosition(
  el: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs: number,
  easing: GuideOptions["easing"] = "ease-in-out",
  path: GuideOptions["path"] = "curve",
  curveStrength: number = 0.25,
  curveDirection: GuideOptions["curveDirection"] = "auto",
  onFrame?: (p: { x: number; y: number; t: number; now: number }) => void
) {
  // Keep the cursor visible for the entire duration of this animation
  keepCursorVisibleWhileMoving();
  ensureCursorVisible(el);

  const start = performance.now();
  const easeFn = easing === "linear" ? (t: number) => t : easeInOutCubic;

  // Precompute control point for a quadratic Bezier if using curve
  const useCurve = path !== "straight";
  let cp = { x: 0, y: 0 };
  if (useCurve) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    // Perpendicular normal (clockwise)
    let nx = -dy / dist;
    let ny = dx / dist;
    let sign = 1;
    if (curveDirection === "left") sign = -1;
    else if (curveDirection === "right") sign = 1;
    else {
      // auto: randomize direction for variety
      sign = Math.random() < 0.5 ? -1 : 1;
    }
    const bend = clamp(curveStrength, 0, 1) * dist;
    cp = { x: mx + sign * nx * bend, y: my + sign * ny * bend };
  }

  return new Promise<void>((resolve) => {
    function frame(now: number) {
      const t = clamp((now - start) / durationMs, 0, 1);
      const k = easeFn(t);
      let x: number, y: number;
      if (useCurve) {
        // Quadratic Bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        const u = 1 - k;
        x = u * u * from.x + 2 * u * k * cp.x + k * k * to.x;
        y = u * u * from.y + 2 * u * k * cp.y + k * k * to.y;
      } else {
        x = from.x + (to.x - from.x) * k;
        y = from.y + (to.y - from.y) * k;
      }
      // Add subtle wobble for realism (very small amplitude), taper to 0 near end
      const wobbleBase = 0.35;
      const wobbleAmp = wobbleBase * (1 - k);
      const nx = Math.sin(now * 0.02) * wobbleAmp;
      const ny = Math.cos(now * 0.018) * wobbleAmp;
      el.style.left = `${x + nx}px`;
      el.style.top = `${y + ny}px`;
      updateCursorColorAt(el, x + nx, y + ny);
      if (onFrame) onFrame({ x: x + nx, y: y + ny, t, now });
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function getCenterPoint(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function applyOffset(p: { x: number; y: number }, offset?: { x?: number; y?: number }) {
  return { x: p.x + (offset?.x ?? 0), y: p.y + (offset?.y ?? 0) };
}

function dispatchMouseLike(
  target: Element,
  type: string,
  point: { x: number; y: number },
  extra?: any
) {
  const common = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: point.x,
    clientY: point.y,
    ...extra,
  };

  try {
    const isDown = type === "pointerdown" || type === "mousedown";
    const isUp = type === "pointerup" || type === "mouseup";
    const enriched = {
      button: 0,
      buttons: isDown ? 1 : 0,
      isPrimary: true,
      ...common,
    };
    if ("PointerEvent" in window) {
      // @ts-ignore - PointerEvent init differs slightly
      const ev = new PointerEvent(type, { pointerId: 1, pointerType: "mouse", ...enriched });
      target.dispatchEvent(ev);
    } else {
      const ev = new MouseEvent(type, enriched as MouseEventInit);
      target.dispatchEvent(ev);
    }
  } catch {
    const ev = new MouseEvent(type, common);
    target.dispatchEvent(ev);
  }
}

function isElement(obj: any): obj is Element {
  return obj && typeof obj === "object" && obj.nodeType === 1;
}

function resolveWithin(within?: Element | string | null): Element | Document {
  if (!within) return document;
  if (isElement(within)) return within;
  if (typeof within === "string") {
    const byId = document.getElementById(within);
    if (byId) return byId;
    const q = document.querySelector(within);
    if (q) return q as Element;
  }
  return document;
}

function resolveTarget(target: GuideTarget): { kind: "element" | "position"; element?: Element | null; point?: { x: number; y: number } } {
  if (isElement(target)) return { kind: "element", element: target };
  if (typeof target === "string") {
    const byId = document.getElementById(target);
    if (byId) return { kind: "element", element: byId };
    const q = document.querySelector(target);
    return { kind: q ? "element" : "position", element: q ?? null };
  }
  if (typeof target === "object" && "position" in target) {
    return { kind: "position", point: target.position };
  }
  if (typeof target === "object" && "selector" in target) {
    const scope = resolveWithin(target.within ?? null);
    const all = (scope as Element | Document).querySelectorAll(target.selector);
    const idx = Math.max(0, Math.min(all.length - 1, target.nth ?? 0));
    const el = all[idx] ?? null;
    return { kind: el ? "element" : "position", element: el };
  }
  return { kind: "position", point: { x: 0, y: 0 } };
}

function getAnchoredPoint(el: Element, anchor?: Anchor) {
  const r = el.getBoundingClientRect();
  if (!anchor || anchor === "center") return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  if (anchor === "top-left") return { x: r.left, y: r.top };
  if (anchor === "bottom-right") return { x: r.right, y: r.bottom };
  const ax = clamp(anchor.x, 0, 1);
  const ay = clamp(anchor.y, 0, 1);
  return { x: r.left + r.width * ax, y: r.top + r.height * ay };
}

function clampToViewport(p: { x: number; y: number }) {
  return { x: clamp(p.x, 0, window.innerWidth), y: clamp(p.y, 0, window.innerHeight) };
}

 

function CursorController() {
  useEffect(() => {
    (window as any).__cursorGuide = async (
      stepsOrTarget: GuideTarget | GuideStep[],
      options: GuideOptions = {}
    ): Promise<GuideRunResult> => {
      const steps: GuideStep[] = Array.isArray(stepsOrTarget)
        ? stepsOrTarget
        : [{ target: stepsOrTarget, action: options.action ?? "none", options }];

      const results: GuideStepResult[] = [];
      const cursor = await getOrCreateCursor();
      cursor.classList.add("visible", "as-arrow");
      cursor.classList.remove("as-pointer", "pressing");
      ensureCursorVisible(cursor);
      keepCursorVisibleWhileMoving();
      const curX = parseFloat(cursor.style.left || "20") || 20;
      const curY = parseFloat(cursor.style.top || "20") || 20;
      updateCursorColorAt(cursor, curX, curY);

      for (const s of steps) {
        const {
          durationMs = 800,
          easing = "ease-in-out",
          offset,
          highlight = true,
          path = "curve",
          curveStrength = 0.25,
          curveDirection = "auto",
          anchor,
          cursorHotspot,
          dragTo,
        } = s.options ?? {};

        const action: GuideAction = s.action ?? (s.options?.action ?? "none");
        const t0 = performance.now();

        const resolved = resolveTarget(s.target);
        let targetPoint: { x: number; y: number } | null = null;
        let targetElement: Element | null = null;
        if (resolved.kind === "element" && resolved.element) {
          targetElement = resolved.element;
          
          // Hide cursor during scroll to avoid confusion
          cursor.classList.remove("visible");
          
          // Scroll the element into view
          targetElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          
          // Wait for ALL scrolling (window and containers) to settle
          await waitForScrollSettled(targetElement, 1500, 180);
          
          // Show cursor again after scroll is complete
          ensureCursorVisible(cursor);
          
          // Get target point AFTER scroll has settled
          targetPoint = getAnchoredPoint(targetElement, anchor);
        } else if (resolved.kind === "position" && resolved.point) {
          targetPoint = resolved.point;
        }
        if (!targetPoint) {
          results.push({ ok: false, action, targetKind: resolved.kind, durationMs: Math.round(performance.now() - t0), error: "Target not found" });
          continue;
        }

        // Get cursor's current position AFTER scroll has settled
        const from = {
          x: parseFloat(cursor.style.left || "20") || 20,
          y: parseFloat(cursor.style.top || "20") || 20,
        };
        const to = clampToViewport(applyOffset(targetPoint, offset));

        await animatePosition(cursor, from, to, durationMs, easing, path, curveStrength, curveDirection);

        // Small overshoot and settle
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;
        const overshoot = Math.min(6, Math.max(3, dist * 0.02));
        const over = { x: to.x + ux * overshoot, y: to.y + uy * overshoot };
        await animatePosition(cursor, to, over, Math.max(70, durationMs * 0.1), "ease-out", "straight", 0, "right");
        await animatePosition(cursor, over, to, 120, "ease-out", "straight", 0, "left");

        if (highlight) {
          (cursor as any).classList?.add("click");
          setTimeout(() => (cursor as any).classList?.remove("click"), 180);
        }

        let clickedId: string | null = null;
        try {
          if (action === "click") {
            cursor.classList.remove("as-arrow");
            cursor.classList.add("as-pointer", "pressing");
            const hotspot = { x: cursorHotspot?.x ?? 0, y: cursorHotspot?.y ?? 0 };
            // Convert viewport coords to page coords for elementFromPoint stability after scroll
            const pageP = { x: to.x + hotspot.x, y: to.y + hotspot.y };
            cursor.style.left = `${pageP.x}px`;
            cursor.style.top = `${pageP.y}px`;
            updateCursorColorAt(cursor, pageP.x, pageP.y);
            const clickTarget = targetElement ?? document.elementFromPoint(pageP.x, pageP.y) ?? document.body;
            dispatchMouseLike(clickTarget, "pointerdown", pageP);
            dispatchMouseLike(clickTarget, "mousedown", pageP);
            await new Promise((r) => setTimeout(r, 90));
            cursor.classList.remove("pressing");
            dispatchMouseLike(clickTarget, "mouseup", pageP);
            dispatchMouseLike(clickTarget, "click", pageP);
            setTimeout(() => {
              cursor.classList.remove("as-pointer");
              cursor.classList.add("as-arrow");
            }, 140);
            if (clickTarget instanceof HTMLElement) clickTarget.focus?.();
            clickedId = (clickTarget as HTMLElement)?.id ?? null;
          } else if (action === "drag") {
            if (!dragTo) throw new Error("dragTo is required for action 'drag'");
            const dest = resolveTarget(dragTo);
            let destPoint: { x: number; y: number } | null = null;
            if (dest.kind === "element" && dest.element) destPoint = getAnchoredPoint(dest.element, anchor);
            if (dest.kind === "position" && dest.point) destPoint = dest.point;
            if (!destPoint) throw new Error("dragTo target not found");
            const dst = clampToViewport(applyOffset(destPoint, offset));

            const startP = { x: to.x, y: to.y };
            const startTarget = targetElement ?? document.elementFromPoint(startP.x, startP.y) ?? document.body;
            cursor.classList.remove("as-arrow");
            cursor.classList.add("as-pointer", "pressing");
            dispatchMouseLike(startTarget, "pointerdown", startP);
            dispatchMouseLike(startTarget, "mousedown", startP);

            await animatePosition(cursor, startP, dst, Math.max(200, durationMs), easing, path, curveStrength, curveDirection, ({ x, y }) => {
              const moveTarget = document.elementFromPoint(x, y) ?? document.body;
              const moveP = { x, y };
              dispatchMouseLike(moveTarget, "pointermove", moveP);
              dispatchMouseLike(moveTarget, "mousemove", moveP);
            });

            const endTarget = document.elementFromPoint(dst.x, dst.y) ?? document.body;
            cursor.classList.remove("pressing");
            dispatchMouseLike(endTarget, "pointerup", dst);
            dispatchMouseLike(endTarget, "mouseup", dst);
          }

          results.push({ ok: true, action, targetKind: resolved.kind, durationMs: Math.round(performance.now() - t0), clickedElementId: clickedId });
        } catch (e: any) {
          results.push({ ok: false, action, targetKind: resolved.kind, durationMs: Math.round(performance.now() - t0), error: e?.message ?? String(e) });
        }
      }

      stopMovingAndMaybeHide(cursor, 2000);
      return { ok: results.every(r => r.ok), steps: results };
    };
    return () => {
      try {
        delete (window as any).__cursorGuide;
      } catch {
        (window as any).__cursorGuide = undefined;
      }
    };
  }, []);

  return null;
}

export default CursorController;
