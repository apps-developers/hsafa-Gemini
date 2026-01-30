"use client";

/**
 * Web Controller Tools
 * 
 * A suite of tools for AI agents to interact with web pages:
 * - getDomComponents: Scan and analyze all interactive elements
 * - guideCursor/controlCursor: Move cursor and perform click/drag actions
 * - FillInput: Fill specific inputs by ID
 * - FillActiveInput: Fill the currently focused input
 * - CursorController: Component to enable cursor control (mount once)
 */

// DOM scanning
export { getDomComponents } from './getDomComponents';
export type { 
  DomComponent, 
  GetDomComponentsOptions, 
  GetDomComponentsResult 
} from './getDomComponents';

// Cursor control
export { guideCursor } from './guideCursor';
export type { GuideCursorOptions } from './guideCursor';

// Form filling (FillActiveInput only)
export { FillActiveInput } from './FillInput';
export type { FillInputOptions, FillResult } from './FillInput';

// Cursor controller component
export { default as CursorController } from './CursorController';
export type { 
  GuideAction,
  GuideTarget,
  Anchor,
  GuideOptions,
  GuideStep,
  GuideStepResult,
  GuideRunResult
} from './CursorController';

// Convenience wrapper for controlCursor (alias for guideCursor)
export { guideCursor as controlCursor } from './guideCursor';

