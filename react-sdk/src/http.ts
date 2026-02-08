import type { HsafaClientOptions } from './types.js';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

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

export class HttpClient {
  private baseUrl: string;
  private options: HsafaClientOptions;

  constructor(options: HsafaClientOptions) {
    this.options = options;
    this.baseUrl = options.gatewayUrl.replace(/\/+$/, '');
  }

  updateOptions(options: Partial<HsafaClientOptions>): void {
    Object.assign(this.options, options);
    if (options.gatewayUrl) {
      this.baseUrl = options.gatewayUrl.replace(/\/+$/, '');
    }
  }

  getOptions(): HsafaClientOptions {
    return { ...this.options };
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(this.options),
    };
  }

  buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders();

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined && method !== 'GET') {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      throw new HsafaApiError(response.status, errorBody);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  getAuthHeaders(): Record<string, string> {
    return buildAuthHeaders(this.options);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export class HsafaApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const message = typeof body === 'object' && body !== null && 'error' in body
      ? String((body as Record<string, unknown>).error)
      : `HTTP ${status}`;
    super(message);
    this.name = 'HsafaApiError';
    this.status = status;
    this.body = body;
  }
}
