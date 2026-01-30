"use client";

/**
 * guideCursor - Wrapper for window.__cursorGuide
 * 
 * Move the visual cursor to elements and perform click/drag actions.
 * Requires CursorController component to be mounted on the page.
 */

import type { GuideTarget, GuideOptions, GuideRunResult } from './CursorController';

export interface GuideCursorOptions extends GuideOptions {}

/**
 * Guide the cursor to a target element or position
 * 
 * @example
 * ```ts
 * // Move to an element and click it
 * await guideCursor('#submitBtn', { action: 'click' });
 * 
 * // Move to a position
 * await guideCursor({ position: { x: 100, y: 200 } });
 * 
 * // Drag from one element to another
 * await guideCursor('#item1', { action: 'drag', dragTo: '#dropzone' });
 * ```
 */
export async function guideCursor(
  target: GuideTarget,
  options: GuideCursorOptions = {}
): Promise<GuideRunResult> {
  if (typeof window === 'undefined') {
    return {
      ok: false,
      steps: [{
        ok: false,
        action: 'none',
        targetKind: 'position',
        durationMs: 0,
        error: 'guideCursor only works in browser environment'
      }]
    };
  }

  const cursorGuide = (window as any).__cursorGuide;
  
  if (!cursorGuide) {
    return {
      ok: false,
      steps: [{
        ok: false,
        action: 'none',
        targetKind: 'position',
        durationMs: 0,
        error: 'CursorController not initialized. Make sure to mount <CursorController /> component.'
      }]
    };
  }

  try {
    return await cursorGuide(target, options);
  } catch (error: any) {
    return {
      ok: false,
      steps: [{
        ok: false,
        action: options.action || 'none',
        targetKind: 'position',
        durationMs: 0,
        error: error?.message || String(error)
      }]
    };
  }
}

// Expose globally for console testing
if (typeof window !== 'undefined') {
  (window as any).guideCursor = guideCursor;
}

