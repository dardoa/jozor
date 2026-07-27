import type { VercelRequest, VercelResponse } from '@vercel/node';
import createCheckoutHandler from '../../shared/server/api/billing/create-checkout-session.js';
import customerPortalHandler from '../../shared/server/api/billing/customer-portal.js';
import paddleWebhookHandler from '../../shared/server/api/billing/paddle-webhook.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handlers = {
  'create-checkout-session': createCheckoutHandler,
  'customer-portal': customerPortalHandler,
  'paddle-webhook': paddleWebhookHandler,
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const actionValue = req.query.action;
  const action = Array.isArray(actionValue) ? actionValue[0] : actionValue;
  const actionHandler = action && action in handlers
    ? handlers[action as keyof typeof handlers]
    : undefined;

  if (!actionHandler) {
    return res.status(404).json({ error: 'Billing endpoint not found' });
  }

  return actionHandler(req, res);
}
