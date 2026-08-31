import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Download, type Locator, type Page } from '@playwright/test';

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

type FocusScenario = {
  slug: string;
  title: string;
  language: 'ar' | 'en';
  people: Record<string, unknown>;
  focusId: string;
  paper: 'A4' | 'A3' | 'A2';
  orientation: 'portrait' | 'landscape';
  direction: 'vertical' | 'horizontal';
  ancestorDepth: 1 | 2 | 3 | 4;
  descendantDepth: 1 | 2 | 3 | 4;
  includeSpouses: boolean;
  includeSiblings: boolean;
  privacy: 'owner-full' | 'masked';
  expectedNodeCount: number;
};

type FocusEvidenceRecord = {
  scenario: string;
  status: 'exported' | 'expected-blocked';
  language: 'ar' | 'en';
  paper: string;
  orientation: string;
  direction: string;
  ancestorDepth: number;
  descendantDepth: number;
  nodeCount: number;
  connectorCount: number;
  overlapCount?: number;
  outOfBoundsCount?: number;
  focalCenterOffset?: number;
  minimumNameFontPt?: number;
  pngWidth?: number;
  pngHeight?: number;
  hashes?: Record<string, string>;
  capacityMessage?: string;
};

const UPDATE_VISUAL_EVIDENCE = process.env.UPDATE_VISUAL_EVIDENCE === '1';
const FINAL_EVIDENCE_DIR = path.resolve(
  'docs/reviews/evidence/visual-publishing-studio-phase-2c-focus-owner-review-2026-08-14'
);
const STAGING_EVIDENCE_DIR = path.resolve('.staging-phase-2c-focus-owner-review');
const TEMP_EVIDENCE_DIR = path.resolve('output/playwright/visual-studio-focus-owner-review');
const ACTIVE_EVIDENCE_DIR = UPDATE_VISUAL_EVIDENCE ? STAGING_EVIDENCE_DIR : TEMP_EVIDENCE_DIR;
const OWNER: DebugUser = {
  uid: 'focus-owner-review',
  displayName: 'Focus Owner Review',
  email: 'focus-owner-private@example.test',
  photoURL: '',
};
const PRIVATE_SENTINELS = [
  'raw-',
  OWNER.email,
  'focus-private-address-sentinel',
  'focus-private-note-sentinel',
  'focus-storage-sentinel.supabase.co',
];
const evidenceRecords: FocusEvidenceRecord[] = [];

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
  lastName: '',
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
  email: 'focus-private-person@example.test',
  website: 'https://focus-storage-sentinel.supabase.co/private',
  blog: '',
  address: 'focus-private-address-sentinel',
  notes: 'focus-private-note-sentinel',
  parents: relationships.parents ?? [],
  spouses: relationships.spouses ?? [],
  children: relationships.children ?? [],
  partnerDetails: {},
  isPrivate: false,
  ...overrides,
});

function focalOnlyFixture(prefix: string): Record<string, unknown> {
  const root = `raw-${prefix}-root`;
  return { [root]: person(root, 'Single Focal Person', {}, { isDeceased: true, deathDate: '2020' }) };
}

