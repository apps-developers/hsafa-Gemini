export function getInterpolationVariables(input: unknown): Record<string, unknown> {
  const vars = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const extra =
    vars.variables && typeof vars.variables === 'object' && !Array.isArray(vars.variables)
      ? (vars.variables as Record<string, unknown>)
      : {};

  return { ...vars, ...extra };
}

export function interpolateString(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = variables[key.trim()];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

export function interpolateAny<T>(value: T, variables: Record<string, unknown>): T {
  if (typeof value === 'string') {
    return interpolateString(value, variables) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateAny(item, variables)) as T;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = interpolateAny(v, variables);
    }
    return result as T;
  }

  return value;
}
