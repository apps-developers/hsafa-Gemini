/**
 * File utility functions for the HsafaChat component
 */

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Join URL paths safely
 */
export function joinUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) return path;
  const a = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const b = path.startsWith('/') ? path : `/${path}`;
  return `${a}${b}`;
}
