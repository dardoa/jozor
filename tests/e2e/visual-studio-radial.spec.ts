import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
  lastName: 'Radial QA Family',
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
  email: 'sensitive-person-email@example.test',
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
  'raw-root-sentinel': person('raw-root-sentinel', 'Radial Root Sentinel', {
    parents: ['raw-father-sentinel', 'raw-mother-sentinel'],
    spouses: ['raw-spouse-sentinel'],
    children: ['raw-child-1', 'raw-child-2'],
  }, {
    website: 'https://storage-url-sentinel.supabase.co/private/person.jpg',
    bio: 'Bearer auth-token-sentinel-value',
    address: 'preview-node-sentinel-value',
  }),
  'raw-father-sentinel': person('raw-father-sentinel', 'Public Father', {
    parents: ['raw-gf-paternal', 'raw-gm-paternal'],
    spouses: ['raw-mother-sentinel'],
    children: ['raw-root-sentinel'],
  }, { isDeceased: true, deathDate: '2015', birthDate: '1950' }),
  'raw-mother-sentinel': person('raw-mother-sentinel', 'Public Mother', {
    spouses: ['raw-father-sentinel'],
    children: ['raw-root-sentinel'],
  }, { gender: 'female', isDeceased: true, deathDate: '2020', birthDate: '1955' }),
  'raw-gf-paternal': person('raw-gf-paternal', 'Grandfather Paternal', {
    children: ['raw-father-sentinel'],
  }, { isDeceased: true }),
  'raw-gm-paternal': person('raw-gm-paternal', 'Grandmother Paternal', {
    children: ['raw-father-sentinel'],
  }, { gender: 'female', isDeceased: true }),
  'raw-spouse-sentinel': person('raw-spouse-sentinel', 'Living Spouse Sentinel', {
    spouses: ['raw-root-sentinel'],
  }, { gender: 'female' }),
  'raw-child-1': person('raw-child-1', 'Child One', {
    parents: ['raw-root-sentinel'],
  }),
  'raw-child-2': person('raw-child-2', 'Child Two', {
    parents: ['raw-root-sentinel'],
  }),
};

const DENSE_6_LEVEL_CHAIN = (): Record<string, unknown> => {
  const chain: Record<string, unknown> = {};
  for (let i = 0; i <= 6; i++) {
    const id = `chain-node-${i}`;
    const nextId = `chain-node-${i + 1}`;
    chain[id] = person(id, `Chain Node ${i}`, {
      children: i < 6 ? [nextId] : [],
      parents: i > 0 ? [`chain-node-${i - 1}`] : [],
    });
  }
  return chain;
};

const OWNER: DebugUser = {
  uid: 'radial-e2e-owner',
  displayName: 'Radial E2E Owner',
  email: 'radial-e2e@example.test',
  photoURL: '',
};

const ARTIFACT_DIR = path.resolve(tmpdir(), 'visual-studio-radial');
const PRIVATE_SENTINELS = [
  'raw-root-sentinel',
  'raw-father-sentinel',
  'radial-e2e@example.test',
  'sensitive-person-email@example.test',
  'storage-url-sentinel.supabase.co',
  'auth-token-sentinel-value',
  'preview-node-sentinel-value',
];

const expectSafeFilename = (fileName: string) => {
  for (const sentinel of PRIVATE_SENTINELS) expect(fileName).not.toContain(sentinel);
  expect(fileName).not.toMatch(/person_|radial-generations|classic-ancestor-poster|undefined/i);
  expect(fileName).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
};

async function seedTreeScenario(
  page: Page,
  people: Record<string, unknown> = STANDARD_PEOPLE,
  focusId = 'raw-root-sentinel'
) {
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');
  await page.evaluate(
    ({ seededPeople, seededFocusId, owner }) => {
      const debug = (window as DebugWindow).jozorDebug;
      if (!debug) throw new Error('jozorDebug seed API is unavailable');
      debug.seedTreeScenario({
        people: seededPeople,
        focusId: seededFocusId,
        role: 'owner',
        treeName: 'Radial Runtime Evidence Tree',
        user: owner,
      });
    },
    { seededPeople: people, seededFocusId: focusId, owner: OWNER }
  );
}

