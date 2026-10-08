import { afterEach, describe, expect, it, vi } from 'vitest';

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
  afterEach(() => vi.unstubAllEnvs());
  it('enforces maintenance through the actual checkout dispatcher without credentials or body consumption', async () => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', 'true'); vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    const res = createResponse();
    await billingActionHandler({ method: 'POST', headers: {}, query: { action: 'create-checkout-session' } } as never, res as never);
    expect(res.statusCode).toBe(503); expect(res.body).toMatchObject({ code: 'ACCOUNT_ADMISSION_PAUSED' });
  });

  it.each(['__proto__', 'constructor', 'toString', 'valueOf'])('refuses inherited route name %s', async action => {
    const res = createResponse();
    await billingActionHandler({ method: 'POST', headers: {}, query: { action } } as never, res as never);
    expect(res.statusCode).toBe(404); expect(res.body).toEqual({ error: 'Billing endpoint not found' });
  });
  it.each([
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

  it('loads the account cleanup GET route but refuses requests without scheduler credentials', async () => {
    const res = createResponse();
    await deleteAccountHandler({ method: 'GET', headers: {} } as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
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
