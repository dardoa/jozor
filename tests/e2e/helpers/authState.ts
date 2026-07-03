import { expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), '.auth');

export const hasE2EAuthEnv = (): boolean => {
  return (
    process.env.E2E_AUTH_ROLE_HARNESS === 'true' &&
    !!process.env.E2E_OWNER_EMAIL &&
    !!process.env.E2E_OWNER_PASSWORD &&
    !!process.env.E2E_COLLAB_EMAIL &&
    !!process.env.E2E_COLLAB_PASSWORD
  );
};

export async function ensureAuthState(page: Page, role: 'owner' | 'collab'): Promise<string> {
  if (!hasE2EAuthEnv()) {
    throw new Error('E2E auth credentials are not configured in environment variables.');
  }

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const statePath = path.join(AUTH_DIR, `${role}.json`);
  const email = role === 'owner' ? process.env.E2E_OWNER_EMAIL! : process.env.E2E_COLLAB_EMAIL!;
  const password = role === 'owner' ? process.env.E2E_OWNER_PASSWORD! : process.env.E2E_COLLAB_PASSWORD!;

  let isSessionValid = false;

  if (fs.existsSync(statePath) && process.env.E2E_REFRESH_AUTH_STATE !== 'true') {
    let checkContext: BrowserContext | undefined;
    try {
      const browser = page.context().browser()!;
      checkContext = await browser.newContext({ storageState: statePath });
      const checkPage = await checkContext.newPage();

      await checkPage.goto('/', { waitUntil: 'domcontentloaded' });
      // Give a moment for store hydration and session restoration
      await checkPage.waitForTimeout(2000);

      const snapshot = await checkPage.evaluate(() => (window as any).jozorDebug?.getStateSnapshot?.());
      if (snapshot?.user?.email?.toLowerCase() === email.toLowerCase()) {
        isSessionValid = true;
      }
    } catch (err) {
      console.warn(`[E2E Auth] Failed to validate existing auth state for ${role}, will re-login.`);
    } finally {
      await checkContext?.close().catch(() => {});
    }
  }

  if (!isSessionValid) {
    console.info(`[E2E Auth] Authenticating fresh session for ${role}...`);

    // Perform UI login
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const loginTrigger = page.getByRole('button', { name: /google|sign in|login/i }).first();
    await expect(loginTrigger).toBeVisible();
    await loginTrigger.click();

    const loginDialog = page
      .getByRole('dialog')
      .filter({ has: page.locator('input[type="email"]') })
      .first();
    await expect(loginDialog).toBeVisible();

    await loginDialog.locator('input[type="email"]').fill(email);
    await loginDialog.locator('input[type="password"]').fill(password);
    await loginDialog.locator('button[type="submit"]').click();

    const authError = loginDialog
      .getByText(/invalid credential|wrong password|user-not-found|authentication failed/i)
      .first();
    if (await authError.isVisible().catch(() => false)) {
      const message = (await authError.textContent())?.trim() || 'Authentication failed.';
      throw new Error(`E2E Auth Helper login failed for ${role}: ${message}`);
    }

    // Wait for login success
    await page.waitForFunction((expectedEmail) => {
      const snapshot = (window as any).jozorDebug?.getStateSnapshot?.();
      return snapshot?.user?.email?.toLowerCase() === String(expectedEmail).toLowerCase();
    }, email);

    await expect(page.getByText(/Manage Trees/i)).toBeVisible();

    // Save storage state
    await page.context().storageState({ path: statePath });
    console.info(`[E2E Auth] Saved fresh auth state for ${role} to ${statePath}`);
  }

  return statePath;
}