function balancedFixture(prefix: string, arabic = false): Record<string, unknown> {
  const id = (name: string) => `raw-${prefix}-${name}`;
  const root = id('root');
  const father = id('father');
  const mother = id('mother');
  const spouse = id('spouse');
  const sibling = id('sibling');
  const childOne = id('child-1');
  const childTwo = id('child-2');
  const grandchild = id('grandchild');
  const paternalGrandfather = id('paternal-grandfather');
  const paternalGrandmother = id('paternal-grandmother');
  const maternalGrandfather = id('maternal-grandfather');
  const maternalGrandmother = id('maternal-grandmother');
  const names = arabic ? {
    root: 'عبد الرحمن بن مصطفى آل النور التميمي',
    father: 'مصطفى بن إبراهيم آل النور',
    mother: 'مريم بنت عبد الكريم السعدي',
    spouse: 'ليلى بنت أحمد عبد السلام',
    sibling: 'سليمان بن مصطفى آل النور',
    childOne: 'يوسف بن عبد الرحمن آل النور',
    childTwo: 'نور الهدى بنت عبد الرحمن آل النور',
    grandchild: 'إبراهيم بن يوسف بن عبد الرحمن آل النور',
  } : {
    root: 'Balanced Focal Person', father: 'Paternal Father', mother: 'Maternal Mother',
    spouse: 'Focal Spouse', sibling: 'Focal Sibling', childOne: 'First Child',
    childTwo: 'Second Child', grandchild: 'First Grandchild',
  };
  return {
    [root]: person(root, names.root, { parents: [father, mother], spouses: [spouse], children: [childOne, childTwo] }),
    [father]: person(father, names.father, { parents: [paternalGrandfather, paternalGrandmother], children: [root, sibling] }, { isDeceased: true, birthDate: '1948', deathDate: '2018' }),
    [mother]: person(mother, names.mother, { parents: [maternalGrandfather, maternalGrandmother], children: [root] }, { gender: 'female', isDeceased: true, birthDate: '1952', deathDate: '2022' }),
    [spouse]: person(spouse, names.spouse, { spouses: [root], children: [childOne, childTwo] }, { gender: 'female' }),
    [sibling]: person(sibling, names.sibling, { parents: [father] }),
    [childOne]: person(childOne, names.childOne, { parents: [root, spouse], children: [grandchild] }, { birthDate: '2005' }),
    [childTwo]: person(childTwo, names.childTwo, { parents: [root, spouse] }, { gender: 'female', birthDate: '2008' }),
    [grandchild]: person(grandchild, names.grandchild, { parents: [childOne] }, { birthDate: '2030' }),
    [paternalGrandfather]: person(paternalGrandfather, arabic ? 'إبراهيم بن محمود آل النور' : 'Paternal Grandfather', { children: [father] }, { isDeceased: true, birthDate: '1918', deathDate: '1990' }),
    [paternalGrandmother]: person(paternalGrandmother, arabic ? 'آمنة بنت سالم الحربي' : 'Paternal Grandmother', { children: [father] }, { gender: 'female', isDeceased: true, birthDate: '1922', deathDate: '1998' }),
    [maternalGrandfather]: person(maternalGrandfather, arabic ? 'عبد الكريم بن صالح السعدي' : 'Maternal Grandfather', { children: [mother] }, { isDeceased: true, birthDate: '1920', deathDate: '1995' }),
    [maternalGrandmother]: person(maternalGrandmother, arabic ? 'فاطمة بنت علي الهاشمي' : 'Maternal Grandmother', { children: [mother] }, { gender: 'female', isDeceased: true, birthDate: '1925', deathDate: '2001' }),
  };
}

function ancestorChainFixture(prefix: string): Record<string, unknown> {
  const ids = Array.from({ length: 5 }, (_, index) => `raw-${prefix}-ancestor-${index}`);
  const child = `raw-${prefix}-child`;
  const people: Record<string, unknown> = {};
  ids.forEach((current, index) => {
    people[current] = person(current, `Ancestor Tier ${index}`, {
      parents: index < ids.length - 1 ? [ids[index + 1]!] : [],
      children: index === 0 ? [child] : [ids[index - 1]!],
    }, { isDeceased: index > 0, deathDate: index > 0 ? String(2020 - index * 12) : '' });
  });
  people[child] = person(child, 'Single Descendant', { parents: [ids[0]!] });
  return people;
}

function descendantChainFixture(prefix: string): Record<string, unknown> {
  const ids = Array.from({ length: 5 }, (_, index) => `raw-${prefix}-descendant-${index}`);
  const parent = `raw-${prefix}-parent`;
  const people: Record<string, unknown> = {
    [parent]: person(parent, 'Single Ancestor', { children: [ids[0]!] }, { isDeceased: true, deathDate: '2010' }),
  };
  ids.forEach((current, index) => {
    people[current] = person(current, `Descendant Tier ${index}`, {
      parents: index === 0 ? [parent] : [ids[index - 1]!],
      children: index < ids.length - 1 ? [ids[index + 1]!] : [],
    });
  });
  return people;
}

