export const MAX_PROMPT_LENGTH = 30_000;
export const MAX_KINDI_REDACTED_TEXT_LENGTH = 2_000;
export const MAX_SHORT_TEXT_LENGTH = 500;
export const MAX_MEDIUM_TEXT_LENGTH = 5_000;
export const MAX_HISTORY_TEXT_LENGTH = 20_000;
export const MAX_IMAGE_BASE64_LENGTH = 6_000_000;
export const MAX_FAMILY_STORY_MEMBERS = 50;
export const MAX_RELATION_TOKENS = 100;
export const MAX_FAMILY_STORY_DATA_LENGTH = 20_000;
export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

export type BillingTier = 'free' | 'pro' | 'family';

export interface AIProxyRateLimitResult {
  allowed: boolean;
  requestCount: number;
  requestLimit: number;
  windowSeconds: number;
  retryAfterSeconds: number;
  resetAt: string;
}

export class AIProxyRateLimitExceededError extends Error {
  constructor(readonly result: AIProxyRateLimitResult) {
    super('AI proxy rate limit exceeded.');
    this.name = 'AIProxyRateLimitExceededError';
  }
}

export class AIProxyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProxyValidationError';
  }
}
