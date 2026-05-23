import { describe, expect, it } from 'vitest';

import vercelConfig from '../../../vercel.json';

describe('vercel API configuration', () => {
  it('schedules the push reminder cron once per day', () => {
    expect(vercelConfig.crons).toEqual([
      {
        path: '/api/push-reminder-cron',
        schedule: '0 4 * * *',
      },
    ]);
  });
});
