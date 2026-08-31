import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

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

type SceneNode = {
  id: string;
  generation: number;
  isRoot: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  nameFontSize: number;
  detailFontSize: number;
};

type SceneAnalysis = {
  width: number;
  height: number;
  physicalWidthMm: number;
  physicalHeightMm: number;
  nodes: SceneNode[];
  connectorCount: number;
  angularCoverageDegrees: number;
  engineId: string;
  treeBounds?: { x: number; y: number; width: number; height: number };
};

type EvidenceRecord = {
  scenario: string;
  status: 'exported' | 'expected-blocked';
  language: 'ar' | 'en';
  scope: 'ancestors' | 'descendants';
  span: '180-half-fan' | '360-full-circle';
  rings: number;
  paper: 'A3' | 'A2' | 'A4';
  nodeCount: number;
  connectorCount: number;
  angularCoverageDegrees?: number;
  minimumNameFontPt?: number;
  minimumDetailFontPt?: number;
  radialExtentUtilization?: number;
  occupiedWidthRatio?: number;
  occupiedHeightRatio?: number;
  centroidOffsetRatio?: number;
  cardCountChecked?: number;
  textBBoxCheckCount?: number;
  textBBoxFailureCount?: number;
  minimumObservedCardPadding?: number;
  pngWidth?: number;
  pngHeight?: number;
  derivedDpi?: number;
  hashes?: Record<string, string>;
  suggestedBasename?: string;
  capacityMessage?: string;
};

const FINAL_EVIDENCE_DIR = path.resolve(
  process.cwd(),
  'docs/reviews/evidence/visual-publishing-studio-phase-3c-radial-2026-08-03'
);
const STAGING_EVIDENCE_DIR = path.resolve(
  process.cwd(),
  '.staging-phase-3d-radial'
);
const BASE_EVIDENCE_DIR = STAGING_EVIDENCE_DIR;

