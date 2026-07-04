import { expect, test } from '@playwright/test';
import {
  configureDeployedContext,
  getDeployedAccessConfig,
} from './helpers/deployedAccess';

test.describe('Live Deployed Smoke Test', () => {
  const config = getDeployedAccessConfig();

  test.beforeEach(async ({ context }) => {
    if (config && config.bypassToken) {
      await configureDeployedContext(context, config);
    }
  });

  if (!config?.url) {
    test.skip('production app shell and layout loads', async () => {
      // Skipped unless DEPLOYED_SMOKE_URL is configured.
    });
    return;
  }

  test('production app shell and layout loads', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else {
        consoleLogs.push(text);
      }
    });

    console.info('[E2E Live Smoke] Accessing configured deployment target.');
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });

    // 1. Verify we did not get redirected to vercel.com/login page
    const currentUrl = page.url();
    if (currentUrl.includes('vercel.com/login') || currentUrl.includes('signup?next=')) {
      throw new Error('Deployment is protected; provide VERCEL_BYPASS_TOKEN or use public staging URL.');
    }

    // 2. Verify root element exists
    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });

    // 3. Verify landing layout or sign-in buttons exist
    const hasGoogleLogin = await page.getByRole('button', { name: /Google/i }).count() > 0;
    const hasLoginButton = await page.getByRole('button', { name: /Sign In|Login|تسجيل الدخول/i }).count() > 0;

    // 4. Verify Kindi trigger exists (lazy loaded search trigger)
    const hasKindiTrigger = (await page.locator('[data-testid="kindi-search-trigger"]').count() > 0) ||
                            (await page.locator('#kindi-search-trigger').count() > 0) ||
                            (await page.locator('text=Kindi').count() > 0);
    expect(hasGoogleLogin || hasLoginButton || hasKindiTrigger).toBe(true);

    // 5. Assert no P0/P1 console errors or prohibited production logs were logged
    const allLogs = [...consoleErrors, ...consoleLogs];
    const prohibitedLogs = allLogs.filter(log =>
      (log.includes('Cannot access') && log.includes('before initialization')) ||
      log.includes('Dexie SchemaDiff') ||
      log.includes("Cache: Request scheme 'data' is unsupported") ||
      log.includes('[AppStateManager] Session UID became available') ||
      log.includes('[AppStateManager] Bootstrap gate released')
    );
    console.info('[E2E Live Smoke] Captured console errors:', consoleErrors);
    console.info('[E2E Live Smoke] Captured console logs:', consoleLogs);
    expect(prohibitedLogs.length).toBe(0);

    const criticalErrors = consoleErrors.filter(err => 
      err.includes('Cannot read properties') || 
      err.includes('Failed to load resource') || 
      err.includes('is not defined')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
