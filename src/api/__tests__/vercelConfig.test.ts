import { describe, expect, it } from 'vitest';

import vercelConfig from '../../../vercel.json';

describe('vercel API configuration', () => {
  it('schedules reminders and guarded media cleanup once per day', () => {
    expect(vercelConfig.crons).toEqual([
      {
        path: '/api/person-media-cleanup-cron',
        schedule: '0 5 * * *',
      },
      {
        path: '/api/push-reminder-cron',
        schedule: '0 4 * * *',
      },
    ]);
  });

  it('rewrites non-API client routes to the SPA entrypoint', () => {
    expect(vercelConfig.rewrites).toContainEqual({
      source: '/((?!api/).*)',
      destination: '/index.html',
    });
  });
});
