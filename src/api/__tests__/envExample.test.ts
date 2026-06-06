import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readEnvExample = () =>
  readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');

describe('environment example', () => {
  it('documents server-side variables required by deployed API functions', () => {
    const envExample = readEnvExample();

    [
      'SUPABASE_URL=',
      'SUPABASE_SERVICE_ROLE_KEY=',
      'SUPABASE_JWT_SECRET=',
      'VITE_GOOGLE_API_KEY=',
      'GOOGLE_CLIENT_ID=',
      'GOOGLE_CLIENT_SECRET=',
      'GOOGLE_AI_KEY=',
      'GEMINI_API_KEY=',
      'VAPID_PUBLIC_KEY=',
      'VAPID_PRIVATE_KEY=',
      'CRON_SECRET=',
      'APP_ORIGIN=',
      'PADDLE_API_KEY=',
      'PADDLE_WEBHOOK_SECRET=',
      'PADDLE_PRO_PRICE_ID=',
      'PADDLE_FAMILY_PRICE_ID=',
      'PADDLE_ENVIRONMENT=',
      'VITE_PADDLE_CLIENT_TOKEN=',
      'VITE_PADDLE_ENVIRONMENT=',
    ].forEach(variable => {
      expect(envExample).toContain(variable);
    });
  });
});
