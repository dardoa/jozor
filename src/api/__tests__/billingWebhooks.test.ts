import { describe, it, expect, vi } from 'vitest';
import paddleWebhookHandler from '../../../api/billing/paddle-webhook';
import createCheckoutHandler from '../../../api/billing/create-checkout-session';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MAX_JSON_BODY_SIZE } from '../../../api/shared/server/bodyLimits';

vi.mock('../../../shared/auth/internalJwt', () => ({
  verifyInternalToken: vi.fn().mockResolvedValue({ uid: 'user123', email: 'test@example.com' }),
}));

import { Readable } from 'stream';

// Helper to create a fake streaming request
function createMockRequest(bodySize: number, method = 'POST', headers: Record<string, string> = {}): VercelRequest {
  const chunks: Uint8Array[] = [];
  const chunkSize = 1024 * 1024; // 1MB chunks
  let remaining = bodySize;

  while (remaining > 0) {
    const size = Math.min(remaining, chunkSize);
    chunks.push(new Uint8Array(size).fill(65)); // fill with 'A'
    remaining -= size;
  }

  const req = Readable.from(chunks) as any;
  req.method = method;
  req.headers = headers;
  req.body = { tier: 'pro' };
  return req as unknown as VercelRequest;
}

function createMockResponse() {
  const res: Partial<VercelResponse> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    writeHead: vi.fn().mockReturnThis(),
    end: vi.fn(),
    setHeader: vi.fn(),
  };
  return res as VercelResponse;
}

describe('Billing Webhooks SEC3 Body Limit Tests', () => {
  describe('paddle-webhook', () => {
    it('returns 413 Payload Too Large when payload exceeds 5MB', async () => {
      const req = createMockRequest(MAX_JSON_BODY_SIZE + 1024, 'POST', {
        'paddle-signature': 'ts=12345;h1=fake', // bypass missing signature check
      });
      const res = createMockResponse();

      await paddleWebhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({ error: 'Payload Too Large' });
    });
  });

  describe('create-checkout-session', () => {
    it('returns 413 even when a parsed req.body is already present', async () => {
      const req = createMockRequest(MAX_JSON_BODY_SIZE + 1024, 'POST', {
        origin: 'http://localhost:5173', // bypass CORS
        authorization: 'Bearer fake-token',
      });
      const res = createMockResponse();

      await createCheckoutHandler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(413, expect.any(Object));
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Payload Too Large' }));
    });

    it('disables Vercel body parsing so every request uses the limited raw stream', async () => {
      const checkoutModule = await import('../../../api/billing/create-checkout-session');

      expect(checkoutModule.config).toEqual({
        api: {
          bodyParser: false,
        },
      });
    });
  });
});
