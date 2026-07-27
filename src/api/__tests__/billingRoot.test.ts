import { describe, expect, it } from 'vitest';

import deleteAccountHandler from '../../../api/auth/delete-account';
import billingActionHandler from '../../../api/billing/[action]';
import createCheckoutHandler from '../../../shared/server/api/billing/create-checkout-session';
import customerPortalHandler from '../../../shared/server/api/billing/customer-portal';
import paddleWebhookHandler from '../../../shared/server/api/billing/paddle-webhook';

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    writeHead(code: number) {
      this.statusCode = code;
      return this;
    },
    end(payload?: string) {
      this.body = payload ? JSON.parse(payload) : undefined;
      return this;
    },
    setHeader() {
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

describe('root SaaS API functions', () => {
  it.each([
    ['account deletion', deleteAccountHandler],
    ['checkout creation', createCheckoutHandler],
    ['customer portal', customerPortalHandler],
    ['Paddle webhook', paddleWebhookHandler],
  ])('loads the %s handler and returns 405 for GET', async (_name, handler) => {
    const req = { method: 'GET', headers: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });

  it.each([
    'create-checkout-session',
    'customer-portal',
    'paddle-webhook',
  ])('dispatches the public billing route for %s', async (action) => {
    const req = { method: 'GET', headers: {}, query: { action } };
    const res = createResponse();

    await billingActionHandler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });

  it('returns 404 for an unknown billing route', async () => {
    const req = { method: 'GET', headers: {}, query: { action: 'unknown' } };
    const res = createResponse();

    await billingActionHandler(req as never, res as never);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Billing endpoint not found' });
  });
});
