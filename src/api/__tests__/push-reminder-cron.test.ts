
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listSubscribedUserIdsServerMock = vi.fn();
const sendPushNotificationToUserMock = vi.fn();
const createClientMock = vi.fn();
const deleteOldDeliveriesMock = vi.fn();
const insertDeliveryClaimMock = vi.fn();
let duplicateClaimMode = false;

type DeliveryClaim = {
  user_id: string;
  dedupe_key: string;
};

const toDeliveryClaim = (payload: unknown): DeliveryClaim => {
  const claim = payload as Partial<DeliveryClaim>;
  return {
    user_id: claim.user_id ?? '',
    dedupe_key: claim.dedupe_key ?? '',
  };
};

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

const createSupabaseMock = () => ({
  from(table: string) {
    if (table === 'trees') {
      return {
        select() {
          return {
            in(_column: string, values: string[]) {
              return Promise.resolve({
                data: values.map(uid => ({ id: 'tree-1', owner_id: uid })),
                error: null,
              });
            },
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
            in(_column: string, _values: string[]) {
              return Promise.resolve({ data: [], error: null });
            },
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
        delete() {
          return {
            lt(column: string, cutoff: string) {
              deleteOldDeliveriesMock(column, cutoff);
              return Promise.resolve({ error: null });
            },
          };
        },
        upsert(payload: unknown, _options?: unknown) {
          insertDeliveryClaimMock(payload);
          return {
            select(_cols?: string) {
              const payloadArray = Array.isArray(payload) ? payload : [payload];
              return Promise.resolve(
                duplicateClaimMode
                  ? { data: [], error: null }
                  : {
                      data: payloadArray.map(toDeliveryClaim),
                      error: null,
                    }
              );
            },
          };
        },
        insert(payload: unknown) {
          insertDeliveryClaimMock(payload);
          return {
            select(_cols?: string) {
              const payloadArray = Array.isArray(payload) ? payload : [payload];
              return Promise.resolve(
                duplicateClaimMode
                  ? { data: [], error: null }
                  : {
                      data: payloadArray.map(toDeliveryClaim),
                      error: null,
                    }
              );
            },
          };
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
    duplicateClaimMode = false;
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
    expect(deleteOldDeliveriesMock).toHaveBeenCalledWith(
      'created_at',
      '2025-12-27T09:00:00.000Z'
    );
    expect(sendPushNotificationToUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        data: expect.objectContaining({
          source: 'scheduled-reminder-cron',
          notificationType: 'birthday',
        }),
      }),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        processedUsers: 1,
        batchesProcessed: 1,
        maxBatches: 10,
        nextCursor: null,
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
    duplicateClaimMode = true;
    createClientMock.mockImplementation(() => createSupabaseMock());

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

  it('processes multiple subscribed-user batches in one cron run', async () => {
    listSubscribedUserIdsServerMock
      .mockResolvedValueOnce({
        userIds: ['user-1'],
        nextCursor: 'user-1',
      })
      .mockResolvedValueOnce({
        userIds: ['user-2'],
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
      query: {
        date: '2026-03-27T09:00:00.000Z',
        limit: '1',
        maxBatches: '2',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(listSubscribedUserIdsServerMock).toHaveBeenNthCalledWith(1, {
      afterUserId: undefined,
      limit: 1,
    });
    expect(listSubscribedUserIdsServerMock).toHaveBeenNthCalledWith(2, {
      afterUserId: 'user-1',
      limit: 1,
    });
    expect(sendPushNotificationToUserMock).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        processedUsers: 2,
        batchesProcessed: 2,
        maxBatches: 2,
        nextCursor: null,
        deliveredNotifications: 2,
        sentSubscriptions: 2,
      })
    );
  });

  it('returns nextCursor when the configured batch cap is reached', async () => {
    listSubscribedUserIdsServerMock.mockResolvedValue({
      userIds: ['user-1'],
      nextCursor: 'user-1',
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
      query: {
        date: '2026-03-27T09:00:00.000Z',
        limit: '1',
        maxBatches: '1',
      },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(listSubscribedUserIdsServerMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        processedUsers: 1,
        batchesProcessed: 1,
        maxBatches: 1,
        nextCursor: 'user-1',
      })
    );
  });

  it('hides internal failure details from the cron response', async () => {
    listSubscribedUserIdsServerMock.mockRejectedValue(new Error('private database detail'));
    createClientMock.mockImplementation(() => createSupabaseMock());

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret' },
      query: { date: '2026-03-27T09:00:00.000Z' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Reminder cron failed.' });
    expect(JSON.stringify(res.body)).not.toContain('private database detail');
  });

  it('returns 503 when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET;
    createClientMock.mockImplementation(() => createSupabaseMock());

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret' },
      query: { date: '2026-03-27T09:00:00.000Z' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'CRON_SECRET is not configured' });
    expect(listSubscribedUserIdsServerMock).not.toHaveBeenCalled();
  });
});

