import type { SupabaseClient } from '@supabase/supabase-js';
import type { Person } from '../../types';
import { mapDbPersonRowToPerson, type DbPersonRow } from '../personRowMapper';
import { buildScheduledBirthdayNotifications } from '../scheduledNotifications';
import { sendPushNotificationToUser } from '../../api/push-notifier';
import { createLimit } from '../../../shared/concurrency';

const MAX_BATCH_SIZE = 50;
/** Abort push notification fetch after this many milliseconds to avoid hanging the cron run. */
const PUSH_NOTIFICATION_TIMEOUT_MS = 5_000;

export interface ReminderDeliveryResult {
  deliveredNotifications: number;
  skippedNotifications: number;
  sentSubscriptions: number;
  prunedSubscriptions: number;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface ReminderToClaim {
  userId: string;
  treeId: string;
  personId: string;
  dedupeKey: string;
  type: string;
  title: string;
  body: string;
}

// Returns a fresh object each call to avoid accidental mutation of a shared reference.
function emptyResult(): ReminderDeliveryResult {
  return {
    deliveredNotifications: 0,
    skippedNotifications: 0,
    sentSubscriptions: 0,
    prunedSubscriptions: 0,
  };
}

// ─── Step 1: Build user → tree-IDs map ───────────────────────────────────────

async function fetchUserTreeMap(
  userIds: string[],
  client: SupabaseClient
): Promise<{ userToTreeIds: Record<string, string[]>; uniqueTreeIds: string[] }> {
  const [ownedTreesResult, collaboratorRowsResult] = await Promise.all([
    client.from('trees').select('id, owner_id').in('owner_id', userIds),
    client
      .from('tree_collaborators')
      .select('tree_id, collaborator_uid')
      .in('collaborator_uid', userIds),
  ]);

  if (ownedTreesResult.error) throw ownedTreesResult.error;
  if (collaboratorRowsResult.error) throw collaboratorRowsResult.error;

  const userToTreeIds: Record<string, string[]> = {};
  for (const uid of userIds) {
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

  return { userToTreeIds, uniqueTreeIds: Array.from(allTreeIds) };
}

// ─── Step 2: Fetch people records indexed by tree ────────────────────────────

async function fetchPeopleByTree(
  uniqueTreeIds: string[],
  client: SupabaseClient
): Promise<Record<string, Record<string, Person>>> {
  const { data: peopleData, error: peopleError } = await client
    .from('people')
    .select('*')
    .in('tree_id', uniqueTreeIds);

  if (peopleError) throw peopleError;

  const peopleByTreeId: Record<string, Record<string, Person>> = {};
  const allowedTreeIds = new Set(uniqueTreeIds);

  for (const row of (peopleData ?? []) as DbPersonRow[]) {
    const tid = row.tree_id;
    if (tid && allowedTreeIds.has(tid)) {
      if (!peopleByTreeId[tid]) {
        peopleByTreeId[tid] = {};
      }
      peopleByTreeId[tid][row.id] = mapDbPersonRowToPerson(row);
    }
  }

  return peopleByTreeId;
}

// ─── Step 3: Generate reminder candidates (pure, no I/O) ─────────────────────

function collectReminders(
  userIds: string[],
  userToTreeIds: Record<string, string[]>,
  peopleByTreeId: Record<string, Record<string, Person>>,
  now: Date
): ReminderToClaim[] {
  const reminders: ReminderToClaim[] = [];

  for (const uid of userIds) {
    const userTrees = userToTreeIds[uid];
    if (userTrees.length === 0) continue;

    for (const tid of userTrees) {
      const treePeople = peopleByTreeId[tid] || {};
      const treeReminders = buildScheduledBirthdayNotifications({
        people: treePeople,
        isRtl: false,
        now,
      });

      for (const r of treeReminders) {
        const dedupeKey = r.spec.notification.dedupeKey
          ? `${tid}:${r.spec.notification.dedupeKey}`
          : undefined;
        if (!dedupeKey) continue;
        reminders.push({
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

  return reminders;
}

// ─── Step 4: Bulk-claim delivery keys via upsert ─────────────────────────────

async function claimDeliveryKeys(
  reminders: ReminderToClaim[],
  client: SupabaseClient
): Promise<Set<string>> {
  const claimedKeys = new Set<string>();
  if (reminders.length === 0) return claimedKeys;

  const claimsPayload = reminders.map((r) => ({
    user_id: r.userId,
    dedupe_key: r.dedupeKey,
    notification_type: r.type,
  }));

  const { data: claimsData, error: claimsError } = await client
    .from('push_reminder_deliveries')
    .upsert(claimsPayload, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    .select('user_id, dedupe_key');

  if (claimsError) throw claimsError;

  if (claimsData) {
    for (const row of claimsData) {
      claimedKeys.add(`${row.user_id}:${row.dedupe_key}`);
    }
  }

  return claimedKeys;
}

// ─── Step 5: Send push notifications with concurrency limit ──────────────────

async function dispatchNotifications(
  reminders: ReminderToClaim[],
  claimedKeys: Set<string>
): Promise<ReminderDeliveryResult> {
  const limit = createLimit(10);
  const results = emptyResult();

  const sendPromises = reminders.map((reminder) => {
    const isClaimed = claimedKeys.has(`${reminder.userId}:${reminder.dedupeKey}`);
    if (!isClaimed) {
      results.skippedNotifications += 1;
      return Promise.resolve();
    }

    return limit(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PUSH_NOTIFICATION_TIMEOUT_MS);

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

// ─── Public entry point ───────────────────────────────────────────────────────

export async function processReminderBatch(params: {
  userIds: string[];
  now: Date;
  client: SupabaseClient;
}): Promise<ReminderDeliveryResult> {
  const cappedUserIds = params.userIds.slice(0, MAX_BATCH_SIZE);
  if (cappedUserIds.length === 0) return emptyResult();

  const { userToTreeIds, uniqueTreeIds } = await fetchUserTreeMap(cappedUserIds, params.client);
  if (uniqueTreeIds.length === 0) return emptyResult();

  const peopleByTreeId = await fetchPeopleByTree(uniqueTreeIds, params.client);
  const reminders = collectReminders(cappedUserIds, userToTreeIds, peopleByTreeId, params.now);
  const claimedKeys = await claimDeliveryKeys(reminders, params.client);
  return dispatchNotifications(reminders, claimedKeys);
}
