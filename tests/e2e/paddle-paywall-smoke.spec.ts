import { expect, test, type Page } from '@playwright/test';
import * as crypto from 'crypto';

type DebugUser = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  supabaseToken?: string;
};

type DebugRole = 'owner' | 'viewer' | 'editor';

type JozorDebug = {
  seedTreeScenario: (payload: {
    people: Record<string, unknown>;
    focusId: string;
    role: DebugRole;
    treeName?: string;
    user?: DebugUser;
  }) => void;
};

type PaddleCall = {
  type: 'environment' | 'initialize' | 'update' | 'checkout-open';
  payload: unknown;
};

type PaddleWindow = Window & {
  jozorDebug?: JozorDebug;
  PaddleBillingV1?: unknown;
  __jozorPaddleTestInstance?: unknown;
  __paddleCalls?: PaddleCall[];
};

function createInternalTestToken(): string {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) return 'dummy-token';

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'free-user-123',
    email: 'free-user.test.invalid',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function seedFreeUserAndOpenPaywall(page: Page, token: string): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    typeof (window as PaddleWindow).jozorDebug?.seedTreeScenario === 'function'
  ));
  await page.evaluate(({ accessToken }) => {
    (window as PaddleWindow).jozorDebug?.seedTreeScenario({
      people: {
        root: {
          id: 'root',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          birthDate: '1980',
          isDeceased: false,
        },
      },
      focusId: 'root',
      role: 'owner',
      treeName: 'Free Tree',
      user: {
        uid: 'free-user-123',
        displayName: 'Free User',
        email: 'free-user.test.invalid',
        photoURL: '',
        supabaseToken: accessToken,
      },
    });
    window.dispatchEvent(new CustomEvent('open-paywall'));
  }, { accessToken: token });

  const modal = page.getByRole('dialog').first();
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: /Manage subscription/i })).toBeVisible();
}

test.describe('Paddle Paywall and Checkout Contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
    });
  });

  test('submits a deterministic checkout request and opens the mocked Paddle transaction', async ({ page }) => {
    const paddleCdnRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('cdn.paddle.com')) paddleCdnRequests.push(request.url());
    });

    await page.addInitScript(() => {
      const calls: PaddleCall[] = [];
      const paddle = {
        Initialized: false,
        Environment: {
          set(environment: unknown) {
            calls.push({ type: 'environment', payload: environment });
          },
        },
        Initialize(options: unknown) {
          paddle.Initialized = true;
          calls.push({ type: 'initialize', payload: options });
        },
        Update(options: unknown) {
          calls.push({ type: 'update', payload: options });
        },
        Checkout: {
          open(options: unknown) {
            calls.push({ type: 'checkout-open', payload: options });
          },
        },
      };
      (window as PaddleWindow).PaddleBillingV1 = paddle;
      (window as PaddleWindow).__jozorPaddleTestInstance = paddle;
      (window as PaddleWindow).__paddleCalls = calls;
    });

    let checkoutRequest: { authorization: string | undefined; body: unknown } | undefined;
    await page.route('**/api/billing/create-checkout-session', async (route) => {
      const request = route.request();
      checkoutRequest = {
        authorization: request.headers().authorization,
        body: request.postDataJSON(),
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transactionId: 'txn_mock_contract_123' }),
      });
    });

    const token = createInternalTestToken();
    await seedFreeUserAndOpenPaywall(page, token);
    await page.waitForFunction(() => (
      (window as PaddleWindow).__paddleCalls?.some((call) => (
        call.type === 'initialize' || call.type === 'update'
      ))
    ));

    const proButton = page.getByRole('dialog').first().getByRole('button', { name: /Upgrade Now/i }).first();
    await expect(proButton).toBeEnabled();
    await proButton.click();

    await expect.poll(() => checkoutRequest).toBeTruthy();
    expect(checkoutRequest?.authorization).toBe(`Bearer ${token}`);
    expect(checkoutRequest?.body).toEqual({ tier: 'pro' });

    await page.waitForFunction(() => (
      (window as PaddleWindow).__paddleCalls?.some((call) => call.type === 'checkout-open')
    ));
    const checkoutOpen = await page.evaluate(() => (
      (window as PaddleWindow).__paddleCalls?.find((call) => call.type === 'checkout-open')
    ));
    expect(checkoutOpen?.payload).toEqual({
      transactionId: 'txn_mock_contract_123',
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'en',
        successUrl: 'http://localhost:3000',
      },
    });
    expect(paddleCdnRequests).toEqual([]);
  });

  test('opens a real Paddle sandbox checkout when the live environment is explicitly enabled', async ({ page }) => {
    test.skip(
      process.env.PADDLE_LIVE_E2E !== 'true',
      'Set PADDLE_LIVE_E2E=true with sandbox credentials to run the live checkout boundary.'
    );

    const token = createInternalTestToken();
    await seedFreeUserAndOpenPaywall(page, token);
    await page.waitForFunction(() => Boolean((window as PaddleWindow).PaddleBillingV1), undefined, {
      timeout: 15_000,
    });

    const requestPromise = page.waitForRequest((request) => (
      request.url().includes('/api/billing/create-checkout-session')
      && request.method() === 'POST'
    ));
    const proButton = page.getByRole('dialog').first().getByRole('button', { name: /Upgrade Now/i }).first();
    await proButton.click();

    const request = await requestPromise;
    expect(request.postDataJSON()).toEqual({ tier: 'pro' });
    const response = await request.response();
    expect(response?.status()).toBe(200);
  });
});
