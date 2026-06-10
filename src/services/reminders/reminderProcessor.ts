import type { SupabaseClient } from '@supabase/supabase-js';
import type { Person } from '../../types';
import { mapDbPersonRowToPerson, type DbPersonRow } from '../personRowMapper';
import { buildScheduledBirthdayNotifications } from '../scheduledNotifications';
import { sendPushNotificationToUser } from '../../api/push-notifier';
import { createLimit } from '../../../shared/concurrency';

const MAX_BATCH_SIZE = 50;

export interface ReminderDeliveryResult {
  deliveredNotifications: number;
  skippedNotifications: number;
  sentSubscriptions: number;
  prunedSubscriptions: number;
}

export async function processReminderBatch(params: {
  userIds: string[];
  now: Date;
  client: SupabaseClient;
}): Promise<ReminderDeliveryResult> {
  const cappedUserIds = params.userIds.slice(0, MAX_BATCH_SIZE);
  if (cappedUserIds.length === 0) {
    return {
      deliveredNotifications: 0,
      skippedNotifications: 0,
      sentSubscriptions: 0,
      prunedSubscriptions: 0,
    };
  }

  // 1. Batch fetch visible tree IDs for all users
  const [ownedTreesResult, collaboratorRowsResult] = await Promise.all([
    params.client.from('trees').select('id, owner_id').in('owner_id', cappedUserIds),
    params.client
      .from('tree_collaborators')
      .select('tree_id, collaborator_uid')
      .in('collaborator_uid', cappedUserIds),
  ]);

  if (ownedTreesResult.error) throw ownedTreesResult.error;
  if (collaboratorRowsResult.error) throw collaboratorRowsResult.error;

  const userToTreeIds: Record<string, string[]> = {};
  for (const uid of cappedUserIds) {
    userToTreeIds[uid] = [];
  }
  const allTreeIds = new Set<string>();

  if (ownedTreesResult.data) {
    for (const row of ownedTreesResult.data) {
      const ownerId = row.owner_id as string;
      const treeId = row.id as string;
      if (ownerId && userToTreeIds[ownerId]) {
        userToTreeIds[ownerId].push(treeId);
        allTreeIds.add(treeId);
      }
    }
  }

  if (collaboratorRowsResult.data) {
    for (const row of collaboratorRowsResult.data) {
      const collabUid = row.collaborator_uid as string;
      const treeId = row.tree_id as string;
      if (collabUid && userToTreeIds[collabUid]) {
        userToTreeIds[collabUid].push(treeId);
        allTreeIds.add(treeId);
      }
    }
  }

  const uniqueTreeIds = Array.from(allTreeIds);
  if (uniqueTreeIds.length === 0) {
    return {
      deliveredNotifications: 0,
      skippedNotifications: 0,
      sentSubscriptions: 0,
      prunedSubscriptions: 0,
    };
  }

  // 2. Batch fetch people records for all tree IDs in one query
  const { data: peopleData, error: peopleError } = await params.client
    .from('people')
    .select('*')
    .in('tree_id', uniqueTreeIds);

  if (peopleError) throw peopleError;

  const peopleByTreeId: Record<string, Record<string, Person>> = {};
  for (const tid of uniqueTreeIds) {
    peopleByTreeId[tid] = {};
  }

  for (const row of (peopleData ?? []) as DbPersonRow[]) {
    const tid = row.tree_id;
    if (tid && peopleByTreeId[tid]) {
      peopleByTreeId[tid][row.id] = mapDbPersonRowToPerson(row);
    }
  }

  // 3. Generate scheduled birthday notifications for each user
  const remindersToClaim: Array<{
    userId: string;
    treeId: string;
    personId: string;
    dedupeKey: string;
    type: string;
    title: string;
    body: string;
  }> = [];

  for (const uid of cappedUserIds) {
    const userTrees = userToTreeIds[uid];
    if (userTrees.length === 0) continue;

    for (const tid of userTrees) {
      const treePeople = peopleByTreeId[tid] || {};
      const treeReminders = buildScheduledBirthdayNotifications({
        people: treePeople,
        isRtl: false,
        now: params.now,
      });

      for (const r of treeReminders) {
        const dedupeKey = r.spec.notification.dedupeKey
          ? `${tid}:${r.spec.notification.dedupeKey}`
          : undefined;
        if (!dedupeKey) continue;
        remindersToClaim.push({
          userId: uid,
          personId: r.personId,
          dedupeKey,
          type: r.spec.notification.type,
          title: r.spec.notification.title,
          body: r.spec.notification.body,
          treeId: tid,
        });
      }
    }
  }

  // 4. Bulk claim all reminder delivery keys using the (user_id, dedupe_key) constraint
  const claimedKeys = new Set<string>();
  if (remindersToClaim.length > 0) {
    const claimsPayload = remindersToClaim.map((r) => ({
      user_id: r.userId,
      dedupe_key: r.dedupeKey,
      notification_type: r.type,
    }));

    const { data: claimsData, error: claimsError } = await params.client
      .from('push_reminder_deliveries')
      .upsert(claimsPayload, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
      .select('user_id, dedupe_key');

    if (claimsError) throw claimsError;

    if (claimsData) {
      for (const row of claimsData) {
        claimedKeys.add(`${row.user_id}:${row.dedupe_key}`);
      }
    }
  }

  // 5. Send push notifications concurrently with a limit of 10 and a true AbortController timeout
  const limit = createLimit(10);
  const results: ReminderDeliveryResult = {
    deliveredNotifications: 0,
    skippedNotifications: 0,
    sentSubscriptions: 0,
    prunedSubscriptions: 0,
  };

  const sendPromises = remindersToClaim.map((reminder) => {
    const isClaimed = claimedKeys.has(`${reminder.userId}:${reminder.dedupeKey}`);
    if (!isClaimed) {
      results.skippedNotifications += 1;
      return Promise.resolve();
    }

    return limit(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const delivery = await sendPushNotificationToUser(
          {
            userId: reminder.userId,
            title: reminder.title,
            body: reminder.body,
            url: reminder.personId ? `/person/${reminder.personId}` : '/',
            tag: reminder.dedupeKey,
            data: {
              source: 'scheduled-reminder-cron',
              dedupeKey: reminder.dedupeKey,
              treeId: reminder.treeId,
              personId: reminder.personId,
              notificationType: reminder.type,
            },
          },
          { signal: controller.signal }
        );

        results.deliveredNotifications += 1;
        results.sentSubscriptions += delivery.sent;
        results.prunedSubscriptions += delivery.pruned;
      } catch (err) {
        results.skippedNotifications += 1;
        console.error(`[ReminderProcessor] Failed to send push to user ${reminder.userId}:`, err);
      } finally {
        clearTimeout(timeoutId);
      }
    });
  });

  await Promise.all(sendPromises);
  return results;
}
