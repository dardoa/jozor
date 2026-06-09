import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbPersonRow } from '../../personRowMapper';
import { processReminderBatch } from '../reminderProcessor';

const sendPushNotificationToUserMock = vi.fn();

vi.mock('../../../api/push-notifier', () => ({
  sendPushNotificationToUser: (...args: unknown[]) => sendPushNotificationToUserMock(...args),
}));

type TreeRow = { id: string; owner_id: string };
type CollaboratorRow = { tree_id: string; collaborator_uid: string };
type DeliveryClaimRow = { user_id: string; dedupe_key: string; notification_type: string };

const birthdayRow = (id: string, treeId: string, firstName = 'Mona'): DbPersonRow => ({
  id,
  tree_id: treeId,
  first_name: firstName,
  last_name: 'Ali',
  gender: 'female',
  birth_date: '1980-03-27',
  death_date: null,
  custom_fields: {},
  metadata: {},
});

const createProcessorClient = (params: {
  trees: TreeRow[];
  collaborators?: CollaboratorRow[];
  people: DbPersonRow[];
}) => {
  const client = {
    from(table: string) {
      if (table === 'trees') {
        return {
          select() {
            return {
              in(_column: string, values: string[]) {
                return Promise.resolve({
                  data: params.trees.filter((row) => values.includes(row.owner_id)),
                  error: null,
                });
              },
            };
          },
        };
      }

      if (table === 'tree_collaborators') {
        return {
          select() {
            return {
              in(_column: string, values: string[]) {
                return Promise.resolve({
                  data: (params.collaborators ?? []).filter((row) => values.includes(row.collaborator_uid)),
                  error: null,
                });
              },
            };
          },
        };
      }

      if (table === 'people') {
        return {
          select() {
            return {
              in(_column: string, values: string[]) {
                return Promise.resolve({
                  data: params.people.filter((row) => row.tree_id && values.includes(row.tree_id)),
                  error: null,
                });
              },
            };
          },
        };
      }

      if (table === 'push_reminder_deliveries') {
        return {
          upsert(payload: DeliveryClaimRow | DeliveryClaimRow[]) {
            return {
              select() {
                const payloadArray = Array.isArray(payload) ? payload : [payload];
                return Promise.resolve({
                  data: payloadArray.map((row) => ({
                    user_id: row.user_id,
                    dedupe_key: row.dedupe_key,
                  })),
                  error: null,
                });
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client as unknown as SupabaseClient;
};

describe('reminderProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not process more than 50 users in one batch', async () => {
    sendPushNotificationToUserMock.mockResolvedValue({ sent: 1, pruned: 0, totalSubscriptions: 1 });
    const userIds = Array.from({ length: 75 }, (_, index) => `user-${index + 1}`);
    const cappedUserIds = userIds.slice(0, 50);
    const client = createProcessorClient({
      trees: cappedUserIds.map((uid, index) => ({ id: `tree-${index + 1}`, owner_id: uid })),
      people: cappedUserIds.map((uid, index) => birthdayRow(`person-${uid}`, `tree-${index + 1}`)),
    });

    await processReminderBatch({
      userIds,
      now: new Date('2026-03-27T09:00:00.000Z'),
      client,
    });

    expect(sendPushNotificationToUserMock).toHaveBeenCalledTimes(50);
  });

  it('does not send more than 10 push notifications concurrently', async () => {
    let activeSends = 0;
    let maxActiveSends = 0;
    const releaseSendTasks: Array<() => void> = [];

    sendPushNotificationToUserMock.mockImplementation(
      () => new Promise((resolve) => {
        activeSends += 1;
        maxActiveSends = Math.max(maxActiveSends, activeSends);
        releaseSendTasks.push(() => {
          activeSends -= 1;
          resolve({ sent: 1, pruned: 0, totalSubscriptions: 1 });
        });
      })
    );

    const userIds = Array.from({ length: 20 }, (_, index) => `user-${index + 1}`);
    const client = createProcessorClient({
      trees: userIds.map((uid, index) => ({ id: `tree-${index + 1}`, owner_id: uid })),
      people: userIds.map((uid, index) => birthdayRow(`person-${uid}`, `tree-${index + 1}`)),
    });

    const batchPromise = processReminderBatch({
      userIds,
      now: new Date('2026-03-27T09:00:00.000Z'),
      client,
    });

    await vi.waitFor(() => expect(releaseSendTasks).toHaveLength(10));
    expect(maxActiveSends).toBe(10);

    releaseSendTasks.splice(0, releaseSendTasks.length).forEach((release) => release());
    await vi.waitFor(() => expect(releaseSendTasks).toHaveLength(10));
    expect(maxActiveSends).toBe(10);

    releaseSendTasks.splice(0, releaseSendTasks.length).forEach((release) => release());

    await batchPromise;
    expect(sendPushNotificationToUserMock).toHaveBeenCalledTimes(20);
    expect(maxActiveSends).toBe(10);
  });

  it('keeps birthday reminders distinct when the same person id exists in multiple trees', async () => {
    sendPushNotificationToUserMock.mockResolvedValue({ sent: 1, pruned: 0, totalSubscriptions: 1 });
    const client = createProcessorClient({
      trees: [
        { id: 'tree-a', owner_id: 'user-1' },
        { id: 'tree-b', owner_id: 'user-1' },
      ],
      people: [
        birthdayRow('same-person-id', 'tree-a', 'Mona A'),
        birthdayRow('same-person-id', 'tree-b', 'Mona B'),
      ],
    });

    await processReminderBatch({
      userIds: ['user-1'],
      now: new Date('2026-03-27T09:00:00.000Z'),
      client,
    });

    expect(sendPushNotificationToUserMock).toHaveBeenCalledTimes(2);
    expect(sendPushNotificationToUserMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tag: expect.stringContaining('tree-a:birthday:same-person-id'),
        data: expect.objectContaining({ treeId: 'tree-a', personId: 'same-person-id' }),
      }),
      expect.any(Object)
    );
    expect(sendPushNotificationToUserMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tag: expect.stringContaining('tree-b:birthday:same-person-id'),
        data: expect.objectContaining({ treeId: 'tree-b', personId: 'same-person-id' }),
      }),
      expect.any(Object)
    );
  });
});