async function navigateToStudio(page: Page, viewportWidth = 1280) {
  if (viewportWidth <= 767) {
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

async function activateRadial(page: Page) {
  await page.getByRole('tab', { name: 'Tree & Layout' }).click();
  const radialButton = page.getByRole('button', { name: /Radial \/ Fan/i });
  await expect(radialButton).toBeVisible();
  await radialButton.click();
  await expect(radialButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('radial-controls-section')).toBeVisible();
}

async function readDownload(download: Download, artifactName: string): Promise<Buffer> {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const targetPath = path.join(ARTIFACT_DIR, artifactName);
  await download.saveAs(targetPath);
  return readFile(targetPath);
}

test.describe('Visual Publishing Studio — Phase 3B Radial Mandatory E2E Suite', () => {
  test.setTimeout(90_000);

  test('activates Radial layout, controls 180°/360° span & scope, and verifies export signatures and security sentinels', async ({ page }) => {
    await seedTreeScenario(page);
    await navigateToStudio(page);
    await activateRadial(page);

    // 1. Check Radial controls
    const span180Btn = page.getByRole('button', { name: '180° Half Fan' });
    const span360Btn = page.getByRole('button', { name: '360° Full Circle' });
    await expect(span180Btn).toBeVisible();
    await expect(span360Btn).toBeVisible();

    // Select 180° Half Fan
    await span180Btn.click();
    await expect(span180Btn).toHaveAttribute('aria-pressed', 'true');

    // 2. Export SVG & mandatory security scan
    const svgBtn = page.getByRole('button', { name: 'Download SVG' });
    await expect(svgBtn).toBeEnabled({ timeout: 45_000 });
    const svgDownloadPromise = page.waitForEvent('download');
    await svgBtn.click();
    const svgDownload = await svgDownloadPromise;
    const svgFilename = svgDownload.suggestedFilename();
    expectSafeFilename(svgFilename);

    const svgBuffer = await readDownload(svgDownload, 'radial-ancestors-180.svg');
    const svgText = svgBuffer.toString('utf-8');

    expect(svgText).toContain('<svg');
    // Mandatory Security Sentinel Scan
    for (const sentinel of PRIVATE_SENTINELS) expect(svgText).not.toContain(sentinel);
    expect(svgText).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);

    // 3. Export PNG & mandatory signature verification
    const pngBtn = page.getByRole('button', { name: 'Download PNG' });
    await expect(pngBtn).toBeEnabled({ timeout: 45_000 });
    const pngDownloadPromise = page.waitForEvent('download');
    await pngBtn.click();
    const pngDownload = await pngDownloadPromise;
    expectSafeFilename(pngDownload.suggestedFilename());
    const pngBuffer = await readDownload(pngDownload, 'radial-ancestors-180.png');
    // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(pngBuffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    for (const sentinel of PRIVATE_SENTINELS) expect(pngBuffer.toString('latin1')).not.toContain(sentinel);

    // 4. Export PDF & mandatory signature / single page verification
    const pdfBtn = page.getByRole('button', { name: 'Download PDF' });
    await expect(pdfBtn).toBeEnabled({ timeout: 45_000 });
    const pdfDownloadPromise = page.waitForEvent('download');
    await pdfBtn.click();
    const pdfDownload = await pdfDownloadPromise;
    expectSafeFilename(pdfDownload.suggestedFilename());
    const pdfBuffer = await readDownload(pdfDownload, 'radial-ancestors-180.pdf');
    // PDF Magic Bytes: %PDF-
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    // Single page output assertion (only 1 /Type /Page instance)
    const pdfContent = pdfBuffer.toString('utf-8');
    for (const sentinel of PRIVATE_SENTINELS) expect(pdfContent).not.toContain(sentinel);
    const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g) || [];
    expect(pageMatches.length).toBe(1);
  });

  test('asserts actual 180° vs 360° geometry differences', async ({ page }) => {
    await seedTreeScenario(page);
    await navigateToStudio(page);
    await activateRadial(page);

    const span360Btn = page.getByRole('button', { name: '360° Full Circle' });
    await span360Btn.click();
    await expect(span360Btn).toHaveAttribute('aria-pressed', 'true');

    const readGeometry = () => page.locator(
      '[data-poster-layout-engine="radial-generations"] .poster-node'
    ).evaluateAll((nodes) => nodes.map((node) => ({
      id: node.getAttribute('data-preview-node'),
      x: node.getAttribute('data-scene-x'),
      y: node.getAttribute('data-scene-y'),
    })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
    const geometry360 = await readGeometry();
    expect(geometry360.length).toBeGreaterThan(1);

    const span180Btn = page.getByRole('button', { name: '180° Half Fan' });
    await span180Btn.click();
    await expect(span180Btn).toHaveAttribute('aria-pressed', 'true');

    await expect.poll(readGeometry).not.toEqual(geometry360);
    const geometry180 = await readGeometry();
    expect(geometry180.map(({ id }) => id)).toEqual(geometry360.map(({ id }) => id));
    expect(geometry180).not.toEqual(geometry360);
  });

  test('switches scope between ancestors and descendants in Radial mode', async ({ page }) => {
    await seedTreeScenario(page);
    await navigateToStudio(page);
    await activateRadial(page);

    // Select Descendants scope
    const descScopeBtn = page.getByTestId('radial-scope-control').getByRole('button', { name: 'Descendants' });
    await descScopeBtn.click();
    await expect(descScopeBtn).toHaveAttribute('aria-pressed', 'true');

    // Export SVG for Descendants
    const svgBtn = page.getByRole('button', { name: 'Download SVG' });
    await expect(svgBtn).toBeEnabled({ timeout: 45_000 });
    const svgDownloadPromise = page.waitForEvent('download');
    await svgBtn.click();
    const svgDownload = await svgDownloadPromise;
    const svgBuffer = await readDownload(svgDownload, 'radial-descendants-360.svg');
    const svgText = svgBuffer.toString('utf-8');
    expect(svgText).toContain('<svg');
  });

  test('verifies keyboard traversal and focus accessibility', async ({ page }) => {
    await seedTreeScenario(page);
    await navigateToStudio(page);
    await activateRadial(page);

    // Traverse from the 360° control to the 180° control with the keyboard.
    const span360Btn = page.getByRole('button', { name: '360° Full Circle' });
    const span180Btn = page.getByRole('button', { name: '180° Half Fan' });
    await span360Btn.click();
    await expect(span360Btn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(span180Btn).toBeFocused();
    await page.keyboard.press('Space');
    await expect(span180Btn).toHaveAttribute('aria-pressed', 'true');
  });

  test('keeps the Radial workspace reachable without horizontal overflow at 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedTreeScenario(page);
    await navigateToStudio(page, 390);
    await activateRadial(page);

    await expect(page.getByTestId('radial-controls-section')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.bodyClientWidth);
    expect(dimensions.documentScrollWidth).toBeLessThanOrEqual(dimensions.documentClientWidth);
    await expect(page.getByRole('button', { name: 'Download SVG' })).toBeVisible();
  });

  test('handles controlled blocked capacity in Radial mode with zero downloads and guidance banner', async ({ page }) => {
    await seedTreeScenario(page, DENSE_6_LEVEL_CHAIN(), 'chain-node-0');
    await navigateToStudio(page);
    await activateRadial(page);

    // Select Descendants scope so 6-level chain occupies 6 rings
    const descBtn = page.getByTestId('radial-scope-control').getByRole('button', { name: 'Descendants' });
    await expect(descBtn).toBeVisible();
    await descBtn.click();
    await expect(descBtn).toHaveAttribute('aria-pressed', 'true');


    // Select 6 rings on small paper (A4) to force capacity failure

    await expect(page.getByTestId('visual-studio-print-dock')).toBeVisible();
    const a4Btn = page.getByRole('button', { name: 'A4' });
    await expect(a4Btn).toBeVisible();
    await a4Btn.click();

    await page.getByRole('tab', { name: 'Tree & Layout' }).click();
    const rings6Btn = page.getByTestId('radial-rings-control').getByRole('button', { name: '6' });
    await expect(rings6Btn).toBeVisible();
    await rings6Btn.click();
    await expect(rings6Btn).toHaveAttribute('aria-pressed', 'true');

    await expect(page.getByTestId('poster-capacity-error-guidance')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('poster-preview-unavailable')).toBeVisible();
    await expect(page.getByTestId('poster-print-readiness-summary')).toContainText('Print blocked');

    // Export buttons should be disabled or blocked when in capacity error state
    const svgButton = page.getByRole('button', { name: 'Download SVG' });
    await expect(svgButton).toBeDisabled();

    const pngButton = page.getByRole('button', { name: 'Download PNG' });
    await expect(pngButton).toBeDisabled();

    const pdfButton = page.getByRole('button', { name: 'Download PDF' });
    await expect(pdfButton).toBeDisabled();

    // Assert zero emitted downloads on click
    let downloadCount = 0;
    page.on('download', () => { downloadCount += 1; });

    await svgButton.click({ force: true });
    await pngButton.click({ force: true });
    await pdfButton.click({ force: true });
    await page.waitForTimeout(600);
    expect(downloadCount).toBe(0);
  });
});
