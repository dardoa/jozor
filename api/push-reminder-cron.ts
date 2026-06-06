import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendPushNotificationToUser } from './push-notifier';

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_BATCHES = 10;
const MAX_BATCHES = 25;
const DEFAULT_DELIVERY_RETENTION_DAYS = 90;
const FULL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UPCOMING_WINDOW_DAYS = 3;

let serverClient: SupabaseClient | null = null;

type ReminderDeliveryResult = {
  deliveredNotifications: number;
  skippedNotifications: number;
  sentSubscriptions: number;
  prunedSubscriptions: number;
};

type PersonRecord = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  birthDate?: string;
  deathDate?: string;
  isDeceased?: boolean;
};

type SubscribedUserBatch = {
  userIds: string[];
  nextCursor?: string;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getServerClient(): SupabaseClient {
  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

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
}

function getCronSecret() {
  return getEnv('CRON_SECRET');
}

function getCronAuthFailure(req: VercelRequest): { status: number; error: string } | null {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return { status: 503, error: 'CRON_SECRET is not configured' };
  }

  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : undefined;

  return bearerToken === cronSecret ? null : { status: 401, error: 'Unauthorized' };
}

function parseBatchSize(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BATCH_SIZE;
  return Math.min(Math.floor(parsed), MAX_BATCH_SIZE);
}

function parseMaxBatches(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_BATCHES;
  return Math.min(Math.floor(parsed), MAX_BATCHES);
}

