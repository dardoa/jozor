import { describe, expect, it } from 'vitest';

import rootHandler, { processReminderBatch as rootProcessReminderBatch } from '../../../api/push-reminder-cron';

describe('root push reminder cron API function', () => {
  it('exports a Vercel reminder cron handler', () => {
    expect(rootHandler).toEqual(expect.any(Function));
    expect(rootProcessReminderBatch).toEqual(expect.any(Function));
  });
});
