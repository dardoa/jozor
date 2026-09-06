import { describe, expect, it } from 'vitest';

import vercelConfig from '../../../vercel.json';

describe('vercel API configuration', () => {
  it('schedules reminders and guarded media cleanup once per day', () => {
    expect(vercelConfig.crons).toEqual([
      {
        path: '/api/person-media/cleanup',
        schedule: '0 5 * * *',
      },
      {
        path: '/api/push-reminder-cron',
        schedule: '0 4 * * *',
      },
    ]);
  });

  it('preserves existing media URLs through the consolidated function', () => {
    expect(vercelConfig.rewrites.slice(0, 3)).toEqual([
      { source: '/api/person-media', destination: '/api/person-media/read' },
      { source: '/api/person-media-migration', destination: '/api/person-media/migrate' },
      { source: '/api/person-media-cleanup-cron', destination: '/api/person-media/cleanup' },
    ]);
  });

  it('rewrites non-API client routes to the SPA entrypoint', () => {
    expect(vercelConfig.rewrites).toContainEqual({
      source: '/((?!api/).*)',
      destination: '/index.html',
    });
  });
});
