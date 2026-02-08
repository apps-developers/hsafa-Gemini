import type { HsafaClientOptions } from './types.js';

export function buildAuthHeaders(options: HsafaClientOptions): Record<string, string> {
  const headers: Record<string, string> = {};

  if (options.secretKey) {
    headers['x-secret-key'] = options.secretKey;
  } else if (options.publicKey) {
    headers['x-public-key'] = options.publicKey;
    if (options.jwt) {
      headers['Authorization'] = `Bearer ${options.jwt}`;
    }
  }

  return headers;
}