function parseDateOverride(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return new Date();
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatIsoDate(date: Date) {
  return date.toISOString().substring(0, 10);
}

function parseFullBirthDate(value: string) {
  const match = FULL_DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function getBirthdayOccurrence(parsedBirthDate: { month: number; day: number }, now: Date) {
  const today = startOfUtcDay(now);
  let nextBirthday = new Date(Date.UTC(today.getUTCFullYear(), parsedBirthDate.month - 1, parsedBirthDate.day));

  if (
    nextBirthday.getUTCMonth() !== parsedBirthDate.month - 1 ||
    nextBirthday.getUTCDate() !== parsedBirthDate.day
  ) {
    return null;
  }

  if (nextBirthday < today) {
    nextBirthday = new Date(Date.UTC(today.getUTCFullYear() + 1, parsedBirthDate.month - 1, parsedBirthDate.day));
  }

  const daysUntil = Math.round((nextBirthday.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil === 0) return { kind: 'today' as const, nextBirthday, daysUntil };
  if (daysUntil > 0 && daysUntil <= UPCOMING_WINDOW_DAYS) {
    return { kind: 'upcoming' as const, nextBirthday, daysUntil };
  }
  return null;
}

function getFullName(person: PersonRecord) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function mapDbPersonRowToPerson(row: any): PersonRecord {
  const customFields = row.custom_fields || {};
  const metadata = row.metadata || {};

  return {
    ...(metadata as Partial<PersonRecord>),
    id: row.id,
    firstName: row.first_name ?? '',
    middleName: row.middle_name ?? '',
    lastName: row.last_name ?? '',
    birthDate: row.birth_date ?? '',
    deathDate: row.death_date ?? '',
    isDeceased: Boolean(row.death_date || customFields.isDeceased),
  };
}

function buildScheduledBirthdayNotifications(params: {
  people: Record<string, PersonRecord>;
  now: Date;
}) {
  const todayIso = formatIsoDate(startOfUtcDay(params.now));

  return Object.values(params.people).flatMap(person => {
    if (!person.birthDate) return [];

    const parsedBirthDate = parseFullBirthDate(person.birthDate);
    if (!parsedBirthDate || parsedBirthDate.year < 1700) return [];

    const occurrence = getBirthdayOccurrence(parsedBirthDate, params.now);
    if (!occurrence) return [];

    const fullName = getFullName(person);
    const age = occurrence.nextBirthday.getUTCFullYear() - parsedBirthDate.year;
    const isDeceased = Boolean(person.isDeceased || person.deathDate);
    const eventDateIso = formatIsoDate(occurrence.nextBirthday);
    const title = occurrence.kind === 'upcoming'
      ? 'Upcoming Birth Anniversary'
      : 'Birth Anniversary';
    const body = occurrence.kind === 'upcoming'
      ? isDeceased
        ? `${fullName} would have turned ${age} in ${occurrence.daysUntil} day(s)`
        : `${fullName} turns ${age} in ${occurrence.daysUntil} day(s)`
      : isDeceased
        ? `${fullName} would have turned ${age} - born ${parsedBirthDate.year}`
        : `Today is "${fullName}"'s birth anniversary - born ${parsedBirthDate.year} (${age} years ago)`;

    return [{
      personId: person.id,
      eventDateIso,
      notification: {
        type: 'birthday',
        title,
        body,
        personId: person.id,
        dedupeKey: `birthday:${person.id}:${occurrence.kind}:${todayIso}`,
      },
    }];
  }).sort((left, right) => left.eventDateIso.localeCompare(right.eventDateIso));
}

async function listSubscribedUserIdsServer(params: {
  afterUserId?: string;
  limit: number;
}): Promise<SubscribedUserBatch> {
  const client = getServerClient();
  const uniqueUserIds = new Set<string>();
  let rowCursor = params.afterUserId;
  let hasMoreRows = true;

  while (uniqueUserIds.size < params.limit && hasMoreRows) {
    let query = client
      .from('push_subscriptions')
      .select('user_id')
      .order('user_id', { ascending: true })
      .limit(Math.max(params.limit * 4, 25));

    if (rowCursor) {
      query = query.gt('user_id', rowCursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as Array<{ user_id: string }>;
    if (rows.length === 0) {
      hasMoreRows = false;
      break;
    }

    rows.forEach(row => {
      if (row.user_id) {
        uniqueUserIds.add(row.user_id);
        rowCursor = row.user_id;
      }
    });

    if (rows.length < Math.max(params.limit * 4, 25)) {
      hasMoreRows = false;
    }
  }

  const userIds = Array.from(uniqueUserIds).slice(0, params.limit);
  const nextCursor = userIds.length === params.limit ? userIds[userIds.length - 1] : undefined;
  return { userIds, nextCursor };
}

async function listVisibleTreeIdsForUser(userId: string) {
  const client = getServerClient();
  const [ownedTreesResult, collaboratorRowsResult] = await Promise.all([
    client.from('trees').select('id').eq('owner_id', userId),
    client.from('tree_collaborators').select('tree_id').eq('collaborator_uid', userId),
  ]);

  if (ownedTreesResult.error) throw ownedTreesResult.error;
  if (collaboratorRowsResult.error) throw collaboratorRowsResult.error;

  return Array.from(new Set([
    ...(ownedTreesResult.data ?? []).map(row => row.id as string),
    ...(collaboratorRowsResult.data ?? []).map(row => row.tree_id as string),
  ].filter(Boolean)));
}

async function fetchPeopleForTreeIds(treeIds: string[]) {
  if (treeIds.length === 0) return {} as Record<string, PersonRecord>;

  const { data, error } = await getServerClient()
    .from('people')
    .select('*')
    .in('tree_id', treeIds);

  if (error) throw error;

  return ((data ?? []) as any[]).reduce<Record<string, PersonRecord>>((accumulator, row) => {
    accumulator[row.id] = mapDbPersonRowToPerson(row);
    return accumulator;
  }, {});
}

async function claimReminderDelivery(userId: string, dedupeKey: string, type: string) {
  const { error } = await getServerClient()
    .from('push_reminder_deliveries')
    .insert({
      user_id: userId,
      dedupe_key: dedupeKey,
      notification_type: type,
    });

  if (!error) return true;
  if (typeof error === 'object' && error && 'code' in error && error.code === '23505') return false;
  throw error;
}

async function pruneReminderDeliveries(now: Date, retentionDays = DEFAULT_DELIVERY_RETENTION_DAYS) {
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const { error } = await getServerClient()
    .from('push_reminder_deliveries')
    .delete()
    .lt('created_at', cutoff);

  if (error) throw error;
}

export async function processReminderBatch(params: {
  userIds: string[];
  now: Date;
}): Promise<ReminderDeliveryResult> {
  const result: ReminderDeliveryResult = {
    deliveredNotifications: 0,
    skippedNotifications: 0,
    sentSubscriptions: 0,
    prunedSubscriptions: 0,
  };

  for (const userId of params.userIds) {
    const treeIds = await listVisibleTreeIdsForUser(userId);
    if (treeIds.length === 0) continue;

    const people = await fetchPeopleForTreeIds(treeIds);
    const reminders = buildScheduledBirthdayNotifications({
      people,
      now: params.now,
    });

    for (const reminder of reminders) {
      const dedupeKey = reminder.notification.dedupeKey;
      if (!dedupeKey) {
        result.skippedNotifications += 1;
        continue;
      }

      const claimed = await claimReminderDelivery(userId, dedupeKey, reminder.notification.type);
      if (!claimed) {
        result.skippedNotifications += 1;
        continue;
      }

      const delivery = await sendPushNotificationToUser({
        userId,
        title: reminder.notification.title,
        body: reminder.notification.body,
        url: reminder.notification.personId ? `/person/${reminder.notification.personId}` : '/',
        tag: dedupeKey,
        data: {
          source: 'scheduled-reminder-cron',
          dedupeKey,
          personId: reminder.notification.personId,
          notificationType: reminder.notification.type,
        },
      });

      result.deliveredNotifications += 1;
      result.sentSubscriptions += delivery.sent;
      result.prunedSubscriptions += delivery.pruned;
    }
  }

  return result;
}

function addReminderResults(target: ReminderDeliveryResult, source: ReminderDeliveryResult) {
  target.deliveredNotifications += source.deliveredNotifications;
  target.skippedNotifications += source.skippedNotifications;
  target.sentSubscriptions += source.sentSubscriptions;
  target.prunedSubscriptions += source.prunedSubscriptions;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', ['GET']);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authFailure = getCronAuthFailure(req);
    if (authFailure) {
      return res.status(authFailure.status).json({ error: authFailure.error });
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

      if (!batch.nextCursor) break;
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