function parseScene(svg: string): SceneAnalysis {
  const svgTag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const numberAttr = (name: string) => Number(svgTag.match(new RegExp(`${name}="([^"]+)"`))?.[1]);
  const engineId = svgTag.match(/data-poster-layout-engine="([^"]+)"/)?.[1] ?? '';
  const defaultDetailFontSize = Number(svg.match(/\.poster-years\b[^}]*font-size:\s*([\d.]+)px/)?.[1] ?? 11);

  const nodePattern = /<g class="(poster-node[^"]*)"[^>]*data-preview-node="([^"]+)"[^>]*data-generation="(\d+)"[^>]*data-scene-x="([\d.-]+)"[^>]*data-scene-y="([\d.-]+)"[^>]*data-scene-width="([\d.-]+)"[^>]*data-scene-height="([\d.-]+)"/g;
  const nodes: SceneNode[] = [];
  for (const match of svg.matchAll(nodePattern)) {
    const fullMatch = match[0];
    const matchIndex = match.index ?? 0;
    const nodeEndIndex = svg.indexOf('</g>', matchIndex);
    const nodeBlock = nodeEndIndex !== -1 ? svg.slice(matchIndex, nodeEndIndex + 4) : fullMatch;

    const nameFontMatch = nodeBlock.match(/class="poster-name"[^>]*font-size="([\d.]+)"/)
      || nodeBlock.match(/font-size="([\d.]+)"[^>]*class="poster-name"/);
    const nameFontSize = nameFontMatch ? Number(nameFontMatch[1]) : 16;

    const detailFontMatch = nodeBlock.match(/class="poster-(?:years|status|relationship|person-detail)"[^>]*font-size="([\d.]+)"/);
    const detailFontSize = detailFontMatch ? Number(detailFontMatch[1]) : defaultDetailFontSize;

    const x = Number(match[4]);
    const y = Number(match[5]);
    const width = Number(match[6]);
    const height = Number(match[7]);
    const cx = x + width / 2;
    const cy = y + height / 2;

    nodes.push({
      id: match[2]!,
      generation: Number(match[3]),
      isRoot: match[1]!.split(/\s+/).includes('is-root'),
      x,
      y,
      width,
      height,
      cx,
      cy,
      nameFontSize,
      detailFontSize,
    });
  }

  const root = nodes.find((node) => node.isRoot);
  const angles = root
    ? nodes.filter((node) => !node.isRoot).map((node) => {
        return (Math.atan2(node.cy - root.cy, node.cx - root.cx) * 180 / Math.PI + 360) % 360;
      }).sort((first, second) => first - second)
    : [];
  let angularCoverageDegrees = 0;
  if (angles.length > 1) {
    const gaps = angles.map((angle, index) => {
      const next = angles[(index + 1) % angles.length]!;
      return index === angles.length - 1 ? next + 360 - angle : next - angle;
    });
    angularCoverageDegrees = 360 - Math.max(...gaps);
  }

  const treeBoundsMatch = svg.match(/data-tree-bounds-x="([\d.-]+)"\s+data-tree-bounds-y="([\d.-]+)"\s+data-tree-bounds-width="([\d.-]+)"\s+data-tree-bounds-height="([\d.-]+)"/);
  const treeBounds = treeBoundsMatch ? {
    x: Number(treeBoundsMatch[1]),
    y: Number(treeBoundsMatch[2]),
    width: Number(treeBoundsMatch[3]),
    height: Number(treeBoundsMatch[4]),
  } : undefined;

  return {
    width: numberAttr('width'),
    height: numberAttr('height'),
    physicalWidthMm: numberAttr('data-physical-width-mm'),
    physicalHeightMm: numberAttr('data-physical-height-mm'),
    nodes,
    connectorCount: (svg.match(/class="poster-connector/g) ?? []).length,
    angularCoverageDegrees: Math.round(angularCoverageDegrees * 10) / 10,
    engineId,
    treeBounds,
  };
}


const OWNER: DebugUser = {
  uid: 'radial-review-owner',
  displayName: 'Radial Review Owner',
  email: 'radial-review@example.test',
  photoURL: '',
};

const evidenceRecords: EvidenceRecord[] = [];

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
  birthPlace: 'Cairo',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: true,
  profession: 'Scholar',
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

function ancestorFixture(prefix: string, dense: boolean): Record<string, unknown> {
  const root = `${prefix}-root`;
  const father = `${prefix}-father`;
  const mother = `${prefix}-mother`;
  const grandparents = Array.from({ length: 4 }, (_, index) => `${prefix}-grand-${index + 1}`);
  const greats = Array.from({ length: dense ? 8 : 3 }, (_, index) => `${prefix}-great-${index + 1}`);
  const people: Record<string, unknown> = {
    [root]: person(root, 'Nabil Family Root', { parents: [father, mother] }, { birthDate: '1978' }),
    [father]: person(father, 'Khalid Paternal Line', {
      parents: grandparents.slice(0, 2),
      children: [root],
    }, { birthDate: '1948', deathDate: '2018' }),
    [mother]: person(mother, 'Mariam Maternal Line', {
      parents: grandparents.slice(2, 4),
      children: [root],
    }, { gender: 'female', birthDate: '1952', deathDate: '2022' }),
  };

  grandparents.forEach((id, index) => {
    const child = index < 2 ? father : mother;
    const parentIds = dense ? [greats[index * 2]!, greats[index * 2 + 1]!] : (index < 3 ? [greats[index]!] : []);
    people[id] = person(id, `Grandparent Branch ${index + 1}`, {
      parents: parentIds,
      children: [child],
    }, { gender: index % 2 ? 'female' : 'male', birthDate: String(1918 + index * 4) });
  });

  if (dense) {
    greats.forEach((id, index) => {
      const gParent = grandparents[Math.floor(index / 2)]!;
      people[id] = person(id, `Great Ancestor ${index + 1}`, {
        children: [gParent],
      }, { birthDate: String(1884 + index * 3) });
    });
  }

  return people;
}

function descendantFixture(prefix: string, dense: boolean): Record<string, unknown> {
  const root = `${prefix}-root`;
  const childCount = dense ? 3 : 2;
  const children = Array.from({ length: childCount }, (_, index) => `${prefix}-child-${index + 1}`);
  const people: Record<string, unknown> = {
    [root]: person(root, 'Salim Descendant Root', { children }, { birthDate: '1945' }),
  };

  children.forEach((childId, childIndex) => {
    const grandchildren = Array.from(
      { length: 2 },
      (_, index) => `${prefix}-grandchild-${childIndex + 1}-${index + 1}`
    );
    people[childId] = person(childId, `Descendant Branch ${childIndex + 1}`, {
      parents: [root],
      children: grandchildren,
    }, { birthDate: String(1970 + childIndex * 4) });
    grandchildren.forEach((grandchildId, index) => {
      people[grandchildId] = person(grandchildId, `Grandchild ${childIndex + 1}.${index + 1}`, {
        parents: [childId],
      }, {
        gender: index % 2 ? 'female' : 'male',
        birthDate: String(1995 + childIndex * 4 + index),
        isDeceased: false,
      });
    });
  });

  return people;
}

const ARABIC_LONG_NAME_PEOPLE: Record<string, unknown> = {
  'arabic-root': person('arabic-root', 'الشيخ عبد الرحمن بن محمد', {
    parents: ['arabic-father', 'arabic-mother'],
  }, { birthDate: '1979', deathDate: '2024' }),
  'arabic-father': person('arabic-father', 'محمد بن علي بن عثمان', {
    parents: ['arabic-grand-1', 'arabic-grand-2'],
    children: ['arabic-root'],
  }, { birthDate: '1949', deathDate: '2017' }),
  'arabic-mother': person('arabic-mother', 'فاطمة بنت أحمد بن خليل', {
    parents: ['arabic-grand-3', 'arabic-grand-4'],
    children: ['arabic-root'],
  }, { gender: 'female', birthDate: '1952', deathDate: '2020' }),
  'arabic-grand-1': person('arabic-grand-1', 'علي بن عثمان الحسيني', {
    children: ['arabic-father'],
  }, { birthDate: '1920', deathDate: '1985' }),
  'arabic-grand-2': person('arabic-grand-2', 'زينب بنت حسن النجفية', {
    children: ['arabic-father'],
  }, { gender: 'female', birthDate: '1924', deathDate: '1991' }),
  'arabic-grand-3': person('arabic-grand-3', 'أحمد بن خليل الموسوي', {
    children: ['arabic-mother'],
  }, { birthDate: '1922', deathDate: '1990' }),
  'arabic-grand-4': person('arabic-grand-4', 'مريم بنت إبراهيم التميمية', {
    children: ['arabic-mother'],
  }, { gender: 'female', birthDate: '1928', deathDate: '2001' }),
};

const PRIVACY_PEOPLE: Record<string, unknown> = {
  ...ancestorFixture('privacy', false),
  'privacy-root': person('privacy-root', 'Living Privacy Sentinel', {
    parents: ['privacy-father', 'privacy-mother'],
  }, {
    isDeceased: false,
    isPrivate: true,
    email: 'owner-private-sentinel@example.test',
  }),
};

const SPARSE_ASYMMETRIC_PEOPLE: Record<string, unknown> = {
  'sparse-root': person('sparse-root', 'Asymmetric Root', { parents: ['sparse-parent-a', 'sparse-parent-b'] }),
  'sparse-parent-a': person('sparse-parent-a', 'Single Deep Branch', {
    parents: ['sparse-grand'],
    children: ['sparse-root'],
  }),
  'sparse-parent-b': person('sparse-parent-b', 'Short Branch', { children: ['sparse-root'] }),
  'sparse-grand': person('sparse-grand', 'Recorded Grandparent', {
    parents: ['sparse-great'],
    children: ['sparse-parent-a'],
  }),
  'sparse-great': person('sparse-great', 'Oldest Recorded Ancestor', { children: ['sparse-grand'] }),
};

function denseAncestorChain(): Record<string, unknown> {
  const people: Record<string, unknown> = {};
  for (let index = 0; index <= 6; index += 1) {
    const id = `capacity-node-${index}`;
    const parent = index < 6 ? `capacity-node-${index + 1}` : undefined;
    const child = index > 0 ? `capacity-node-${index - 1}` : undefined;
    people[id] = person(id, `Capacity Ancestor ${index}`, {
      parents: parent ? [parent] : [],
      children: child ? [child] : [],
    });
  }
  return people;
}

async function seedTreeScenario(
  page: Page,
  people: Record<string, unknown>,
  focusId: string,
  language: 'ar' | 'en',
  treeName: string
) {
  await page.addInitScript((value) => localStorage.setItem('language', value), language);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');
  await page.evaluate(
    ({ seededPeople, seededFocusId, owner, name }) => {
      const debug = (window as DebugWindow).jozorDebug;
      if (!debug) throw new Error('jozorDebug seed API is unavailable');
      debug.seedTreeScenario({
        people: seededPeople,
        focusId: seededFocusId,
        role: 'owner',
        treeName: name,
        user: owner,
      });
    },
    { seededPeople: people, seededFocusId: focusId, owner: OWNER, name: treeName }
  );
}

async function navigateToStudio(page: Page, language: 'ar' | 'en') {
  await page.setViewportSize({ width: 1440, height: 900 });
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
  await expect(page.getByRole('tab', {
    name: language === 'ar' ? /الشجرة والتخطيط/ : 'Tree & Layout',
  })).toBeVisible();
}

async function openSection(page: Page, section: 'content' | 'layout', language: 'ar' | 'en') {
  const names = {
    content: language === 'ar' ? /إعداد سريع/ : 'Quick Setup',
    layout: language === 'ar' ? /الشجرة والتخطيط/ : 'Tree & Layout',
  } as const;
  const tab = page.getByRole('tab', { name: names[section] });
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function setPrivacy(page: Page, mode: 'owner-full' | 'masked', language: 'ar' | 'en') {
  await openSection(page, 'content', language);
  const name = mode === 'owner-full'
    ? (language === 'ar' ? /عرض جميع البيانات والمعلومات/ : 'Show Full Recorded Data')
    : (language === 'ar' ? /إخفاء الأحياء والمعلومات الخاصة/ : 'Mask Living & Private Data');
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function setPosterCopy(page: Page, title: string, subtitle: string, language: 'ar' | 'en') {
  await openSection(page, 'content', language);
  await page.getByLabel(language === 'ar' ? 'عنوان البوستر' : 'Poster Title').fill(title);
  await page.getByLabel(language === 'ar' ? 'العنوان الفرعي' : 'Poster Subtitle').fill(subtitle);
}

async function activateRadial(page: Page, language: 'ar' | 'en') {
  await openSection(page, 'layout', language);
  const button = page.getByRole('button', { name: language === 'ar' ? /دائري.*مروحي/ : /Radial \/ Fan/i });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function setRadialOptions(
  page: Page,
  options: { scope: 'ancestors' | 'descendants'; span: '180-half-fan' | '360-full-circle'; rings: 3 | 4 | 5 | 6 },
  language: 'ar' | 'en'
) {
  await openSection(page, 'layout', language);
  const scopeName = options.scope === 'ancestors'
    ? (language === 'ar' ? /الأسلاف/ : 'Ancestors')
    : (language === 'ar' ? /الأحفاد/ : 'Descendants');
  const scopeButton = page.getByTestId('radial-scope-control').getByRole('button', { name: scopeName });
  await scopeButton.click();
  await expect(scopeButton).toHaveAttribute('aria-pressed', 'true');

  const spanName = options.span === '180-half-fan'
    ? (language === 'ar' ? /180.*نصف/ : /180.*Half Fan/i)
    : (language === 'ar' ? /360.*دائرة/ : /360.*Full Circle/i);
  const spanButton = page.getByRole('button', { name: spanName });
  await spanButton.click();
  await expect(spanButton).toHaveAttribute('aria-pressed', 'true');

  const ringsButton = page.getByTestId('radial-rings-control').getByRole('button', { name: String(options.rings) });
  await ringsButton.click();
  await expect(ringsButton).toHaveAttribute('aria-pressed', 'true');
}

async function setPaper(page: Page, paper: 'A4' | 'A3' | 'A2') {
  await expect(page.getByTestId('visual-studio-print-dock')).toBeVisible();
  const button = page.getByRole('button', { name: paper });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

function pngDimensions(buffer: Buffer) {
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function hash(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function paddedClip(
  centerX: number,
  centerY: number,
  requestedWidth: number,
  requestedHeight: number,
  imageWidth: number,
  imageHeight: number
) {
  const width = Math.min(imageWidth, Math.max(400, requestedWidth));
  const height = Math.min(imageHeight, Math.max(120, requestedHeight));
  return {
    x: Math.max(0, Math.min(imageWidth - width, centerX - width / 2)),
    y: Math.max(0, Math.min(imageHeight - height, centerY - height / 2)),
    width,
    height,
  };
}

async function captureExportedPngCrops(page: Page, pngPath: string, scenarioDir: string, scene: SceneAnalysis) {
  const png = await readFile(pngPath);
  const { width, height } = pngDimensions(png);
  const scaleX = width / scene.width;
  const scaleY = height / scene.height;
  const root = scene.nodes.find((node) => node.isRoot)!;
  const outer = [...scene.nodes].sort((first, second) => second.generation - first.generation)[0]!;

  await page.setViewportSize({ width: Math.min(width, 2400), height: Math.min(height, 1800) });
  await page.setContent(`<style>html,body{margin:0;background:#fff}img{display:block;width:${width}px;height:${height}px}</style><img id="poster" src="data:image/png;base64,${png.toString('base64')}" alt="exported poster">`);
  await page.locator('#poster').evaluate((image: HTMLImageElement) => image.decode());

  const pixelMetrics = await page.locator('#poster').evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    let sumSquared = 0;
    let nonWhite = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance = (pixels[index]! + pixels[index + 1]! + pixels[index + 2]!) / 3;
      sum += luminance;
      sumSquared += luminance * luminance;
      if (luminance < 248) nonWhite += 1;
    }
    const count = pixels.length / 4;
    return {
      variance: sumSquared / count - (sum / count) ** 2,
      nonWhiteRatio: nonWhite / count,
    };
  });
  expect(pixelMetrics.variance).toBeGreaterThan(10);
  expect(pixelMetrics.nonWhiteRatio).toBeGreaterThan(0.02);

  const rootCenterX = (root.x + root.width / 2) * scaleX;
  const rootCenterY = (root.y + root.height / 2) * scaleY;
  const outerCenterX = (outer.x + outer.width / 2) * scaleX;
  const outerCenterY = (outer.y + outer.height / 2) * scaleY;
  const clips = {
    'crop-title.png': paddedClip(width / 2, height * 0.09, width * 0.58, height * 0.18, width, height),
    'crop-center.png': paddedClip(rootCenterX, rootCenterY, root.width * scaleX + 220, root.height * scaleY + 160, width, height),
    'crop-outer.png': paddedClip(outerCenterX, outerCenterY, outer.width * scaleX + 260, outer.height * scaleY + 180, width, height),
    'crop-connector.png': paddedClip((rootCenterX + outerCenterX) / 2, (rootCenterY + outerCenterY) / 2, 640, 420, width, height),
  };

  for (const [filename, clip] of Object.entries(clips)) {
    expect(clip.width).toBeGreaterThanOrEqual(400);
    expect(clip.height).toBeGreaterThanOrEqual(120);
    const viewport = {
      width: Math.ceil(clip.width),
      height: Math.ceil(clip.height),
    };
    await page.setViewportSize(viewport);
    await page.locator('#poster').evaluate((image: HTMLImageElement, crop) => {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.width = `${crop.width}px`;
      document.body.style.height = `${crop.height}px`;
      document.body.style.overflow = 'hidden';
      image.style.transform = `translate(${-crop.x}px, ${-crop.y}px)`;
      image.style.transformOrigin = 'top left';
    }, clip);
    await page.screenshot({ path: path.join(scenarioDir, filename) });
  }

  return { width, height };
}

async function validateSvgBBoxes(page: Page, svgContent: string) {
  const result = await page.evaluate((svgStr) => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.style.top = '-9999px';
    div.innerHTML = svgStr;
    document.body.appendChild(div);

    const svgEl = div.querySelector('svg');
    if (!svgEl) {
      document.body.removeChild(div);
      return { failures: ['SVG element not found in DOM'], cardCountChecked: 0, textBBoxCheckCount: 0, textBBoxFailureCount: 1, minimumObservedCardPadding: 0 };
    }

    const failures: string[] = [];
    const nodes = Array.from(svgEl.querySelectorAll('.poster-node'));
    let textBBoxCheckCount = 0;
    let minPaddingObserved = 999;

    nodes.forEach((nodeEl) => {
      const cardRect = nodeEl.querySelector('.poster-card') as SVGGraphicsElement | null;
      if (!cardRect) return;

      const cardBox = cardRect.getBBox();
      const previewId = nodeEl.getAttribute('data-preview-node') || 'unknown';

      const nameEl = nodeEl.querySelector('.poster-name') as SVGGraphicsElement | null;
      const yearsEl = nodeEl.querySelector('.poster-years') as SVGGraphicsElement | null;
      const statusEl = nodeEl.querySelector('.poster-status') as SVGGraphicsElement | null;
      const avatarEl = (nodeEl.querySelector('.poster-avatar') || nodeEl.querySelector('.poster-avatar-ring')) as SVGGraphicsElement | null;

      const nameBox = nameEl ? nameEl.getBBox() : null;
      const yearsBox = yearsEl ? yearsEl.getBBox() : null;
      const statusBox = statusEl ? statusEl.getBBox() : null;
      const avatarBox = avatarEl ? avatarEl.getBBox() : null;

      const textEls = Array.from(nodeEl.querySelectorAll('text'));
      textEls.forEach((t) => {
        if (t.classList.contains('poster-initials')) return;
        textBBoxCheckCount += 1;
        const box = t.getBBox();

        if (box.width === 0 || box.height === 0) {
          failures.push(`Node '${previewId}' text '${t.textContent}' has zero width or height.`);
          return;
        }

        const leftPad = box.x - cardBox.x;
        const topPad = box.y - cardBox.y;
        const rightPad = (cardBox.x + cardBox.width) - (box.x + box.width);
        const bottomPad = (cardBox.y + cardBox.height) - (box.y + box.height);

        const nodeMinPad = Math.min(leftPad, topPad, rightPad, bottomPad);
        if (nodeMinPad < minPaddingObserved) {
          minPaddingObserved = nodeMinPad;
        }

        if (leftPad < 4.0 || topPad < 4.0 || rightPad < 4.0 || bottomPad < 4.0) {
          failures.push(`Node '${previewId}' text '${t.textContent}' extends outside card padding (min pad: ${nodeMinPad.toFixed(2)} < 4.0).`);
        }
      });

      const intersect = (b1: DOMRect, b2: DOMRect) => (
        b1.x < b2.x + b2.width - 0.5 &&
        b1.x + b1.width > b2.x + 0.5 &&
        b1.y < b2.y + b2.height - 0.5 &&
        b1.y + b1.height > b2.y + 0.5
      );

      if (nameBox && yearsBox && intersect(nameBox, yearsBox)) {
        failures.push(`Node '${previewId}' name and years intersect.`);
      }
      if (nameBox && statusBox && intersect(nameBox, statusBox)) {
        failures.push(`Node '${previewId}' name and status intersect.`);
      }
      if (nameBox && avatarBox && intersect(nameBox, avatarBox)) {
        failures.push(`Node '${previewId}' name and avatar intersect.`);
      }
    });

    document.body.removeChild(div);
    return {
      failures,
      cardCountChecked: nodes.length,
      textBBoxCheckCount,
      textBBoxFailureCount: failures.length,
      minimumObservedCardPadding: Math.round((minPaddingObserved === 999 ? 0 : minPaddingObserved) * 100) / 100,
    };
  }, svgContent);

  expect(result.failures).toEqual([]);
  return result;
}

async function captureExportEvidence(
  page: Page,
  options: {
    scenario: string;
    language: 'ar' | 'en';
    scope: 'ancestors' | 'descendants';
    span: '180-half-fan' | '360-full-circle';
    rings: 3 | 4 | 5 | 6;
    paper: 'A3' | 'A2';
    expectedNodes: number;
    expectedConnectors: number;
    minimumCoverage: number;
  }
) {
  const scenarioDir = path.join(BASE_EVIDENCE_DIR, options.scenario);
  await mkdir(scenarioDir, { recursive: true });
  await page.screenshot({ path: path.join(scenarioDir, 'studio.png'), fullPage: false });

  const suggestedNames: string[] = [];
  for (const format of ['SVG', 'PNG', 'PDF'] as const) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(`(?:Download|تنزيل) ${format}`, 'i') }).click();
    const download = await downloadPromise;
    suggestedNames.push(download.suggestedFilename());
    await download.saveAs(path.join(scenarioDir, `poster.${format.toLowerCase()}`));
    await download.delete();
  }

  const svgBuffer = await readFile(path.join(scenarioDir, 'poster.svg'));
  const pngBuffer = await readFile(path.join(scenarioDir, 'poster.png'));
  const pdfBuffer = await readFile(path.join(scenarioDir, 'poster.pdf'));
  const svg = svgBuffer.toString('utf8');
  const scene = parseScene(svg);

  expect(scene.engineId).toBe('radial-generations');
  expect(scene.nodes).toHaveLength(options.expectedNodes);
  expect(scene.connectorCount).toBe(options.expectedConnectors);
  expect(scene.angularCoverageDegrees).toBeGreaterThanOrEqual(options.minimumCoverage);
  expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect((pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? [])).toHaveLength(1);

  // Validate browser SVG bounding boxes (padding and non-intersection)
  const bboxStats = await validateSvgBBoxes(page, svg);

  const sceneUnitsToPoints = (scene.physicalHeightMm / scene.height) * (72 / 25.4);
  const nameFontSizes = scene.nodes.map((n) => n.nameFontSize);
  const detailFontSizes = scene.nodes.map((n) => n.detailFontSize);

  const minimumNameFontPt = Math.round(Math.min(...nameFontSizes) * sceneUnitsToPoints * 100) / 100;
  const minimumDetailFontPt = Math.round(Math.min(...detailFontSizes) * sceneUnitsToPoints * 100) / 100;

  const minX = Math.min(...scene.nodes.map((n) => n.x));
  const maxX = Math.max(...scene.nodes.map((n) => n.x + n.width));
  const minY = Math.min(...scene.nodes.map((n) => n.y));
  const maxY = Math.max(...scene.nodes.map((n) => n.y + n.height));
  const occupiedW = maxX - minX;
  const occupiedH = maxY - minY;
  const treeW = scene.treeBounds ? scene.treeBounds.width : scene.width;
  const treeH = scene.treeBounds ? scene.treeBounds.height : scene.height;
  const occupiedWidthRatio = Math.round((occupiedW / treeW) * 100) / 100;
  const occupiedHeightRatio = Math.round((occupiedH / treeH) * 100) / 100;

  const centroidX = (minX + maxX) / 2;
  const centroidY = (minY + maxY) / 2;
  const treeCenterX = scene.treeBounds ? scene.treeBounds.x + scene.treeBounds.width / 2 : scene.width / 2;
  const treeCenterY = scene.treeBounds ? scene.treeBounds.y + scene.treeBounds.height / 2 : scene.height / 2;
  const distCentroid = Math.sqrt(Math.pow(centroidX - treeCenterX, 2) + Math.pow(centroidY - treeCenterY, 2));

  const availRadiusX = treeW / 2 - 20;
  const availRadiusY = options.span === '360-full-circle'
    ? treeH / 2 - 20
    : treeCenterY - (scene.treeBounds ? scene.treeBounds.y : 0) - 40;
  const maxAvailR = Math.min(availRadiusX, availRadiusY);
  const centroidOffsetRatio = Math.round((distCentroid / maxAvailR) * 1000) / 1000;

  const maxHorizDist = Math.max(
    ...scene.nodes.map((n) => Math.max(Math.abs(n.x - treeCenterX), Math.abs(n.x + n.width - treeCenterX)))
  );
  const maxVertDist = Math.max(
    ...scene.nodes.map((n) => Math.max(Math.abs(n.y - treeCenterY), Math.abs(n.y + n.height - treeCenterY)))
  );

  const horizontalUtilization = maxHorizDist / availRadiusX;
  const verticalUtilization = maxVertDist / availRadiusY;
  const radialExtentUtilization = Math.round(Math.max(horizontalUtilization, verticalUtilization) * 1000) / 1000;

  // Mandatory assertions before recording evidence
  expect(Number.isFinite(minimumNameFontPt)).toBe(true);
  expect(minimumNameFontPt).toBeGreaterThanOrEqual(8.0);

  expect(Number.isFinite(minimumDetailFontPt)).toBe(true);
  expect(minimumDetailFontPt).toBeGreaterThanOrEqual(7.0);

  expect(Number.isFinite(radialExtentUtilization)).toBe(true);
  expect(radialExtentUtilization).toBeLessThanOrEqual(1.05);

  expect(Number.isFinite(occupiedWidthRatio)).toBe(true);
  expect(Number.isFinite(occupiedHeightRatio)).toBe(true);
  expect(Number.isFinite(centroidOffsetRatio)).toBe(true);

  if (options.span === '360-full-circle' && options.paper === 'A2') {
    expect(radialExtentUtilization).toBeGreaterThanOrEqual(0.75);
    expect(radialExtentUtilization).toBeLessThanOrEqual(1.001);
    expect(occupiedWidthRatio).toBeGreaterThanOrEqual(0.48);
    expect(occupiedHeightRatio).toBeGreaterThanOrEqual(0.48);
  }

  expect(bboxStats.textBBoxFailureCount).toBe(0);
  expect(Number.isFinite(bboxStats.minimumObservedCardPadding)).toBe(true);
  expect(bboxStats.minimumObservedCardPadding).toBeGreaterThanOrEqual(4.0);

  const suggestedBasenames = suggestedNames.map((name) => name.replace(/\.(svg|png|pdf)$/i, ''));
  expect(new Set(suggestedBasenames).size).toBe(1);
  expect(suggestedBasenames[0]).not.toMatch(/session-token|preview-node|radial-generations|[0-9a-f]{8}-[0-9a-f-]{27}/i);

  const dimensions = await captureExportedPngCrops(
    page,
    path.join(scenarioDir, 'poster.png'),
    scenarioDir,
    scene
  );
  const derivedDpi = Math.min(
    dimensions.width / (scene.physicalWidthMm / 25.4),
    dimensions.height / (scene.physicalHeightMm / 25.4)
  );

  const filenames = [
    'studio.png', 'poster.svg', 'poster.png', 'poster.pdf',
    'crop-title.png', 'crop-center.png', 'crop-outer.png', 'crop-connector.png',
  ];
  for (const filename of filenames) {
    expect((await stat(path.join(scenarioDir, filename))).size).toBeGreaterThan(500);
  }

  evidenceRecords.push({
    ...options,
    status: 'exported',
    nodeCount: scene.nodes.length,
    connectorCount: scene.connectorCount,
    angularCoverageDegrees: scene.angularCoverageDegrees,
    minimumNameFontPt,
    minimumDetailFontPt,
    radialExtentUtilization,
    occupiedWidthRatio,
    occupiedHeightRatio,
    centroidOffsetRatio,
    cardCountChecked: bboxStats.cardCountChecked,
    textBBoxCheckCount: bboxStats.textBBoxCheckCount,
    textBBoxFailureCount: bboxStats.textBBoxFailureCount,
    minimumObservedCardPadding: bboxStats.minimumObservedCardPadding,
    pngWidth: dimensions.width,
    pngHeight: dimensions.height,
    derivedDpi: Math.round(derivedDpi * 10) / 10,
    hashes: {
      svg: hash(svgBuffer),
      png: hash(pngBuffer),
      pdf: hash(pdfBuffer),
    },
    suggestedBasename: suggestedBasenames[0],
  });

  await page.close();
  return { svg, scene };
}

async function configureExportScenario(
  page: Page,
  input: {
    people: Record<string, unknown>;
    focusId: string;
    treeName: string;
    language: 'ar' | 'en';
    privacy: 'owner-full' | 'masked';
    title: string;
    subtitle: string;
    scope: 'ancestors' | 'descendants';
    span: '180-half-fan' | '360-full-circle';
    rings: 3 | 4;
    paper: 'A3' | 'A2';
  }
) {
  await seedTreeScenario(page, input.people, input.focusId, input.language, input.treeName);
  await navigateToStudio(page, input.language);
  await setPrivacy(page, input.privacy, input.language);
  await setPosterCopy(page, input.title, input.subtitle, input.language);
  await activateRadial(page, input.language);
  await setRadialOptions(page, input, input.language);
  await setPaper(page, input.paper);
  await expect(page.locator('[data-testid="studio-poster-renderer-preview"] svg[data-poster-layout-engine="radial-generations"]')).toBeVisible({ timeout: 15_000 });
}

async function existsPath(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

test.describe('Visual Publishing Studio Phase 3C truthful Radial owner review evidence', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240_000);

  test.beforeAll(async () => {
    await rm(STAGING_EVIDENCE_DIR, { recursive: true, force: true });
    const parentDir = path.dirname(FINAL_EVIDENCE_DIR);
    const entries = await readdir(parentDir);
    for (const entry of entries) {
      if (entry.includes('.backup-')) {
        await rm(path.join(parentDir, entry), { recursive: true, force: true });
      }
    }
    await mkdir(STAGING_EVIDENCE_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    expect(evidenceRecords).toHaveLength(8);

    const expectedDirectories = [
      'scenario-1-ancestors-180-a3',
      'scenario-2-ancestors-360-a2',
      'scenario-3-descendants-180-a3',
      'scenario-4-descendants-360-a2',
      'scenario-5-arabic-long-names-180-a3',
      'scenario-6-privacy-masked-180-a3',
      'scenario-7-sparse-asymmetric-180-a3',
      'scenario-8-radial-capacity-blocked-a4',
    ];
    expect((await readdir(STAGING_EVIDENCE_DIR)).sort()).toEqual(expectedDirectories.sort());

    const scenarioOne = evidenceRecords.find((record) => record.scenario.startsWith('scenario-1'))!;
    const scenarioSeven = evidenceRecords.find((record) => record.scenario.startsWith('scenario-7'))!;
    expect(scenarioOne.hashes?.svg).not.toBe(scenarioSeven.hashes?.svg);
    expect(scenarioOne.hashes?.png).not.toBe(scenarioSeven.hashes?.png);

    // Verify all metrics across all records are finite
    evidenceRecords.forEach((record) => {
      if (record.status === 'exported') {
        expect(Number.isFinite(record.minimumNameFontPt)).toBe(true);
        expect(record.minimumNameFontPt!).toBeGreaterThanOrEqual(8.0);
        expect(Number.isFinite(record.minimumDetailFontPt)).toBe(true);
        expect(record.minimumDetailFontPt!).toBeGreaterThanOrEqual(7.0);
        expect(Number.isFinite(record.radialExtentUtilization)).toBe(true);
        expect(record.radialExtentUtilization!).toBeLessThanOrEqual(1.05);
        expect(Number.isFinite(record.occupiedWidthRatio)).toBe(true);
        expect(Number.isFinite(record.occupiedHeightRatio)).toBe(true);
        expect(Number.isFinite(record.centroidOffsetRatio)).toBe(true);
        expect(Number.isFinite(record.cardCountChecked)).toBe(true);
        expect(Number.isFinite(record.textBBoxCheckCount)).toBe(true);
        expect(record.textBBoxFailureCount).toBe(0);
        expect(Number.isFinite(record.minimumObservedCardPadding)).toBe(true);
        expect(record.minimumObservedCardPadding!).toBeGreaterThanOrEqual(4.0);
      }
    });

    const generatedAt = new Date().toISOString();
    await writeFile(
      path.join(STAGING_EVIDENCE_DIR, 'evidence-manifest.json'),
      `${JSON.stringify({ generatedAt, scenarios: evidenceRecords }, null, 2)}\n`,
      'utf8'
    );

    await new Promise((res) => setTimeout(res, 1500));

    // Transactional same-volume directory promotion using rename with transient lock retry.
    // Windows file watchers can hold the final directory handle while leaving every child
    // movable, so the content-swap fallback also uses rename exclusively and rolls back.
    const isTransientRenameError = (err: unknown) => {
      const code = (err as { code?: string })?.code;
      return code === 'EPERM' || code === 'EBUSY' || code === 'EACCES' || code === 'EEXIST';
    };

    const safeRename = async (src: string, dest: string) => {
      for (let i = 0; i < 20; i++) {
        try {
          await rename(src, dest);
          return;
        } catch (err: unknown) {
          if (isTransientRenameError(err) && i < 19) {
            await new Promise((res) => setTimeout(res, 1000));
            continue;
          }
          throw err;
        }
      }
    };

    await new Promise((res) => setTimeout(res, 1500));

    const backupDir = `${FINAL_EVIDENCE_DIR}.backup-${Date.now()}`;
    let finalBackedUp = false;
    let usedContentSwap = false;
    const backedUpEntries: string[] = [];
    const promotedEntries: string[] = [];
    try {
      if (await existsPath(FINAL_EVIDENCE_DIR)) {
        try {
          await safeRename(FINAL_EVIDENCE_DIR, backupDir);
          finalBackedUp = true;
        } catch (err) {
          if (!isTransientRenameError(err)) throw err;

          usedContentSwap = true;
          await mkdir(backupDir);
          for (const entry of await readdir(FINAL_EVIDENCE_DIR)) {
            await safeRename(path.join(FINAL_EVIDENCE_DIR, entry), path.join(backupDir, entry));
            backedUpEntries.push(entry);
          }
        }
      }

      if (usedContentSwap) {
        for (const entry of await readdir(STAGING_EVIDENCE_DIR)) {
          await safeRename(path.join(STAGING_EVIDENCE_DIR, entry), path.join(FINAL_EVIDENCE_DIR, entry));
          promotedEntries.push(entry);
        }
        await rm(STAGING_EVIDENCE_DIR, { recursive: true, force: true });
      } else {
        await safeRename(STAGING_EVIDENCE_DIR, FINAL_EVIDENCE_DIR);
      }

      if ((finalBackedUp || usedContentSwap) && (await existsPath(backupDir))) {
        await rm(backupDir, { recursive: true, force: true });
      }
    } catch (err) {
      if (usedContentSwap && (await existsPath(backupDir))) {
        await mkdir(STAGING_EVIDENCE_DIR, { recursive: true });
        for (const entry of promotedEntries.reverse()) {
          const promotedPath = path.join(FINAL_EVIDENCE_DIR, entry);
          if (await existsPath(promotedPath)) {
            await safeRename(promotedPath, path.join(STAGING_EVIDENCE_DIR, entry));
          }
        }
        for (const entry of backedUpEntries.reverse()) {
          const backupPath = path.join(backupDir, entry);
          if (await existsPath(backupPath)) {
            await safeRename(backupPath, path.join(FINAL_EVIDENCE_DIR, entry));
          }
        }
        await rm(backupDir, { recursive: true, force: true });
      } else if (finalBackedUp && (await existsPath(backupDir))) {
        if (await existsPath(FINAL_EVIDENCE_DIR)) {
          await rm(FINAL_EVIDENCE_DIR, { recursive: true, force: true });
        }
        await safeRename(backupDir, FINAL_EVIDENCE_DIR);
      }
      throw err;
    }

    // Post-promotion verification assertions
    expect(await existsPath(STAGING_EVIDENCE_DIR)).toBe(false);
    expect(await existsPath(backupDir)).toBe(false);
    expect(await existsPath(FINAL_EVIDENCE_DIR)).toBe(true);

    const parentDir = path.dirname(FINAL_EVIDENCE_DIR);
    const parentEntries = await readdir(parentDir);
    const remainingBackups = parentEntries.filter((name) => name.includes('.backup-'));
    expect(remainingBackups).toHaveLength(0);

    const finalManifestText = await readFile(path.join(FINAL_EVIDENCE_DIR, 'evidence-manifest.json'), 'utf8');
    const finalManifest = JSON.parse(finalManifestText);
    expect(finalManifest.generatedAt).toBe(generatedAt);

    // Recompute and compare every artifact SHA-256 with manifest hashes
    for (const scenarioRecord of finalManifest.scenarios) {
      if (scenarioRecord.status === 'exported' && scenarioRecord.hashes) {
        for (const ext of ['svg', 'png', 'pdf'] as const) {
          const artifactPath = path.join(FINAL_EVIDENCE_DIR, scenarioRecord.scenario, `poster.${ext}`);
          const artifactBuffer = await readFile(artifactPath);
          const computedHash = createHash('sha256').update(artifactBuffer).digest('hex');
          expect(computedHash).toBe(scenarioRecord.hashes[ext]);
        }
      }
    }

    // Verify report scenario values match manifest values
    const reportPath = path.resolve(process.cwd(), 'docs/reviews/visual-publishing-studio-phase-3d-radial-owner-review-2026-08-07.md');
    const reportText = await readFile(reportPath, 'utf8');
    expect(reportText).toContain('Owner visual status:** Pending Owner Review');
    expect(reportText).toContain('Production approval:** No');
    expect(reportText).not.toContain('outerRadiusUtilization');
    expect(reportText).not.toContain('4.0pt calibration');

    for (const record of finalManifest.scenarios) {
      if (record.status === 'exported') {
        expect(reportText).toContain(`radial extent util ${record.radialExtentUtilization}`);
        expect(reportText).toContain(`min name font ${record.minimumNameFontPt.toFixed(2)}pt`);
        expect(reportText).toContain(`min detail font ${record.minimumDetailFontPt.toFixed(2)}pt`);
      }
    }
  });



  test('Scenario 1: ancestors 180 degree fan A3 with seven reachable nodes', async ({ page }) => {
    await configureExportScenario(page, {
      people: ancestorFixture('s1', false), focusId: 's1-root', treeName: 'Ancestor Review', language: 'en',
      privacy: 'owner-full', title: 'Ancestor Family Fan', subtitle: 'Three recorded generations',
      scope: 'ancestors', span: '180-half-fan', rings: 3, paper: 'A3',
    });
    await captureExportEvidence(page, {
      scenario: 'scenario-1-ancestors-180-a3', language: 'en', scope: 'ancestors',
      span: '180-half-fan', rings: 3, paper: 'A3', expectedNodes: 7, expectedConnectors: 6,
      minimumCoverage: 130,
    });
  });

  test('Scenario 2: ancestors 360 degree circle A2 with fifteen reachable nodes', async ({ page }) => {
    await configureExportScenario(page, {
      people: ancestorFixture('s2', true), focusId: 's2-root', treeName: 'Dense Ancestor Review', language: 'en',
      privacy: 'owner-full', title: 'Complete Ancestor Circle', subtitle: 'Four recorded generations',
      scope: 'ancestors', span: '360-full-circle', rings: 4, paper: 'A2',
    });
    await captureExportEvidence(page, {
      scenario: 'scenario-2-ancestors-360-a2', language: 'en', scope: 'ancestors',
      span: '360-full-circle', rings: 4, paper: 'A2', expectedNodes: 15, expectedConnectors: 14,
      minimumCoverage: 200,
    });
  });

  test('Scenario 3: descendants 180 degree fan A3 with seven reachable nodes', async ({ page }) => {
    await configureExportScenario(page, {
      people: descendantFixture('s3', false), focusId: 's3-root', treeName: 'Descendant Review', language: 'en',
      privacy: 'owner-full', title: 'Descendant Family Fan', subtitle: 'Three recorded generations',
      scope: 'descendants', span: '180-half-fan', rings: 3, paper: 'A3',
    });
    await captureExportEvidence(page, {
      scenario: 'scenario-3-descendants-180-a3', language: 'en', scope: 'descendants',
      span: '180-half-fan', rings: 3, paper: 'A3', expectedNodes: 7, expectedConnectors: 6,
      minimumCoverage: 130,
    });
  });

  test('Scenario 4: descendants 360 degree circle A2 with ten reachable nodes', async ({ page }) => {
    await configureExportScenario(page, {
      people: descendantFixture('s4', true), focusId: 's4-root', treeName: 'Dense Descendant Review', language: 'en',
      privacy: 'owner-full', title: 'Complete Descendant Circle', subtitle: 'Three branching generations',
      scope: 'descendants', span: '360-full-circle', rings: 3, paper: 'A2',
    });
    await captureExportEvidence(page, {
      scenario: 'scenario-4-descendants-360-a2', language: 'en', scope: 'descendants',
      span: '360-full-circle', rings: 3, paper: 'A2', expectedNodes: 10, expectedConnectors: 9,
      minimumCoverage: 250,
    });
  });

  test('Scenario 5: Arabic long names remain Arabic and untruncated', async ({ page }) => {
    const title = 'شجرة أسلاف آل رمضان المبارك';
    const subtitle = 'سجل العائلة عبر ثلاثة أجيال';
    await configureExportScenario(page, {
      people: ARABIC_LONG_NAME_PEOPLE, focusId: 'arabic-root', treeName: title, language: 'ar',
      privacy: 'owner-full', title, subtitle, scope: 'ancestors', span: '180-half-fan', rings: 3, paper: 'A3',
    });
    const { svg } = await captureExportEvidence(page, {
      scenario: 'scenario-5-arabic-long-names-180-a3', language: 'ar', scope: 'ancestors',
      span: '180-half-fan', rings: 3, paper: 'A3', expectedNodes: 7, expectedConnectors: 6,
      minimumCoverage: 130,
    });
    expect(svg).toContain(title);
    expect(svg).toContain(subtitle);
    const visibleText = svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(visibleText).toContain('الشيخ عبد الرحمن');
    expect(svg).toContain('1979 - 2024');
    expect(svg).toContain('@font-face');
    expect(svg).not.toMatch(/Ancestor Tree|Family Record/);
    expect(svg).not.toContain('…');
  });

  test('Scenario 6: masked privacy is mandatory and removes living private identity', async ({ page }) => {
    await configureExportScenario(page, {
      people: PRIVACY_PEOPLE, focusId: 'privacy-root', treeName: 'Privacy Review', language: 'en',
      privacy: 'masked', title: 'Private Family Fan', subtitle: 'Living identities protected',
      scope: 'ancestors', span: '180-half-fan', rings: 3, paper: 'A3',
    });
    const { svg } = await captureExportEvidence(page, {
      scenario: 'scenario-6-privacy-masked-180-a3', language: 'en', scope: 'ancestors',
      span: '180-half-fan', rings: 3, paper: 'A3', expectedNodes: 7, expectedConnectors: 6,
      minimumCoverage: 130,
    });
    const visibleText = svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(visibleText).toContain('Masked person');
    expect(svg).toContain('is-masked');
    expect(svg).not.toMatch(/Living Privacy Sentinel|owner-private-sentinel@example\.test/);
  });

  test('Scenario 7: sparse asymmetric four-ring fan differs from Scenario 1', async ({ page }) => {
    await configureExportScenario(page, {
      people: SPARSE_ASYMMETRIC_PEOPLE, focusId: 'sparse-root', treeName: 'Sparse Review', language: 'en',
      privacy: 'owner-full', title: 'Sparse Recorded Line', subtitle: 'An intentionally incomplete branch',
      scope: 'ancestors', span: '180-half-fan', rings: 4, paper: 'A3',
    });
    await captureExportEvidence(page, {
      scenario: 'scenario-7-sparse-asymmetric-180-a3', language: 'en', scope: 'ancestors',
      span: '180-half-fan', rings: 4, paper: 'A3', expectedNodes: 5, expectedConnectors: 4,
      minimumCoverage: 80,
    });
  });

  test('Scenario 8: A4 six-ring failure belongs to Radial and emits no downloads', async ({ page }) => {
    const scenario = 'scenario-8-radial-capacity-blocked-a4';
    const scenarioDir = path.join(BASE_EVIDENCE_DIR, scenario);
    await mkdir(scenarioDir, { recursive: true });
    await seedTreeScenario(page, denseAncestorChain(), 'capacity-node-0', 'en', 'Radial Capacity Review');
    await navigateToStudio(page, 'en');
    await setPrivacy(page, 'owner-full', 'en');
    await activateRadial(page, 'en');
    await setPaper(page, 'A4');
    await setRadialOptions(page, { scope: 'ancestors', span: '360-full-circle', rings: 6 }, 'en');

    const sixRings = page.getByTestId('radial-rings-control').getByRole('button', { name: '6' });
    await expect(sixRings).toHaveAttribute('aria-pressed', 'true');
    const guidance = page.getByTestId('poster-capacity-error-guidance');
    await expect(guidance).toBeVisible({ timeout: 15_000 });
    await expect(guidance).toContainText('Radial layout capacity exceeded');
    await expect(guidance).not.toContainText('Focus');

    const radialButton = page.getByRole('button', { name: /Radial \/ Fan/i });
    await expect(radialButton).toHaveAttribute('aria-pressed', 'true');
    const buttons = ['Download SVG', 'Download PNG', 'Download PDF'].map((name) => page.getByRole('button', { name }));
    for (const button of buttons) await expect(button).toBeDisabled();

    let downloadCount = 0;
    page.on('download', () => { downloadCount += 1; });
    for (const button of buttons) await button.click({ force: true });
    await page.waitForTimeout(600);
    expect(downloadCount).toBe(0);

    await page.screenshot({ path: path.join(scenarioDir, 'studio.png'), fullPage: false });
    await guidance.screenshot({ path: path.join(scenarioDir, 'crop-guidance.png') });
    await page.getByTestId('visual-studio-action-bar').screenshot({ path: path.join(scenarioDir, 'crop-buttons.png') });
    for (const filename of ['studio.png', 'crop-guidance.png', 'crop-buttons.png']) {
      expect((await stat(path.join(scenarioDir, filename))).size).toBeGreaterThan(500);
    }

    evidenceRecords.push({
      scenario,
      status: 'expected-blocked',
      language: 'en',
      scope: 'ancestors',
      span: '360-full-circle',
      rings: 6,
      paper: 'A4',
      nodeCount: 7,
      connectorCount: 6,
      capacityMessage: await guidance.innerText(),
    });
    await page.context().close();
  });
});
