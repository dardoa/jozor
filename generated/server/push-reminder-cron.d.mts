import type { VercelRequest, VercelResponse } from '@vercel/node';

type ReminderDeliveryResult = {
  deliveredNotifications: number;
  skippedNotifications: number;
  sentSubscriptions: number;
  prunedSubscriptions: number;
};

export function processReminderBatch(params: {
  userIds: string[];
  now: Date;
}): Promise<ReminderDeliveryResult>;

export default function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<unknown>;
