import { describe, expect, it } from 'vitest';

import rootHandler, { sendPushNotificationToUser as rootSendPushNotificationToUser } from '../../../api/push-notifier';
import srcHandler, { sendPushNotificationToUser as srcSendPushNotificationToUser } from '../push-notifier';

describe('root push notifier API function', () => {
  it('exports the shared push notifier handler for Vercel', () => {
    expect(rootHandler).toBe(srcHandler);
    expect(rootSendPushNotificationToUser).toBe(srcSendPushNotificationToUser);
  });
});
