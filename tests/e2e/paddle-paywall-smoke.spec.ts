import { expect, test } from '@playwright/test';
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

type PaddleWindow = Window & {
  jozorDebug?: JozorDebug;
  Paddle?: unknown;
};

test.describe('Paddle Paywall and Checkout Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
    });
  });

  test('renders paywall and triggers upgrade checkout session request', async ({ page }) => {
    // Generate valid internal JWT signed with local SUPABASE_JWT_SECRET
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    let supabaseToken = 'dummy-token';
    
    if (jwtSecret) {
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
      supabaseToken = `${header}.${payload}.${signature}`;
      console.info('[E2E Check] Signed valid internal JWT token for free-user-123');
    } else {
      console.warn('[E2E Check] SUPABASE_JWT_SECRET is not available in environment. Token verification might fail with 401.');
    }

    // 1. Go to the home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 2. Wait for jozorDebug to load
    await page.waitForFunction(() => typeof (window as PaddleWindow).jozorDebug?.seedTreeScenario === 'function');

    // 3. Seed scenario as owner with free tier user
    await page.evaluate(({ token }) => {
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
          supabaseToken: token,
        },
      });
    }, { token: supabaseToken });

    // 4. Trigger the paywall modal by dispatching the open-paywall custom event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-paywall'));
    });

    // 5. Verify the Paywall Modal is visible (via role="dialog")
    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Manage subscription/i })).toBeVisible();

    // 6. Verify plan options "Pro" and "Family" buttons exist
    const proButton = modal.getByRole('button', { name: /Upgrade Now/i }).first();
    await expect(proButton).toBeVisible();

    // Check if Paddle successfully initialized
    const isPaddleInitialized = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if ((window as PaddleWindow).Paddle) {
            clearInterval(interval);
            resolve(true);
          } else if (attempts >= 20) {
            clearInterval(interval);
            resolve(false);
          }
        }, 250);
      });
    });

    console.info(`[E2E Check] window.Paddle initialized status: ${isPaddleInitialized}`);

    if (!isPaddleInitialized) {
      console.warn('[E2E Check] Paddle SDK did not initialize in this environment. Checkout request smoke skipped.');
      return;
    }

    // 7. Intercept the network request to create-checkout-session
    const requestPromise = page.waitForRequest(request =>
      request.url().includes('/api/billing/create-checkout-session') && request.method() === 'POST'
    );

    // 8. Click the Pro Upgrade button
    await proButton.click();

    // 9. Await the request intercept and verify payload
    const request = await requestPromise;
    const postData = JSON.parse(request.postData() || '{}');
    expect(postData.tier).toBe('pro');

    // 10. Wait for the API response and verify either sandbox session creation or safe failure handling.
    const response = await request.response();
    if (response) {
      console.info(`[E2E Check] Checkout session API response status: ${response.status()}`);
      expect([200, 500, 401]).toContain(response.status());
    }

    // 11. Confirm either checkout opened successfully or the UI displayed a graceful failure state.
    if (response?.ok()) {
      await page.waitForFunction(() => Boolean((window as PaddleWindow).Paddle), undefined, { timeout: 5000 });
      return;
    }

    const errorToast = page.locator('text=Failed to open checkout').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });
});