function denseFixture(prefix: string): Record<string, unknown> {
  const root = `raw-${prefix}-root`;
  const children = Array.from({ length: 16 }, (_, index) => `raw-${prefix}-child-${index + 1}`);
  const people: Record<string, unknown> = {
    [root]: person(root, 'Dense Capacity Root', { children }),
  };
  children.forEach((child, index) => {
    people[child] = person(child, `Dense Child ${index + 1}`, { parents: [root] });
  });
  return people;
}

const SCENARIOS: FocusScenario[] = [
  {
    slug: '01-focal-only-a4-portrait', title: 'Focal Person Portrait', language: 'en',
    people: focalOnlyFixture('single'), focusId: 'raw-single-root', paper: 'A4', orientation: 'portrait',
    direction: 'vertical', ancestorDepth: 1, descendantDepth: 1, includeSpouses: false,
    includeSiblings: false, privacy: 'owner-full', expectedNodeCount: 1,
  },
  {
    slug: '02-balanced-vertical-a3', title: 'Balanced Family Focus', language: 'en',
    people: balancedFixture('balanced-v'), focusId: 'raw-balanced-v-root', paper: 'A3', orientation: 'portrait',
    direction: 'vertical', ancestorDepth: 2, descendantDepth: 2, includeSpouses: true,
    includeSiblings: true, privacy: 'owner-full', expectedNodeCount: 12,
  },
  {
    slug: '03-balanced-horizontal-a3', title: 'Horizontal Family Focus', language: 'en',
    people: balancedFixture('balanced-h'), focusId: 'raw-balanced-h-root', paper: 'A3', orientation: 'landscape',
    direction: 'horizontal', ancestorDepth: 2, descendantDepth: 2, includeSpouses: true,
    includeSiblings: true, privacy: 'owner-full', expectedNodeCount: 12,
  },
  {
    slug: '04-arabic-long-names-a2', title: 'لوحة العائلة حول عبد الرحمن', language: 'ar',
    people: balancedFixture('arabic', true), focusId: 'raw-arabic-root', paper: 'A2', orientation: 'landscape',
    direction: 'horizontal', ancestorDepth: 2, descendantDepth: 2, includeSpouses: true,
    includeSiblings: true, privacy: 'owner-full', expectedNodeCount: 12,
  },
  {
    slug: '05-masked-living-private-a3', title: 'Protected Family Focus', language: 'en',
    people: balancedFixture('masked'), focusId: 'raw-masked-root', paper: 'A3', orientation: 'portrait',
    direction: 'vertical', ancestorDepth: 2, descendantDepth: 2, includeSpouses: true,
    includeSiblings: true, privacy: 'masked', expectedNodeCount: 12,
  },
  {
    slug: '06-ancestor-heavy-4-1-a2', title: 'Four Generations Above', language: 'en',
    people: ancestorChainFixture('ancestor-heavy'), focusId: 'raw-ancestor-heavy-ancestor-0', paper: 'A2', orientation: 'portrait',
    direction: 'vertical', ancestorDepth: 4, descendantDepth: 1, includeSpouses: false,
    includeSiblings: false, privacy: 'owner-full', expectedNodeCount: 6,
  },
  {
    slug: '07-descendant-heavy-1-4-a2', title: 'Four Generations Below', language: 'en',
    people: descendantChainFixture('descendant-heavy'), focusId: 'raw-descendant-heavy-descendant-0', paper: 'A2', orientation: 'landscape',
    direction: 'horizontal', ancestorDepth: 1, descendantDepth: 4, includeSpouses: false,
    includeSiblings: false, privacy: 'owner-full', expectedNodeCount: 6,
  },
];

