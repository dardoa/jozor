import { authTokenService } from './authTokenService';
import { getSupabaseWithAuth } from './supabaseClient';
import { SupabaseRegistry } from './supabaseClientRegistry';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRecordInput {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionRecord extends PushSubscriptionRecordInput {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

type SubscribedUserBatchParams = {
  afterUserId?: string;
  limit: number;
};

type SubscribedUserBatch = {
  userIds: string[];
  nextCursor?: string;
};

const getServerEnv = (key: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string | undefined => {
  if (typeof window !== 'undefined') {
    return undefined;
  }

  const envSource = typeof process !== 'undefined' ? process.env : undefined;
  return envSource?.[key];
};

const getPushSubscriptionClient = async (userId: string, token?: string) => {
  const resolvedToken = (await authTokenService.getPreferredSupabaseToken(token)) ?? undefined;
  return getSupabaseWithAuth(userId, '', resolvedToken);
};

export const getPushSubscriptionAdminClient = async () => {
  const serverSupabaseUrl = getServerEnv('SUPABASE_URL');
  const serverSupabaseServiceRoleKey = getServerEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!serverSupabaseUrl || !serverSupabaseServiceRoleKey) {
    throw new Error('Supabase server environment variables are not configured for push delivery.');
  }

  return SupabaseRegistry.getAdminSdk(serverSupabaseUrl, serverSupabaseServiceRoleKey);
};

/**
 * Persists a browser push subscription for the current authenticated user.
 *
 * The service uses the subscription endpoint as the idempotent identity so the
 * same browser/device can be re-registered without creating duplicates.
 *
 * @param subscription - Browser PushSubscription-like payload to persist
 * @param userId - Authenticated Supabase user id that owns the subscription
 * @param token - Optional access token override for service-layer callers
 * @returns The stored subscription row as returned by Supabase
 */
export const registerSubscription = async (
  subscription: PushSubscriptionRecordInput,
  userId: string,
  token?: string
): Promise<PushSubscriptionRecord> => {
  const client = await getPushSubscriptionClient(userId, token);

  const { data, error } = await client
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      {
        onConflict: 'endpoint',
      }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as PushSubscriptionRecord;
};

/**
 * Removes a stored push subscription by endpoint.
 *
 * We delete by endpoint because that is the stable browser/device identifier
 * available to callers before a server-generated row id is known.
 *
 * @param endpoint - Browser push endpoint to remove
 * @param userId - Authenticated Supabase user id used for the scoped client
 * @param token - Optional access token override for service-layer callers
 */
export const removeSubscription = async (
  endpoint: string,
  userId: string,
  token?: string
): Promise<void> => {
  const client = await getPushSubscriptionClient(userId, token);

  const { error } = await client
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    throw error;
  }
};

/**
 * Lists all stored push subscriptions owned by a specific user.
 *
 * @param userId - Authenticated Supabase user id whose subscriptions to fetch
 * @param token - Optional access token override for service-layer callers
 * @returns All subscriptions currently stored for the user
 */
export const listSubscriptions = async (
  userId: string,
  token?: string
): Promise<PushSubscriptionRecord[]> => {
  const client = await getPushSubscriptionClient(userId, token);

  const { data, error } = await client
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PushSubscriptionRecord[];
};

/**
 * Server-side listing for push delivery.
 *
 * The notifier runs without a browser session, so it must use the service role
 * to read subscriptions by owner id instead of the user-scoped browser client.
 */
export const listSubscriptionsForUserServer = async (
  userId: string
): Promise<PushSubscriptionRecord[]> => {
  const client = await getPushSubscriptionAdminClient();

  const { data, error } = await client
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PushSubscriptionRecord[];
};

/**
 * Removes a stale subscription discovered during server push delivery.
 *
 * We prune 404/410 subscriptions immediately so later sends do not keep
 * retrying endpoints the push provider has already invalidated.
 */
export const removeSubscriptionByEndpointServer = async (endpoint: string): Promise<void> => {
  const client = await getPushSubscriptionAdminClient();

  const { error } = await client
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    throw error;
  }
};

/**
 * Returns distinct subscribed user ids in a stable ascending order.
 *
 * We page on `user_id` instead of loading the full subscriptions table so the
 * reminder cron can process bounded batches and stay within server timeouts.
 */
export const listSubscribedUserIdsServer = async (
  params: SubscribedUserBatchParams
): Promise<SubscribedUserBatch> => {
  const client = await getPushSubscriptionAdminClient();
  const { afterUserId, limit } = params;
  const uniqueUserIds = new Set<string>();
  let rowCursor = afterUserId;
  let hasMoreRows = true;

  while (uniqueUserIds.size < limit && hasMoreRows) {
    let query = client
      .from('push_subscriptions')
      .select('user_id')
      .order('user_id', { ascending: true })
      .limit(Math.max(limit * 4, 25));

    if (rowCursor) {
      query = query.gt('user_id', rowCursor);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

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

    if (rows.length < Math.max(limit * 4, 25)) {
      hasMoreRows = false;
    }
  }

  const userIds = Array.from(uniqueUserIds).slice(0, limit);
  const nextCursor = userIds.length === limit ? userIds[userIds.length - 1] : undefined;

  return {
    userIds,
    nextCursor,
  };
};
