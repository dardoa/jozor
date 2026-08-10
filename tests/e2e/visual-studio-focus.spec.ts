import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Download, type Page } from '@playwright/test';

type DebugUser = { uid: string; displayName: string; email: string; photoURL: string };
type DebugWindow = Window & {
  jozorDebug?: {
    seedTreeScenario: (payload: {
      people: Record<string, unknown>;
      focusId: string;
      role: 'owner';
      treeName: string;
      user: DebugUser;
    }) => void;
  };
};

const person = (
  id: string,
  firstName: string,
  relationships: { parents?: string[]; spouses?: string[]; children?: string[] } = {},
  overrides: Record<string, unknown> = {}
) => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Focus QA Family',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '1980',
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: relationships.parents ?? [],
  spouses: relationships.spouses ?? [],
  children: relationships.children ?? [],
  partnerDetails: {},
  isPrivate: false,
  ...overrides,
});

const STANDARD_PEOPLE = {
  'raw-root-sentinel': person('raw-root-sentinel', 'Living Root Sentinel', {
    parents: ['raw-father-sentinel', 'raw-mother-sentinel'],
    spouses: ['raw-spouse-sentinel'],
    children: ['raw-child-sentinel'],
  }),
  'raw-father-sentinel': person('raw-father-sentinel', 'Public Father', {
    spouses: ['raw-mother-sentinel'], children: ['raw-root-sentinel', 'raw-sibling-sentinel'],
  }, {
    isDeceased: true, deathDate: '2015', birthDate: '1950',
  }),
  'raw-mother-sentinel': person('raw-mother-sentinel', 'Public Mother', {
    spouses: ['raw-father-sentinel'], children: ['raw-root-sentinel'],
  }, {
    gender: 'female', isDeceased: true, deathDate: '2020', birthDate: '1955',
  }),
  'raw-spouse-sentinel': person('raw-spouse-sentinel', 'Living Spouse Sentinel', {
    spouses: ['raw-root-sentinel'],
  }, { gender: 'female' }),
  'raw-sibling-sentinel': person('raw-sibling-sentinel', 'Living Sibling Sentinel', {
    parents: ['raw-father-sentinel'],
  }),
  'raw-child-sentinel': person('raw-child-sentinel', 'Living Child Sentinel', {
    parents: ['raw-root-sentinel'],
  }, { birthDate: '2010' }),
};

const OWNER: DebugUser = {
  uid: 'focus-e2e-owner', displayName: 'Focus E2E Owner', email: 'focus-e2e@example.test', photoURL: '',
};

const ARTIFACT_DIR = path.resolve('output/playwright/visual-studio-focus');

const createDensePeople = (): Record<string, unknown> => {
  const childKeys = Array.from({ length: 14 }, (_, index) => `child-${index + 1}`);
  const rootId = 'dense-root-raw-sentinel';
  const dense: Record<string, unknown> = {
    [rootId]: person(rootId, 'Dense Focus Root', { children: childKeys }),
  };
  childKeys.forEach((key, index) => {
    dense[key] = person(key, `Dense Child ${index + 1}`, { parents: [rootId] });
  });
  return dense;
};

async function seedTreeScenario(
  page: Page,
  people: Record<string, unknown> = STANDARD_PEOPLE,
  focusId = 'raw-root-sentinel'
) {
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');
  await page.evaluate(({ seededPeople, seededFocusId, owner }) => {
    const debug = (window as DebugWindow).jozorDebug;
    if (!debug) throw new Error('jozorDebug seed API is unavailable');
    debug.seedTreeScenario({
      people: seededPeople,
      focusId: seededFocusId,
      role: 'owner',
      treeName: 'Focus Runtime Evidence Tree',
      user: owner,
    });
  }, { seededPeople: people, seededFocusId: focusId, owner: OWNER });
}

async function navigateToStudio(page: Page) {
  const accountTrigger = page.getByTestId('account-menu-trigger');
  await expect(accountTrigger).toBeVisible({ timeout: 15_000 });
  await accountTrigger.click();

  const vaultEntry = page.locator('button:visible').filter({ hasText: /The Vault/i }).last();
  await expect(vaultEntry).toBeVisible({ timeout: 10_000 });
  await vaultEntry.click();
  await expect(page.getByRole('heading', { name: /The Vault/i })).toBeVisible({ timeout: 15_000 });

  const exportNav = page.locator('button:visible').filter({ hasText: /Cloud|Export/i }).first();
  await expect(exportNav).toBeVisible({ timeout: 10_000 });
  await exportNav.click();

  const visualOutputs = page.getByRole('tab', { name: /Visual Outputs/i });
  await expect(visualOutputs).toBeVisible({ timeout: 15_000 });
  await visualOutputs.click();
  await expect(visualOutputs).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('visual-publishing-studio')).toBeVisible({ timeout: 15_000 });
}

