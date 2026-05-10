import type { AIProxyRequest, AIProxyResponse } from '../types/ai';
import { authTokenService } from './authTokenService';

const AI_PROXY_API = '/api/ai-proxy';

async function getProxyAuthToken(): Promise<string | null> {
  return authTokenService.getPreferredSupabaseToken();
}

export async function callAIProxy(request: AIProxyRequest): Promise<AIProxyResponse> {
  const token = await getProxyAuthToken();
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
  });

  if (!response.ok) {
    let message = 'AI request failed.';
    try {
      const err = await response.json();
      message = err?.error?.message || err?.error || message;
    } catch {
      // Ignore JSON parse errors from the proxy.
    }
    throw new Error(message);
  }

  return await response.json() as AIProxyResponse;
}
