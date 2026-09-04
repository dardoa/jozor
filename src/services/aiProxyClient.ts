import type { AIProxyRequest, AIProxyResponse } from '../types/ai';
import { authTokenService } from './authTokenService';

const AI_PROXY_API = '/api/ai-proxy';

export class AIProxyClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
    readonly resetAt?: string,
  ) {
    super(message);
    this.name = 'AIProxyClientError';
  }
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;

async function getProxyAuthToken(): Promise<string | null> {
  return authTokenService.getPreferredSupabaseToken();
}

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
};

export interface AIProxyCallOptions {
  signal?: AbortSignal;
}

export async function callAIProxy(
  request: AIProxyRequest,
  { signal }: AIProxyCallOptions = {}
): Promise<AIProxyResponse> {
  throwIfAborted(signal);
  const token = await getProxyAuthToken();
  throwIfAborted(signal);
  if (!token) {
    throw new Error('Please sign in to use AI features.');
  }

  const response = await fetch(AI_PROXY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let message = 'AI request failed.';
    let code = 'AI_REQUEST_FAILED';
    let retryAfterSeconds: number | undefined;
    let resetAt: string | undefined;
    try {
      const payload = asRecord(await response.json());
      const error = asRecord(payload?.error);
      if (typeof error?.message === 'string') message = error.message;
      if (typeof error?.code === 'string') code = error.code;
      if (typeof error?.retryAfterSeconds === 'number' && Number.isFinite(error.retryAfterSeconds)) {
        retryAfterSeconds = error.retryAfterSeconds;
      }
      if (typeof error?.resetAt === 'string') resetAt = error.resetAt;
    } catch {
      // Ignore JSON parse errors from the proxy.
    }
    throw new AIProxyClientError(message, code, response.status, retryAfterSeconds, resetAt);
  }

  return await response.json() as AIProxyResponse;
}