async function activateFocus(page: Page) {
  await page.getByRole('tab', { name: 'Tree & Layout' }).click();
  const focusButton = page.getByRole('button', { name: 'Focus Family' });
  await expect(focusButton).toBeVisible();
  await focusButton.click();
  await expect(focusButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('focus-family-controls')).toBeVisible();
  await expect(page.locator('[data-poster-layout-engine="focus-family"]')).toBeVisible();
}

async function readDownload(download: Download, artifactName: string): Promise<Buffer> {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ARTIFACT_DIR, artifactName);
  await download.saveAs(filePath);
  return readFile(filePath);
}

test.describe('Visual Studio Phase 2B Focus runtime evidence', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await seedTreeScenario(page);
    await navigateToStudio(page);
  });

  test('downloads inspectable SVG, PNG, and PDF artifacts from the Focus scene', async ({ page }) => {
    await activateFocus(page);
    const focalSelect = page.getByTestId('focal-person-select');
    await expect(focalSelect).toHaveAccessibleName('Focal Person');
    await focalSelect.selectOption({ index: 1 });

    const downloads: Download[] = [];
    for (const format of ['SVG', 'PNG', 'PDF'] as const) {
      const downloadButton = page.getByRole('button', { name: `Download ${format}` });
      await expect(downloadButton).toBeEnabled({ timeout: 15_000 });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30_000 }),
        downloadButton.click(),
      ]);
      downloads.push(download);
    }

    const names = downloads.map((download) => download.suggestedFilename());
    expect(names[0]).toMatch(/\.svg$/i);
    expect(names[1]).toMatch(/\.png$/i);
    expect(names[2]).toMatch(/\.pdf$/i);
    const basenames = names.map((name) => name.replace(/\.(svg|png|pdf)$/i, ''));
    expect(new Set(basenames).size).toBe(1);
    for (const name of names) {
      expect(name).not.toMatch(/raw-|session-token|preview-node|focus-family/i);
    }

    const svg = (await readDownload(downloads[0], 'focus-runtime.svg')).toString('utf8');
    expect(svg).toContain('data-poster-layout-engine="focus-family"');
    expect(svg).not.toMatch(/raw-(root|father|mother|spouse|sibling|child)-sentinel/i);
    expect(svg).not.toContain(OWNER.email);

    const png = await readDownload(downloads[1], 'focus-runtime.png');
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const pdf = await readDownload(downloads[2], 'focus-runtime.pdf');
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  test('masks living people and excludes raw identifiers from the Focus SVG', async ({ page }) => {
    await activateFocus(page);
    await page.getByRole('tab', { name: 'Tree & Layout' }).click();
    const maskedMode = page.getByRole('button', { name: 'Mask Living & Private Data' });
    await maskedMode.click();

    const svg = page.locator('[data-poster-layout-engine="focus-family"]');
    await expect(svg.locator('g.poster-node.is-masked')).not.toHaveCount(0);
    const markup = await svg.evaluate((element) => element.outerHTML);
    expect(markup).not.toContain('Living Root Sentinel');
    expect(markup).not.toMatch(/raw-(root|spouse|sibling|child)-sentinel/i);
  });

  test('supports keyboard activation and remains within the mobile viewport', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tree & Layout' }).focus();
    await page.keyboard.press('Enter');
    const focusButton = page.getByRole('button', { name: 'Focus Family' });
    await focusButton.focus();
    await expect(focusButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(focusButton).toHaveAttribute('aria-pressed', 'true');

    await page.setViewportSize({ width: 390, height: 844 });
    const tools = page.getByRole('button', { name: 'Tools' });
    await expect(tools).toBeVisible();
    await tools.click();
    const visualOutputs = page.getByRole('tab', { name: /Visual Outputs/i });
    await expect(visualOutputs).toBeVisible();
    await visualOutputs.click();
    const studio = page.getByTestId('visual-publishing-studio');
    await expect(studio).toBeVisible({ timeout: 15_000 });
    const overflow = await studio.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    await page.getByRole('tab', { name: 'Tree & Layout' }).click();
    await page.getByRole('button', { name: 'Focus Family' }).click();
    await expect(page.getByTestId('focus-family-controls')).toBeVisible();
  });

  test('blocks exports when dense Focus geometry exceeds A4 capacity', async ({ page }) => {
    await seedTreeScenario(page, createDensePeople(), 'dense-root-raw-sentinel');
    await navigateToStudio(page);
    await expect(page.getByTestId('visual-studio-print-dock')).toBeVisible();
    await page.getByRole('group', { name: 'Paper Size' }).getByRole('button', { name: 'A4' }).click();
    await page.getByRole('tab', { name: 'Tree & Layout' }).click();
    const focusButton = page.getByRole('button', { name: 'Focus Family' });
    await focusButton.click();
    await expect(focusButton).toHaveAttribute('aria-pressed', 'true');

    await expect(page.getByTestId('poster-capacity-error-guidance')).toBeVisible();
    await expect(page.getByTestId('poster-preview-unavailable')).toBeVisible();
    await expect(page.getByTestId('poster-print-readiness-summary')).toContainText('Print blocked');
    await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
  });
});
