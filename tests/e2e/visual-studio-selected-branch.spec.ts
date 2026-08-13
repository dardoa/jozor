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
  lastName: 'Selected Branch QA',
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
  email: 'private-branch-person@example.test',
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

const PEOPLE = {
  'raw-branch-root-sentinel': person('raw-branch-root-sentinel', 'Branch Root', {
    parents: ['raw-branch-parent-sentinel'],
    spouses: ['raw-branch-spouse-sentinel'],
    children: ['raw-branch-child-sentinel'],
  }, {
    website: 'https://private-storage-sentinel.supabase.co/root.jpg',
    bio: 'Bearer private-branch-auth-token',
  }),
  'raw-branch-spouse-sentinel': person('raw-branch-spouse-sentinel', 'Branch Spouse', {
    spouses: ['raw-branch-root-sentinel'],
    children: ['raw-branch-child-sentinel'],
  }, { gender: 'female' }),
  'raw-branch-child-sentinel': person('raw-branch-child-sentinel', 'Branch Child', {
    parents: ['raw-branch-root-sentinel', 'raw-branch-spouse-sentinel'],
    children: ['raw-branch-grandchild-sentinel'],
  }),
  'raw-branch-grandchild-sentinel': person('raw-branch-grandchild-sentinel', 'Branch Grandchild', {
    parents: ['raw-branch-child-sentinel'],
  }),
  'raw-branch-parent-sentinel': person('raw-branch-parent-sentinel', 'Excluded Parent', {
    children: ['raw-branch-root-sentinel', 'raw-sibling-branch-sentinel'],
  }),
  'raw-sibling-branch-sentinel': person('raw-sibling-branch-sentinel', 'Excluded Sibling Branch', {
    parents: ['raw-branch-parent-sentinel'],
  }),
};

const OWNER: DebugUser = {
  uid: 'selected-branch-e2e-owner',
  displayName: 'Selected Branch E2E Owner',
  email: 'selected-branch-owner@example.test',
  photoURL: '',
};

const EVIDENCE_DIR = path.resolve(
  'docs/reviews/evidence/visual-publishing-studio-selected-branch-owner-review-2026-08-13'
);
const UPDATE_VISUAL_EVIDENCE = process.env.UPDATE_VISUAL_EVIDENCE === '1';

const PRIVATE_SENTINELS = [
  'raw-branch-',
  'raw-sibling-branch-sentinel',
  'private-branch-person@example.test',
  'private-storage-sentinel.supabase.co',
  'private-branch-auth-token',
  OWNER.email,
];

async function seedTreeScenario(page: Page) {
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');
  await page.evaluate(({ people, owner }) => {
    const debug = (window as DebugWindow).jozorDebug;
    if (!debug) throw new Error('jozorDebug seed API is unavailable');
    debug.seedTreeScenario({
      people,
      focusId: 'raw-branch-root-sentinel',
      role: 'owner',
      treeName: 'Selected Branch Runtime Evidence Tree',
      user: owner,
    });
  }, { people: PEOPLE, owner: OWNER });
}

async function navigateToStudio(page: Page, mobile = false) {
  if (mobile) {
    const mobileActions = page.getByRole('navigation', { name: /Mobile actions/i });
    const vaultButton = mobileActions.getByRole('button', { name: /The Vault/i });
    await expect(vaultButton).toBeVisible({ timeout: 15_000 });
    await vaultButton.click();
    await expect(page.getByRole('heading', { name: /The Vault/i })).toBeVisible({ timeout: 15_000 });

    const toolsButton = page.getByRole('button', { name: /Tools/i }).first();
    await expect(toolsButton).toBeVisible({ timeout: 10_000 });
    await toolsButton.click();
  } else {
    const accountTrigger = page.getByTestId('account-menu-trigger');
    await expect(accountTrigger).toBeVisible({ timeout: 15_000 });
    await accountTrigger.click();

    const vaultEntry = page.locator('button:visible').filter({ hasText: /The Vault/i }).last();
    await expect(vaultEntry).toBeVisible({ timeout: 10_000 });
    await vaultEntry.click();
    await expect(page.getByRole('heading', { name: /The Vault/i })).toBeVisible({ timeout: 15_000 });

    const exportNav = page.locator('button:visible').filter({ hasText: /Cloud|Export/i }).first();
    await expect(exportNav).toBeVisible({ timeout: 10_000 });
    await exportNav.click({ force: true });
  }

  const visualOutputs = page.getByRole('tab', { name: /Visual Outputs/i });
  await expect(visualOutputs).toBeVisible({ timeout: 15_000 });
  await visualOutputs.click({ force: true });
  await expect(visualOutputs).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('visual-publishing-studio')).toBeVisible({ timeout: 15_000 });
}

async function readDownload(
  download: Download,
  evidenceFileName: string,
  writeEvidence: boolean
): Promise<Buffer> {
  if (writeEvidence) {
    await mkdir(EVIDENCE_DIR, { recursive: true });
    const evidencePath = path.join(EVIDENCE_DIR, evidenceFileName);
    await download.saveAs(evidencePath);
    return readFile(evidencePath);
  }

  const temporaryPath = await download.path();
  if (!temporaryPath) throw new Error('Playwright did not expose a local download path.');
  return readFile(temporaryPath);
}

