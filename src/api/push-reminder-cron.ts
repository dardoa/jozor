import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { listSubscribedUserIdsServer } from '../services/pushSubscriptionService';
import {
  processReminderBatch as sharedProcessReminderBatch,
  type ReminderDeliveryResult,
} from '../services/reminders/reminderProcessor';

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_BATCHES = 10;
const MAX_BATCHES = 25;
const DEFAULT_DELIVERY_RETENTION_DAYS = 90;
let serverClient: SupabaseClient | null = null;

const getServerClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured for reminder cron.');
  }

  if (!serverClient) {
    serverClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return serverClient;
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
  return sharedProcessReminderBatch({
    userIds: params.userIds,
    now: params.now,
    client: getServerClient(),
  });
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
    console.error('[API_PUSH_REMINDER_CRON] Failed.', { message });
    return res.status(500).json({ error: 'Reminder cron failed.' });
  }
}
