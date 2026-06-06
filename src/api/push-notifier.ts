import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { authenticateUser } from '../utils/authUtils';
import {
  listSubscriptionsForUserServer,
  removeSubscriptionByEndpointServer,
  type PushSubscriptionRecord,
} from '../services/pushSubscriptionService';

type PushNotifierBody = {
  userId?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

type SendPushPayload = Required<Pick<PushNotifierBody, 'title' | 'body'>> & PushNotifierBody & {
  userId: string;
};

const isExpiredSubscriptionError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const statusCode = 'statusCode' in error ? Number(error.statusCode) : NaN;
  return statusCode === 404 || statusCode === 410;
};

const buildPayload = (body: Required<Pick<PushNotifierBody, 'title' | 'body'>> & PushNotifierBody) =>
  JSON.stringify({
    title: body.title,
    body: body.body,
    icon: body.icon || '/favicon.png',
    badge: body.badge || '/favicon.png',
    tag: body.tag || 'jozor-push-notification',
    data: {
      url: body.url || '/',
      ...(body.data || {}),
    },
  });

const validateBody = (body: PushNotifierBody) => {
  if (!body.title?.trim() || !body.body?.trim()) {
    return 'Both "title" and "body" are required.';
  }

  return null;
};

/**
 * Reads the VAPID values at call time so test environments and serverless
 * cold starts both see the latest environment state instead of a stale snapshot.
 */
const getVapidConfig = (): VapidConfig => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@jozor.app';

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variable.');
  }

  return { publicKey, privateKey, subject };
};

const configureWebPush = () => {
  const vapid = getVapidConfig();
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
};

const getCronSecret = () => process.env.CRON_SECRET?.trim();

const hasInternalAdminAccess = (req: VercelRequest) => {
  const cronSecret = getCronSecret();
  if (!cronSecret) return false;

  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : undefined;
  const explicitSecretHeader = req.headers['x-cron-secret'];
  const headerSecret = Array.isArray(explicitSecretHeader) ? explicitSecretHeader[0] : explicitSecretHeader;

  return bearerToken === cronSecret || headerSecret === cronSecret;
};

const sendPushToSubscription = async (
  subscription: PushSubscriptionRecord,
  payload: string
): Promise<'sent' | 'pruned'> => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      payload
    );

    return 'sent';
  } catch (error) {
    if (isExpiredSubscriptionError(error)) {
      await removeSubscriptionByEndpointServer(subscription.endpoint);
      return 'pruned';
    }

    throw error;
  }
};

/**
 * Sends a push payload to every stored browser subscription for one target user.
 *
 * This helper is shared by the authenticated API route and the scheduled cron
 * orchestrator so the actual push-delivery behavior stays identical in both paths.
 */
export const sendPushNotificationToUser = async (body: SendPushPayload) => {
  configureWebPush();

  const subscriptions = await listSubscriptionsForUserServer(body.userId);
  if (subscriptions.length === 0) {
    return {
      sent: 0,
      pruned: 0,
      totalSubscriptions: 0,
    };
  }

  const payload = buildPayload({
    ...body,
    title: body.title.trim(),
    body: body.body.trim(),
  });

  let sent = 0;
  let pruned = 0;

  for (const subscription of subscriptions) {
    const result = await sendPushToSubscription(subscription, payload);
    if (result === 'sent') sent += 1;
    if (result === 'pruned') pruned += 1;
  }

  return {
    sent,
    pruned,
    totalSubscriptions: subscriptions.length,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', ['POST']);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const isInternalAdminCall = hasInternalAdminAccess(req);
  const user = isInternalAdminCall
    ? null
    : await authenticateUser(req.headers.authorization);
  if (!isInternalAdminCall && !user?.uid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = (req.body || {}) as PushNotifierBody;
  const validationError = validateBody(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const targetUserId = body.userId ?? user?.uid;
  if (!targetUserId) {
    return res.status(400).json({ error: 'A target userId is required.' });
  }

  if (!isInternalAdminCall && targetUserId !== user?.uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await sendPushNotificationToUser({
      ...body,
      userId: targetUserId,
      title: body.title!.trim(),
      body: body.body!.trim(),
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Push delivery failed.' });
  }
}
