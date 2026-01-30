/**
 * Time utility functions for the HsafaChat component
 */

/**
 * Lightweight relative time helper (e.g., 1m, 6h, 7h)
 */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  const months = Math.floor(d / 30);
  if (months < 12) return `${months}mo`;
  const y = Math.floor(months / 12);
  return `${y}y`;
}

/**
 * Generate unique ID
 */
export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
