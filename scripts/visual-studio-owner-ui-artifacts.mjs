import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.JOZOR_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const outputDirectory = path.resolve('output/playwright/visual-studio-owner-ui');

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);

  const guestButton = page.getByRole('button', { name: '\u062a\u0635\u0641\u062d \u0643\u0632\u0627\u0626\u0631' });
  if (await guestButton.isVisible().catch(() => false)) {
    await guestButton.click();
    await page.waitForTimeout(1000);
    const newTreeButton = page.getByRole('button', { name: /\u0627\u0628\u062f\u0623 \u0634\u062c\u0631\u0629 \u062c\u062f\u064a\u062f\u0629/ });
    if (await newTreeButton.isVisible().catch(() => false)) {
      await newTreeButton.click();
    }
    await page.waitForTimeout(8000);
  }

  const accountButton = page.getByRole('button', { name: '\u0627\u0644\u062d\u0633\u0627\u0628' });
  if (await accountButton.isVisible().catch(() => false)) {
    await accountButton.click();
    await page.waitForTimeout(400);
    const vaultEntry = page.locator('button:visible').filter({ hasText: 'The Vault' }).last();
    if (await vaultEntry.count()) {
      await vaultEntry.click();
      await page.waitForTimeout(1000);
      const exportNavigation = page.locator('button:visible').filter({ hasText: '\u0627\u0644\u062a\u0635\u062f\u064a\u0631' }).last();
      if (await exportNavigation.count()) {
        await exportNavigation.click();
        await page.waitForTimeout(700);
        const visualOutputs = page.locator('button:visible').filter({ hasText: '\u0627\u0644\u0645\u062e\u0631\u062c\u0627\u062a \u0627\u0644\u0628\u0635\u0631\u064a\u0629' }).last();
        if (await visualOutputs.count()) {
          await visualOutputs.click();
          await page.waitForTimeout(2500);
        }
      }
    }
  }

  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  const buttonNames = await page.getByRole('button').allTextContents();
  const linkNames = await page.getByRole('link').allTextContents();
  const screenshotPath = path.join(outputDirectory, 'application-state.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const studio = page.getByTestId('visual-publishing-studio');
  const studioScreenshotPath = path.join(outputDirectory, 'classic-heritage-studio-desktop.png');
  const studioVisible = await studio.isVisible().catch(() => false);
  if (studioVisible) {
    await studio.screenshot({ path: studioScreenshotPath });
  }

  process.stdout.write(`${JSON.stringify({
    url: page.url(),
    title: await page.title(),
    bodyText: bodyText.slice(0, 1200),
    buttonNames: buttonNames.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean),
    linkNames: linkNames.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean),
    screenshotPath,
    studioVisible,
    studioScreenshotPath: studioVisible ? studioScreenshotPath : undefined,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
