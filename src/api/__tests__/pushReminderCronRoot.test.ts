import { describe, expect, it } from 'vitest';

import rootHandler, { processReminderBatch as rootProcessReminderBatch } from '../../../api/push-reminder-cron';
import srcHandler, { processReminderBatch as srcProcessReminderBatch } from '../push-reminder-cron';

describe('root push reminder cron API function', () => {
  it('exports the shared reminder cron handler for Vercel', () => {
    expect(rootHandler).toBe(srcHandler);
    expect(rootProcessReminderBatch).toBe(srcProcessReminderBatch);
  });
});
