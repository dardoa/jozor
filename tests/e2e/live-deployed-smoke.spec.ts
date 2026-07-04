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

  if (!config?.bypassToken) {
    test.skip('production app shell and layout loads', async () => {
      // Skipped unless both DEPLOYED_SMOKE_URL and VERCEL_BYPASS_TOKEN are configured.
    });
    return;
  }

  test('production app shell and layout loads', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('[E2E Live Smoke] Accessing configured deployment target.');
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });

    // 1. Verify we did not get redirected to vercel.com/login page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('vercel.com/login');
    expect(currentUrl).not.toContain('signup?next=');

    // 2. Verify root element exists
    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 15000 });

    // 3. Verify landing layout or sign-in buttons exist
    const hasGoogleLogin = await page.getByRole('button', { name: /Google/i }).count() > 0;
    const hasLoginButton = await page.getByRole('button', { name: /Sign In|Login/i }).count() > 0;

    // 4. Verify Kindi trigger exists (lazy loaded search trigger)
    const kindiTrigger = page.locator('[data-testid="kindi-search-trigger"], #kindi-search-trigger, text=Kindi').first();
    const hasKindiTrigger = await kindiTrigger.count() > 0;
    expect(hasGoogleLogin || hasLoginButton || hasKindiTrigger).toBe(true);

    // 5. Assert no P0/P1 console errors were logged
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('Cannot read properties') || 
      err.includes('Failed to load resource') || 
      err.includes('is not defined')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