async function seedScenario(page: Page, scenario: Pick<FocusScenario, 'people' | 'focusId' | 'language'>) {
  await page.addInitScript((language) => localStorage.setItem('language', language), scenario.language);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');
  await page.evaluate(({ people, focusId, owner }) => {
    const debug = (window as DebugWindow).jozorDebug;
    if (!debug) throw new Error('jozorDebug seed API is unavailable');
    debug.seedTreeScenario({ people, focusId, role: 'owner', treeName: 'Focus Owner Review Tree', user: owner });
  }, { people: scenario.people, focusId: scenario.focusId, owner: OWNER });
}

async function navigateToStudio(page: Page, language: 'ar' | 'en') {
  const accountTrigger = page.getByTestId('account-menu-trigger');
  await expect(accountTrigger).toBeVisible({ timeout: 15_000 });
  await accountTrigger.click();
  const vaultEntry = page.locator('button:visible').filter({ hasText: /The Vault|الخزينة/i }).last();
  await expect(vaultEntry).toBeVisible({ timeout: 10_000 });
  await vaultEntry.click();
  await expect(page.getByRole('heading', { name: /The Vault|الخزينة/i })).toBeVisible({ timeout: 15_000 });
  const exportNav = page.locator('button:visible').filter({ hasText: /Cloud|Export|التصدير|السحابة/i }).first();
  await expect(exportNav).toBeVisible({ timeout: 10_000 });
  await exportNav.click({ force: true });
  const visualOutputs = page.getByRole('tab', { name: /Visual Outputs|المخرجات البصرية/i });
  await expect(visualOutputs).toBeVisible({ timeout: 15_000 });
  await visualOutputs.click({ force: true });
  await expect(page.getByTestId('visual-publishing-studio')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('tab', { name: language === 'ar' ? /الشجرة والتخطيط/ : 'Tree & Layout' })).toBeVisible();
}

async function openTreeLayout(page: Page, language: 'ar' | 'en') {
  const tab = page.getByRole('tab', { name: language === 'ar' ? /الشجرة والتخطيط/ : 'Tree & Layout' });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function activateFocus(page: Page, language: 'ar' | 'en') {
  await openTreeLayout(page, language);
  const button = page.getByRole('button', { name: language === 'ar' ? /حول شخص/ : 'Around a Person' });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('focus-family-controls')).toBeVisible();
}