test.describe('Visual Publishing Studio selected branch runtime', () => {
  test.setTimeout(120_000);

  test('selects one store-backed branch and exports private-safe SVG, PNG, and PDF artifacts', async ({ page, browserName }) => {
    const writeEvidence = UPDATE_VISUAL_EVIDENCE && browserName === 'chromium';
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedTreeScenario(page);
    await navigateToStudio(page);

    const selectedBranch = page.getByRole('button', { name: 'Selected Branch' });
    await expect(selectedBranch).toBeVisible();
    await selectedBranch.focus();
    await expect(selectedBranch).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(selectedBranch).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('tab', { name: 'Tree & Layout' }).click();
    await page.getByRole('button', { name: 'Show Full Recorded Data' }).click();

    const rootSelector = page.getByRole('combobox', { name: 'Focal Person (Root)' });
    await expect(rootSelector).toBeVisible();
    const selectedRootToken = await rootSelector.inputValue();
    expect(selectedRootToken).toMatch(/^session-token-/);
    const optionValues = await rootSelector.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value)
    );
    expect(optionValues.length).toBe(Object.keys(PEOPLE).length);
    expect(optionValues.every((value) => /^session-token-/.test(value))).toBe(true);

    const preview = page.getByTestId('visual-studio-preview-pane');
    await expect(preview).toContainText('People visible: 4');
    const svg = page.locator('[data-poster-layout-engine="descendant-tiered"]');
    await expect(svg).toBeVisible();
    const previewMarkup = await svg.evaluate((element) => element.outerHTML);
    expect(previewMarkup).toContain('Branch Root');
    expect(previewMarkup).toContain('Branch Spouse');
    expect(previewMarkup).toContain('Branch Child');
    expect(previewMarkup).toContain('Branch Grandchild');
    expect(previewMarkup).not.toContain('Excluded Parent');
    expect(previewMarkup).not.toContain('Excluded Sibling Branch');
    expect(previewMarkup).toContain('Scope: selected branch');
    expect(previewMarkup).not.toContain('data-card-field="relationship"');
    for (const sentinel of PRIVATE_SENTINELS) expect(previewMarkup).not.toContain(sentinel);

    const studio = page.getByTestId('visual-publishing-studio');
    if (writeEvidence) {
      await mkdir(EVIDENCE_DIR, { recursive: true });
      await studio.evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'selected-branch-desktop-1440x900.png'),
        fullPage: false,
      });
    }

    const downloads: Download[] = [];
    for (const format of ['SVG', 'PNG', 'PDF'] as const) {
      const button = page.getByRole('button', { name: `Download ${format}` });
      await expect(button).toBeEnabled({ timeout: 15_000 });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30_000 }),
        button.click(),
      ]);
      downloads.push(download);
    }

    const fileNames = downloads.map((download) => download.suggestedFilename());
    expect(fileNames[0]).toMatch(/\.svg$/i);
    expect(fileNames[1]).toMatch(/\.png$/i);
    expect(fileNames[2]).toMatch(/\.pdf$/i);
    expect(new Set(fileNames.map((name) => name.replace(/\.(svg|png|pdf)$/i, ''))).size).toBe(1);
    for (const fileName of fileNames) {
      for (const sentinel of PRIVATE_SENTINELS) expect(fileName).not.toContain(sentinel);
      expect(fileName).not.toMatch(/session-token|preview-node|descendant-tiered/i);
    }

    const exportedSvg = (await readDownload(downloads[0], 'selected-branch.svg', writeEvidence)).toString('utf8');
    expect(exportedSvg).toContain('data-poster-layout-engine="descendant-tiered"');
    expect(exportedSvg).not.toContain('Excluded Sibling Branch');
    expect(exportedSvg).toContain('Scope: selected branch');
    expect(exportedSvg).not.toContain('data-card-field="relationship"');
    for (const sentinel of PRIVATE_SENTINELS) expect(exportedSvg).not.toContain(sentinel);

    const png = await readDownload(downloads[1], 'selected-branch.png', writeEvidence);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const pdf = await readDownload(downloads[2], 'selected-branch.pdf', writeEvidence);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  test('keeps the selected branch preview usable at the mobile review viewport', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedTreeScenario(page);
    await navigateToStudio(page, true);

    const selectedBranch = page.getByRole('button', { name: 'Selected Branch' });
    await selectedBranch.click();
    await page.getByRole('tab', { name: 'Tree & Layout' }).click();
    await page.getByRole('button', { name: 'Show Full Recorded Data' }).click();

    const studio = page.getByTestId('visual-publishing-studio');
    await expect(studio).toBeVisible();
    const overflow = await studio.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    const previewToggle = page.getByTestId('visual-studio-mobile-preview-toggle');
    await expect(previewToggle).toBeVisible();
    await previewToggle.click();
    await expect(previewToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.locator('#mobile-preview-container').getByTestId('visual-studio-preview-pane')
    ).toContainText('People visible: 4');
    if (UPDATE_VISUAL_EVIDENCE && browserName === 'chromium') {
      await studio.evaluate((element) => element.scrollIntoView({ block: 'start' }));
      await mkdir(EVIDENCE_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'selected-branch-mobile-390x844.png'),
        fullPage: false,
      });
    }
  });
});
