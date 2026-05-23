import { describe, expect, it } from 'vitest';

import rootHandler, { sendPushNotificationToUser as rootSendPushNotificationToUser } from '../../../api/push-notifier';

describe('root push notifier API function', () => {
  it('exports Vercel push notifier handlers', () => {
    expect(rootHandler).toEqual(expect.any(Function));
    expect(rootSendPushNotificationToUser).toEqual(expect.any(Function));
  });
});
