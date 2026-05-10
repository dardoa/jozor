import { beforeEach, describe, expect, it, vi } from 'vitest';

const listSubscribedUserIdsServerMock = vi.fn();
const sendPushNotificationToUserMock = vi.fn();
const createClientMock = vi.fn();

vi.mock('../../services/pushSubscriptionService', () => ({
  listSubscribedUserIdsServer: (...args: unknown[]) => listSubscribedUserIdsServerMock(...args),
}));

vi.mock('../push-notifier', () => ({
  sendPushNotificationToUser: (...args: unknown[]) => sendPushNotificationToUserMock(...args),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import handler from '../push-reminder-cron';

const createResponse = () => {
  const response = {
    statusCode: 200,
    headers: {} as Record<string, string[]>,
    body: undefined as unknown,
    setHeader(name: string, value: string[]) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

const createSupabaseMock = (options?: {
  duplicateClaim?: boolean;
}) => ({
  from(table: string) {
    if (table === 'trees') {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({ data: [{ id: 'tree-1' }], error: null });
            },
          };
        },
      };
    }

    if (table === 'tree_collaborators') {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({ data: [], error: null });
            },
          };
        },
      };
    }

    if (table === 'people') {
      return {
        select() {
          return {
            in() {
              return Promise.resolve({
                data: [
                  {
                    id: 'person-1',
                    tree_id: 'tree-1',
                    first_name: 'Mona',
                    last_name: 'Ali',
                    gender: 'female',
                    birth_date: '1980-03-27',
                    death_date: null,
                    custom_fields: {},
                    metadata: {},
                  },
                ],
                error: null,
              });
            },
          };
        },
      };
    }

    if (table === 'push_reminder_deliveries') {
      return {
        insert() {
          return Promise.resolve(
            options?.duplicateClaim
              ? { error: { code: '23505' } }
              : { error: null }
          );
        },
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  },
});

describe('push-reminder-cron API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'cron-secret',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
    };
  });

  it('processes a bounded batch and delivers scheduled reminders', async () => {
    listSubscribedUserIdsServerMock.mockResolvedValue({
      userIds: ['user-1'],
      nextCursor: null,
    });
    sendPushNotificationToUserMock.mockResolvedValue({
      sent: 1,
      pruned: 0,
      totalSubscriptions: 1,
    });
    createClientMock.mockImplementation(() => createSupabaseMock());

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret' },
      query: { date: '2026-03-27T09:00:00.000Z', limit: '10' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(listSubscribedUserIdsServerMock).toHaveBeenCalledWith({
      afterUserId: undefined,
      limit: 10,
    });
    expect(sendPushNotificationToUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        data: expect.objectContaining({
          source: 'scheduled-reminder-cron',
          notificationType: 'birthday',
        }),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        processedUsers: 1,
        deliveredNotifications: 1,
        skippedNotifications: 0,
        sentSubscriptions: 1,
        prunedSubscriptions: 0,
      })
    );
  });

  it('skips duplicate reminder claims without sending twice', async () => {
    listSubscribedUserIdsServerMock.mockResolvedValue({
      userIds: ['user-1'],
      nextCursor: null,
    });
    createClientMock.mockImplementation(() => createSupabaseMock({ duplicateClaim: true }));

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret' },
      query: { date: '2026-03-27T09:00:00.000Z' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(sendPushNotificationToUserMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        deliveredNotifications: 0,
        skippedNotifications: 1,
      })
    );
  });
});
