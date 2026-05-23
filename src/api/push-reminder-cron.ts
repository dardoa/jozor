import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotificationToUser } from './push-notifier';
import { listSubscribedUserIdsServer } from '../services/pushSubscriptionService';
import { mapDbPersonRowToPerson, type DbPersonRow } from '../services/personRowMapper';
import { buildScheduledBirthdayNotifications } from '../services/scheduledNotifications';
import type { Person } from '../types';

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_BATCHES = 10;
const MAX_BATCHES = 25;
const DEFAULT_DELIVERY_RETENTION_DAYS = 90;

type ReminderDeliveryResult = {
  deliveredNotifications: number;
  skippedNotifications: number;
  sentSubscriptions: number;
  prunedSubscriptions: number;
};

const getServerClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured for reminder cron.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

const getCronSecret = () => process.env.CRON_SECRET?.trim();

const isAuthorizedCronRequest = (req: VercelRequest) => {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    throw new Error('Missing CRON_SECRET environment variable.');
  }

  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : undefined;

  return bearerToken === cronSecret;
};

const parseBatchSize = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(Math.floor(parsed), MAX_BATCH_SIZE);
};

const parseMaxBatches = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_BATCHES;
  }

  return Math.min(Math.floor(parsed), MAX_BATCHES);
};

const parseDateOverride = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return new Date();

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const listVisibleTreeIdsForUser = async (userId: string) => {
  const client = getServerClient();
  const [ownedTreesResult, collaboratorRowsResult] = await Promise.all([
    client.from('trees').select('id').eq('owner_id', userId),
    client.from('tree_collaborators').select('tree_id').eq('collaborator_uid', userId),
  ]);

  if (ownedTreesResult.error) {
    throw ownedTreesResult.error;
  }

  if (collaboratorRowsResult.error) {
    throw collaboratorRowsResult.error;
  }

  return Array.from(
    new Set([
      ...(ownedTreesResult.data ?? []).map(row => row.id as string),
      ...(collaboratorRowsResult.data ?? []).map(row => row.tree_id as string),
    ].filter(Boolean))
  );
};

const fetchPeopleForTreeIds = async (treeIds: string[]) => {
  if (treeIds.length === 0) {
    return {} as Record<string, Person>;
  }

  const client = getServerClient();
  const { data, error } = await client
    .from('people')
    .select('*')
    .in('tree_id', treeIds);

  if (error) {
    throw error;
  }

  return ((data ?? []) as DbPersonRow[]).reduce<Record<string, Person>>((accumulator, row) => {
    accumulator[row.id] = mapDbPersonRowToPerson(row);
    return accumulator;
  }, {});
};

/**
 * The daily cron may retry or re-run, so each reminder must be claimed in the
 * database before any push send is attempted. The unique key prevents duplicate
 * external reminders for the same user and day.
 */
const claimReminderDelivery = async (userId: string, dedupeKey: string, type: string) => {
  const client = getServerClient();
  const { error } = await client
    .from('push_reminder_deliveries')
    .insert({
      user_id: userId,
      dedupe_key: dedupeKey,
      notification_type: type,
    });

  if (!error) {
    return true;
  }

  if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
    return false;
  }

  throw error;
};

const pruneReminderDeliveries = async (
  now: Date,
  retentionDays = DEFAULT_DELIVERY_RETENTION_DAYS
) => {
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const client = getServerClient();
  const { error } = await client
    .from('push_reminder_deliveries')
    .delete()
    .lt('created_at', cutoff);

  if (error) {
    throw error;
  }
};

export const processReminderBatch = async (params: {
  userIds: string[];
  now: Date;
}): Promise<ReminderDeliveryResult> => {
  const result: ReminderDeliveryResult = {
    deliveredNotifications: 0,
    skippedNotifications: 0,
    sentSubscriptions: 0,
    prunedSubscriptions: 0,
  };

  for (const userId of params.userIds) {
    const treeIds = await listVisibleTreeIdsForUser(userId);
    if (treeIds.length === 0) {
      continue;
    }

    const people = await fetchPeopleForTreeIds(treeIds);
    const reminders = buildScheduledBirthdayNotifications({
      people,
      isRtl: false,
      now: params.now,
    });

    for (const reminder of reminders) {
      const dedupeKey = reminder.spec.notification.dedupeKey;
      if (!dedupeKey) {
        result.skippedNotifications += 1;
        continue;
      }

      const claimed = await claimReminderDelivery(
        userId,
        dedupeKey,
        reminder.spec.notification.type
      );

      if (!claimed) {
        result.skippedNotifications += 1;
        continue;
      }

      const delivery = await sendPushNotificationToUser({
        userId,
        title: reminder.spec.notification.title,
        body: reminder.spec.notification.body,
        url: reminder.spec.notification.personId
          ? `/person/${reminder.spec.notification.personId}`
          : '/',
        tag: reminder.spec.notification.dedupeKey,
        data: {
          source: 'scheduled-reminder-cron',
          dedupeKey: reminder.spec.notification.dedupeKey,
          personId: reminder.spec.notification.personId,
          notificationType: reminder.spec.notification.type,
        },
      });

      result.deliveredNotifications += 1;
      result.sentSubscriptions += delivery.sent;
      result.prunedSubscriptions += delivery.pruned;
    }
  }

  return result;
};

const addReminderResults = (
  target: ReminderDeliveryResult,
  source: ReminderDeliveryResult
) => {
  target.deliveredNotifications += source.deliveredNotifications;
  target.skippedNotifications += source.skippedNotifications;
  target.sentSubscriptions += source.sentSubscriptions;
  target.prunedSubscriptions += source.prunedSubscriptions;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', ['GET']);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!isAuthorizedCronRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const batchSize = parseBatchSize(req.query.limit);
    const maxBatches = parseMaxBatches(req.query.maxBatches);
    let cursor = Array.isArray(req.query.cursor) ? req.query.cursor[0] : req.query.cursor;
    const now = parseDateOverride(req.query.date);
    await pruneReminderDeliveries(now);

    const processed: ReminderDeliveryResult = {
      deliveredNotifications: 0,
      skippedNotifications: 0,
      sentSubscriptions: 0,
      prunedSubscriptions: 0,
    };
    let processedUsers = 0;
    let batchesProcessed = 0;
    let nextCursor: string | null = null;

    while (batchesProcessed < maxBatches) {
      const batch = await listSubscribedUserIdsServer({
        afterUserId: cursor,
        limit: batchSize,
      });

      if (batch.userIds.length === 0) {
        nextCursor = null;
        break;
      }

      addReminderResults(processed, await processReminderBatch({
        userIds: batch.userIds,
        now,
      }));

      processedUsers += batch.userIds.length;
      batchesProcessed += 1;
      nextCursor = batch.nextCursor ?? null;

      if (!batch.nextCursor) {
        break;
      }

      cursor = batch.nextCursor;
    }

    return res.status(200).json({
      processedUsers,
      batchSize,
      batchesProcessed,
      maxBatches,
      nextCursor,
      evaluatedAt: now.toISOString(),
      ...processed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reminder cron failed.';
    return res.status(500).json({ error: message });
  }
}