async function setPressedButton(group: Locator, name: string) {
  const button = group.getByRole('button', { name, exact: true });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function setCheckbox(page: Page, testId: string, checked: boolean) {
  const checkbox = page.getByTestId(testId);
  await expect(checkbox).toBeVisible();
  if ((await checkbox.isChecked()) !== checked) await checkbox.click();
  if (checked) await expect(checkbox).toBeChecked();
  else await expect(checkbox).not.toBeChecked();
}

async function configureScenario(page: Page, scenario: FocusScenario) {
  await activateFocus(page, scenario.language);
  await setPressedButton(page.getByTestId('focus-ancestor-depth'), String(scenario.ancestorDepth));
  await setPressedButton(page.getByTestId('focus-descendant-depth'), String(scenario.descendantDepth));
  await setCheckbox(page, 'focus-include-spouses', scenario.includeSpouses);
  await setCheckbox(page, 'focus-include-siblings', scenario.includeSiblings);
  const directionName = scenario.direction === 'vertical'
    ? (scenario.language === 'ar' ? /عمودي/ : /Vertical/)
    : (scenario.language === 'ar' ? /أفقي/ : /Horizontal/);
  const direction = page.getByRole('group', { name: scenario.language === 'ar' ? 'اتجاه الشجرة' : 'Tree Flow Direction' })
    .getByRole('button', { name: directionName });
  await direction.click();
  await expect(direction).toHaveAttribute('aria-pressed', 'true');

  const privacyName = scenario.privacy === 'masked'
    ? (scenario.language === 'ar' ? /إخفاء الأحياء/ : 'Mask Living & Private Data')
    : (scenario.language === 'ar' ? /عرض جميع البيانات/ : 'Show Full Recorded Data');
  const quickSetup = page.getByRole('tab', { name: scenario.language === 'ar' ? /إعداد سريع/ : 'Quick Setup' });
  await quickSetup.click();
  await expect(quickSetup).toHaveAttribute('aria-selected', 'true');
  const privacy = page.getByRole('button', { name: privacyName });
  await privacy.click();
  await expect(privacy).toHaveAttribute('aria-pressed', 'true');

  const paper = page.getByRole('group', { name: scenario.language === 'ar' ? 'حجم الورق' : 'Paper Size' })
    .getByRole('button', { name: scenario.paper, exact: true });
  await paper.click();
  await expect(paper).toHaveAttribute('aria-pressed', 'true');
  const orientationName = scenario.orientation === 'portrait'
    ? (scenario.language === 'ar' ? 'عمودي' : 'Portrait')
    : (scenario.language === 'ar' ? 'أفقي' : 'Landscape');
  const orientation = page.getByRole('group', { name: scenario.language === 'ar' ? 'اتجاه الورق' : 'Paper orientation' })
    .getByRole('button', { name: orientationName, exact: true });
  await orientation.click();
  await expect(orientation).toHaveAttribute('aria-pressed', 'true');
}

function parseSvg(svg: string) {
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const numberAttribute = (name: string) => Number(svgTag.match(new RegExp(`${name}="([^"]+)"`))?.[1]);
  const sceneWidth = numberAttribute('width');
  const sceneHeight = numberAttribute('height');
  const physicalWidthMm = numberAttribute('data-physical-width-mm');
  const physicalHeightMm = numberAttribute('data-physical-height-mm');
  const shortPhysicalEdge = Math.min(physicalWidthMm, physicalHeightMm);
  const marginMm = shortPhysicalEdge === 210 ? 12.6 : shortPhysicalEdge === 297 ? 15 : 20;
  const margin = marginMm * (sceneWidth / physicalWidthMm);
  const headerHeight = sceneHeight * 0.12;
  const footerHeight = Math.max(48, sceneHeight * 0.04);
  const sectionGap = Math.max(24, sceneHeight * 0.018);
  const treeY = margin + headerHeight + sectionGap;
  const tree = {
    x: margin,
    y: treeY,
    width: sceneWidth - (margin * 2),
    height: sceneHeight - treeY - margin - footerHeight - sectionGap,
  };
  const nodes = [...svg.matchAll(/<g class="([^"]*poster-node[^"]*)"[^>]*data-preview-node="([^"]+)"[^>]*data-scene-x="([\d.-]+)"[^>]*data-scene-y="([\d.-]+)"[^>]*data-scene-width="([\d.-]+)"[^>]*data-scene-height="([\d.-]+)"/g)]
    .map((match) => ({
      id: match[2]!, isRoot: match[1]!.split(/\s+/).includes('is-root'),
      x: Number(match[3]), y: Number(match[4]), width: Number(match[5]), height: Number(match[6]),
    }));
  const overlapCount = nodes.flatMap((node, index) => nodes.slice(index + 1).map((other) => (
    node.x < other.x + other.width && node.x + node.width > other.x
      && node.y < other.y + other.height && node.y + node.height > other.y
  ))).filter(Boolean).length;
  const outOfBoundsCount = nodes.filter((node) => (
    node.x < tree.x - 0.1 || node.y < tree.y - 0.1
      || node.x + node.width > tree.x + tree.width + 0.1
      || node.y + node.height > tree.y + tree.height + 0.1
  )).length;
  const root = nodes.find((node) => node.isRoot);
  if (!root) throw new Error('Focus SVG is missing its focal root node');
  const rootCenter = { x: root.x + root.width / 2, y: root.y + root.height / 2 };
  const treeCenter = { x: tree.x + tree.width / 2, y: tree.y + tree.height / 2 };
  const focalCenterOffset = Math.hypot(rootCenter.x - treeCenter.x, rootCenter.y - treeCenter.y);
  const sceneUnitsToPoints = (physicalHeightMm / sceneHeight) * (72 / 25.4);
  const nameSizes = [...svg.matchAll(/class="poster-name"[^>]*font-size="([\d.]+)"/g)].map((match) => Number(match[1]));
  return {
    nodes, overlapCount, outOfBoundsCount, focalCenterOffset,
    connectorCount: (svg.match(/class="poster-connector/g) ?? []).length,
    minimumNameFontPt: Math.min(...nameSizes) * sceneUnitsToPoints,
  };
}

function hash(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function pngDimensions(buffer: Buffer) {
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function saveDownload(download: Download, fileName: string) {
  const filePath = path.join(ACTIVE_EVIDENCE_DIR, fileName);
  await download.saveAs(filePath);
  return readFile(filePath);
}

async function exportScenario(page: Page, scenario: FocusScenario) {
  const downloads: Download[] = [];
  for (const format of ['SVG', 'PNG', 'PDF'] as const) {
    const button = page.getByRole('button', { name: new RegExp(`(?:Download|تنزيل) ${format}`, 'i') });
    await expect(button).toBeEnabled({ timeout: 15_000 });
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), button.click()]);
    downloads.push(download);
  }
  const suggestedNames = downloads.map((download) => download.suggestedFilename());
  expect(new Set(suggestedNames.map((name) => name.replace(/\.(svg|png|pdf)$/i, ''))).size).toBe(1);
  suggestedNames.forEach((name) => expect(name).not.toMatch(/raw-|session-token|preview-node|focus-family/i));

  const svgBuffer = await saveDownload(downloads[0]!, `${scenario.slug}.svg`);
  const pngBuffer = await saveDownload(downloads[1]!, `${scenario.slug}.png`);
  const pdfBuffer = await saveDownload(downloads[2]!, `${scenario.slug}.pdf`);
  const svg = svgBuffer.toString('utf8');
  expect(svg).toContain('data-poster-layout-engine="focus-family"');
  PRIVATE_SENTINELS.forEach((sentinel) => expect(svg.toLowerCase()).not.toContain(sentinel.toLowerCase()));
  const parsed = parseSvg(svg);
  expect(parsed.nodes).toHaveLength(scenario.expectedNodeCount);
  expect(parsed.overlapCount).toBe(0);
  expect(parsed.outOfBoundsCount).toBe(0);
  expect(parsed.focalCenterOffset).toBeLessThan(0.2);
  expect(parsed.minimumNameFontPt).toBeGreaterThanOrEqual(8);
  const png = pngDimensions(pngBuffer);
  expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect((pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
  return {
    parsed, png,
    hashes: { svg: hash(svgBuffer), png: hash(pngBuffer), pdf: hash(pdfBuffer) },
  };
}

async function safeRename(source: string, destination: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rename(source, destination);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 125 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function exists(target: string) {
  try { await stat(target); return true; } catch { return false; }
}

test.describe.serial('Visual Publishing Studio Phase 2C Focus owner visual review', () => {
  test.setTimeout(150_000);

  test.beforeAll(async () => {
    await rm(ACTIVE_EVIDENCE_DIR, { recursive: true, force: true });
    await mkdir(ACTIVE_EVIDENCE_DIR, { recursive: true });
  });

  for (const scenario of SCENARIOS) {
    test(`${scenario.slug}: renders and exports a print-safe Focus poster`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seedScenario(page, scenario);
      await navigateToStudio(page, scenario.language);
      await configureScenario(page, scenario);
      const svg = page.locator('[data-poster-layout-engine="focus-family"]');
      await expect(svg).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId('poster-print-readiness-summary')).not.toContainText(/blocked|محجوب/i);
      const previewMarkup = await svg.evaluate((element) => element.outerHTML);
      PRIVATE_SENTINELS.forEach((sentinel) => expect(previewMarkup.toLowerCase()).not.toContain(sentinel.toLowerCase()));
      if (scenario.privacy === 'masked') {
        await expect(svg.locator('g.poster-node.is-masked')).not.toHaveCount(0);
        expect(previewMarkup).not.toContain('Balanced Focal Person');
      }
      await page.screenshot({ path: path.join(ACTIVE_EVIDENCE_DIR, `${scenario.slug}-preview.png`), fullPage: false });
      const result = await exportScenario(page, scenario);
      evidenceRecords.push({
        scenario: scenario.slug, status: 'exported', language: scenario.language,
        paper: scenario.paper, orientation: scenario.orientation, direction: scenario.direction,
        ancestorDepth: scenario.ancestorDepth, descendantDepth: scenario.descendantDepth,
        nodeCount: result.parsed.nodes.length, connectorCount: result.parsed.connectorCount,
        overlapCount: result.parsed.overlapCount, outOfBoundsCount: result.parsed.outOfBoundsCount,
        focalCenterOffset: result.parsed.focalCenterOffset,
        minimumNameFontPt: Math.round(result.parsed.minimumNameFontPt * 100) / 100,
        pngWidth: result.png.width, pngHeight: result.png.height, hashes: result.hashes,
      });
    });
  }

  test('08-dense-a4-capacity: blocks an overcrowded Focus composition without downloads', async ({ page }) => {
    const people = denseFixture('dense');
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedScenario(page, { people, focusId: 'raw-dense-root', language: 'en' });
    await navigateToStudio(page, 'en');
    const scenario: FocusScenario = {
      slug: '08-dense-a4-capacity', title: 'Dense Capacity Guard', language: 'en', people,
      focusId: 'raw-dense-root', paper: 'A4', orientation: 'portrait', direction: 'vertical',
      ancestorDepth: 1, descendantDepth: 1, includeSpouses: false, includeSiblings: false,
      privacy: 'owner-full', expectedNodeCount: 17,
    };
    await configureScenario(page, scenario);
    const guidance = page.getByTestId('poster-capacity-error-guidance');
    await expect(guidance).toBeVisible();
    const capacityMessage = (await guidance.textContent())?.trim() ?? '';
    expect(capacityMessage).toContain('Focus layout capacity exceeded');
    for (const format of ['SVG', 'PNG', 'PDF'] as const) {
      await expect(page.getByRole('button', { name: `Download ${format}` })).toBeDisabled();
    }
    await page.screenshot({ path: path.join(ACTIVE_EVIDENCE_DIR, '08-dense-a4-capacity-preview.png'), fullPage: false });
    evidenceRecords.push({
      scenario: scenario.slug, status: 'expected-blocked', language: 'en', paper: 'A4',
      orientation: 'portrait', direction: 'vertical', ancestorDepth: 1, descendantDepth: 1,
      nodeCount: 17, connectorCount: 0, capacityMessage,
    });
  });

  test.afterAll(async () => {
    const manifest = {
      generatedAt: new Date().toISOString(),
      phase: '2C',
      engine: 'focus-family',
      technicalStatus: 'pass',
      ownerVisualStatus: 'pending-owner-review',
      productionApproval: false,
      records: evidenceRecords,
    };
    await writeFile(path.join(ACTIVE_EVIDENCE_DIR, 'evidence-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    if (!UPDATE_VISUAL_EVIDENCE) return;

    const backup = `${FINAL_EVIDENCE_DIR}.backup-${Date.now()}`;
    const hadFinal = await exists(FINAL_EVIDENCE_DIR);
    try {
      if (hadFinal) await safeRename(FINAL_EVIDENCE_DIR, backup);
      await safeRename(STAGING_EVIDENCE_DIR, FINAL_EVIDENCE_DIR);
      if (hadFinal) await rm(backup, { recursive: true, force: true });
    } catch (error) {
      if (await exists(FINAL_EVIDENCE_DIR)) await rm(FINAL_EVIDENCE_DIR, { recursive: true, force: true });
      if (hadFinal && await exists(backup)) await safeRename(backup, FINAL_EVIDENCE_DIR);
      throw error;
    }
  });
});
