/**
 * Component Registry for custom UI components
 * Allows users to register their own React components to be rendered in chat responses
 */

import { ComponentType } from 'react';

export interface UIComponentProps {
  props: any;
  resolvedColors?: any;
}

type ComponentMap = Map<string, ComponentType<UIComponentProps>>;

class ComponentRegistry {
  private components: ComponentMap = new Map();

  /**
   * Register a custom UI component
   * @param name - The component name (should match the 'component' field from the agent response)
   * @param component - The React component to render
   */
  register(name: string, component: ComponentType<UIComponentProps>) {
    this.components.set(name, component);
  }

  /**
   * Unregister a component
   * @param name - The component name to remove
   */
  unregister(name: string) {
    this.components.delete(name);
  }

  /**
   * Get a registered component
   * @param name - The component name
   * @returns The component or undefined if not found
   */
  get(name: string): ComponentType<UIComponentProps> | undefined {
    return this.components.get(name);
  }

  /**
   * Check if a component is registered
   * @param name - The component name
   */
  has(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * Clear all registered components
   */
  clear() {
    this.components.clear();
  }

  /**
   * Get all registered component names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.components.keys());
  }
}

// Global singleton instance
const registry = new ComponentRegistry();

export { registry as componentRegistry };

