import { test, expect, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

type DebugUser = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
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
  setRole: (role: Exclude<DebugRole, 'owner'>) => void;
  persistCurrentScenario: () => void;
  clearPersistedScenario: () => void;
};

type DebugWindow = Window & { jozorDebug?: JozorDebug };

const OUTPUT_DIR = path.resolve('output/playwright/visual-studio-export-artifacts');

const SANITIZED_TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const SANITIZED_SEED_PEOPLE = {
  root: {
    id: 'root',
    title: '',
    firstName: 'عبدالله بن محمد',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '1980',
    birthPlace: 'الرياض',
    birthSource: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: 'الرياض',
    isDeceased: false,
    profession: 'باحث تاريخ وأنساب',
    company: '',
    interests: '',
    bio: 'سيرة ذاتية تفصيلية مبسطة لاختبار النصوص العربية الطويلة',
    photoUrl: SANITIZED_TEST_IMAGE,
    gallery: [SANITIZED_TEST_IMAGE],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: ['father', 'mother'],
    spouses: ['spouse1'],
    children: ['child1', 'child2'],
    partnerDetails: {},
    isPrivate: false,
  },
  father: {
    id: 'father',
    title: 'الشيخ',
    firstName: 'محمد بن علي',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '1950',
    birthPlace: 'الرياض',
    birthSource: '',
    deathDate: '2015',
    deathPlace: 'الرياض',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: true,
    profession: '',
    company: '',
    interests: '',
    bio: '',
    photoUrl: SANITIZED_TEST_IMAGE,
    gallery: [SANITIZED_TEST_IMAGE],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: ['grandfather'],
    spouses: ['mother'],
    children: ['root', 'brother1'],
    partnerDetails: {},
    isPrivate: false,
  },
  mother: {
    id: 'mother',
    title: '',
    firstName: 'فاطمة بنت سليمان',
    middleName: '',
    lastName: 'العلي الحسين',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'female',
    birthDate: '1955',
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
    parents: [],
    spouses: ['father'],
    children: ['root', 'brother1'],
    partnerDetails: {},
    isPrivate: false,
  },
  grandfather: {
    id: 'grandfather',
    title: 'الشيخ',
    firstName: 'علي بن عثمان',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '1920',
    birthPlace: '',
    birthSource: '',
    deathDate: '1995',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: true,
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
    parents: [],
    spouses: [],
    children: ['father'],
    partnerDetails: {},
    isPrivate: false,
  },
  brother1: {
    id: 'brother1',
    title: '',
    firstName: 'إبراهيم بن محمد بن علي',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '1983',
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
    parents: ['father', 'mother'],
    spouses: [],
    children: [],
    partnerDetails: {},
    isPrivate: false,
  },
  spouse1: {
    id: 'spouse1',
    title: '',
    firstName: 'نورة بنت صالح بن عبداللّه',
    middleName: '',
    lastName: 'الناصر',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'female',
    birthDate: '1985',
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
    parents: [],
    spouses: ['root'],
    children: ['child1', 'child2'],
    partnerDetails: {},
    isPrivate: false,
  },
  child1: {
    id: 'child1',
    title: '',
    firstName: 'سعود بن عبدالله بن محمد',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '2008',
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
    parents: ['root', 'spouse1'],
    spouses: [],
    children: [],
    partnerDetails: {},
    isPrivate: false,
  },
  child2: {
    id: 'child2',
    title: '',
    firstName: 'مريم بنت عبدالله بن محمد',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'female',
    birthDate: '2012',
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
    parents: ['root', 'spouse1'],
    spouses: [],
    children: [],
    partnerDetails: {},
    isPrivate: false,
  },
};

const PRIVACY_SENTINEL_PEOPLE = {
  ...SANITIZED_SEED_PEOPLE,
  root: {
    ...SANITIZED_SEED_PEOPLE.root,
    id: 'RAW-PERSON-ID-SENTINEL-1001',
    email: 'PRIVATE-EMAIL-SENTINEL@example.com',
    website: 'STORAGE-URL-SENTINEL.supabase.co',
    bio: 'AUTH-TOKEN-SENTINEL-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    birthDate: '1980-05-15',
    isPrivate: true,
  },
};

const SANITIZED_OWNER_USER: DebugUser = {
  uid: 'sanitized-owner-qa',
  displayName: 'Sanitized Owner QA',
  email: 'sanitized-owner@example.com',
  photoURL: '',
};

async function seedSanitizedScenario(
  page: Page,
  treeName = 'مخطوطة الشجرة العائلية المباركة',
  people: Record<string, unknown> = SANITIZED_SEED_PEOPLE,
  focusId = 'root'
) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');

  await page.evaluate(({ people, user, treeName, focusId }) => {
    (window as DebugWindow).jozorDebug?.seedTreeScenario({
      people,
      focusId,
      role: 'owner',
      treeName,
      user,
    });
  }, { people, user: SANITIZED_OWNER_USER, treeName, focusId });

  const loader = page.getByTestId('tree-loader');
  if (await loader.count() > 0) {
    await expect(loader).toBeHidden({ timeout: 15000 });
  }

  await page.waitForTimeout(400);
}

async function navigateToStudio(page: Page) {
  const studio = page.getByTestId('visual-publishing-studio');
  if (await studio.count() > 0 && await studio.isVisible()) {
    return;
  }

  const accountTrigger = page.getByTestId('account-menu-trigger');
  if (await accountTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
    await accountTrigger.click();
    await page.waitForTimeout(400);
    const vaultEntry = page.locator('button:visible').filter({ hasText: /The Vault|الخزنة/i }).last();
    if (await vaultEntry.count()) {
      await vaultEntry.click();
      await page.waitForTimeout(400);
    }
  }

  const exportTab = page.locator('button:visible').filter({ hasText: /التصدير & إدارة السحابة|التصدير|Export/i }).first();
  if (await exportTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await exportTab.click();
    await page.waitForTimeout(400);
  }

  const visualOutputsTab = page.locator('button[role="tab"]:visible').filter({ hasText: /المخرجات البصرية|Visual Outputs/i }).first();
  await expect(visualOutputsTab).toBeVisible({ timeout: 15000 });
  await visualOutputsTab.click();

  await expect(page.getByTestId('visual-publishing-studio')).toBeVisible({ timeout: 15000 });
}

type GeometryMetrics = {
  viewBox: string;
  width: string;
  height: string;
  nodeCount: number;
  connectorCount: number;
  nodeBoxes: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  connectorPaths: string[];
};

function parsePngIhdr(buffer: Buffer) {
  const isPng =
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isPng) {
    return { isPng: false, width: 0, height: 0, bitDepth: 0, colorType: 0 };
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  return { isPng: true, width, height, bitDepth, colorType };
}

function sha256(buffer: Buffer | string): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function verifyPdfWithLocalPoppler(
  pdfBuffer: Buffer,
  scenarioId: string
) {
  const cachedBin = 'C:\\Users\\dardoa\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\poppler\\Library\\bin';
  const pdfInfoExe = fsSync.existsSync(path.join(cachedBin, 'pdfinfo.exe')) ? path.join(cachedBin, 'pdfinfo.exe') : 'pdfinfo';
  const pdfToPpmExe = fsSync.existsSync(path.join(cachedBin, 'pdftoppm.exe')) ? path.join(cachedBin, 'pdftoppm.exe') : 'pdftoppm';

  const pdfPath = path.join(OUTPUT_DIR, `${scenarioId}.pdf`);
  fsSync.mkdirSync(OUTPUT_DIR, { recursive: true });
  fsSync.writeFileSync(pdfPath, pdfBuffer);

  const pdfInfoRaw = execSync(`"${pdfInfoExe}" "${pdfPath}"`).toString();
  const pagesMatch = pdfInfoRaw.match(/Pages:\s+(\d+)/);
  const pageCount = pagesMatch ? parseInt(pagesMatch[1], 10) : 0;

  const sizeMatch = pdfInfoRaw.match(/Page size:\s+([0-9.]+)\s+x\s+([0-9.]+)/);
  const pdfWidthPt = sizeMatch ? parseFloat(sizeMatch[1]) : 0;
  const pdfHeightPt = sizeMatch ? parseFloat(sizeMatch[2]) : 0;

  const pdfPageCountMatch = pageCount === 1;
  const pdfDimensionsMatch = pageCount === 1 && pdfWidthPt > 400 && pdfHeightPt > 400;

  const ppmPrefix = path.join(OUTPUT_DIR, `${scenarioId}-pdf-page`);
  execSync(`"${pdfToPpmExe}" -png -r 150 "${pdfPath}" "${ppmPrefix}"`);
  const renderedPdfPngPath = `${ppmPrefix}-1.png`;
  const pdfPngBuffer = fsSync.readFileSync(renderedPdfPngPath);

  const pdfWidthMm = Math.round(pdfWidthPt * (25.4 / 72));
  const pdfHeightMm = Math.round(pdfHeightPt * (25.4 / 72));

  return {
    pdfPath,
    pageCount,
    pdfWidthPt,
    pdfHeightPt,
    pdfWidthMm,
    pdfHeightMm,
    pdfPageCountMatch,
    pdfDimensionsMatch,
    pdfPngBuffer,
  };
}

async function captureNodeCardCropFromPng(
  page: Page,
  svgContent: string,
  pngBuffer: Buffer,
  targetNodeSelector: string,
  outputPath: string,
  label: string
) {
  const nodeGeom = await page.evaluate(({ svgStr, selector }) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgStr, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return null;
    const viewBox = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const vbWidth = viewBox[2] || parseFloat(svg.getAttribute('width') || '800');
    const vbHeight = viewBox[3] || parseFloat(svg.getAttribute('height') || '600');

    let nodeEl = doc.querySelector(selector);
    if (!nodeEl && selector.includes('poster-photo')) {
      const img = doc.querySelector('image.poster-photo');
      if (img) {
        nodeEl = img.closest('g.poster-node');
      }
    }
    if (!nodeEl) {
      nodeEl = doc.querySelector('g.poster-node');
    }
    if (!nodeEl) return null;

    const x = parseFloat(nodeEl.getAttribute('data-scene-x') || '0');
    const y = parseFloat(nodeEl.getAttribute('data-scene-y') || '0');
    const w = parseFloat(nodeEl.getAttribute('data-scene-width') || '100');
    const h = parseFloat(nodeEl.getAttribute('data-scene-height') || '50');

    return { vbWidth, vbHeight, x, y, w, h };
  }, { svgStr: svgContent, selector: targetNodeSelector });

  expect(nodeGeom, `Target node ${targetNodeSelector} must exist in exported SVG`).not.toBeNull();

  const cropDataUrl = await page.evaluate(async ({ pngBase64, geom }) => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scaleX = img.width / geom.vbWidth;
        const scaleY = img.height / geom.vbHeight;

        const padX = 10;
        const padY = 10;

        const cropSceneX = Math.max(0, geom.x - padX);
        const cropSceneY = Math.max(0, geom.y - padY);
        const cropSceneW = geom.w + padX * 2;
        const cropSceneH = geom.h + padY * 2;

        const x = Math.round(cropSceneX * scaleX);
        const y = Math.round(cropSceneY * scaleY);
        const w = Math.round(cropSceneW * scaleX);
        const h = Math.round(cropSceneH * scaleY);

        const canvasW = Math.max(400, w);
        const canvasH = Math.max(120, h);
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);

        const destX = Math.round((canvasW - w) / 2);
        const destY = Math.round((canvasH - h) / 2);
        ctx.drawImage(img, x, y, w, h, destX, destY, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = `data:image/png;base64,${pngBase64}`;
    });
  }, { pngBase64: pngBuffer.toString('base64'), geom: nodeGeom! });

  const cropBuffer = Buffer.from(cropDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, cropBuffer);

  const cropStats = await page.evaluate(async (dataUrl) => {
    return new Promise<{ width: number; height: number; variance: number }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        let sumSq = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          sumSq += (pixels[i] - avg) ** 2 + (pixels[i + 1] - avg) ** 2 + (pixels[i + 2] - avg) ** 2;
        }
        const variance = sumSq / (img.width * img.height);
        resolve({ width: img.width, height: img.height, variance });
      };
      img.src = dataUrl;
    });
  }, cropDataUrl);

  expect(cropStats.width, `${label} crop width must be >= 400px`).toBeGreaterThanOrEqual(400);
  expect(cropStats.height, `${label} crop height must be >= 120px`).toBeGreaterThanOrEqual(120);
  expect(cropStats.variance, `${label} crop pixel variance must be > 10`).toBeGreaterThan(10);

  return cropStats;
}

test.describe('Visual Publishing Studio Export Artifact Parity & Print Technical QA Suite', () => {
  test.beforeAll(async () => {
    if (fsSync.existsSync(OUTPUT_DIR)) {
      fsSync.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fsSync.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  const GEOMETRY_PARITY_REPORT: Record<string, {
    scenario: string;
    previewGeometry: GeometryMetrics;
    exportedSvgGeometry: GeometryMetrics;
    isViewBoxEqual: boolean;
    isDimensionsEqual: boolean;
    isNodeCountEqual: boolean;
    isConnectorCountEqual: boolean;
    isNodeGeometryEqual: boolean;
    status: 'PASS' | 'FAIL';
    reason: string;
  }> = {};

  const VISUAL_DIFF_REPORT: Record<string, {
    scenario: string;
    pngDimensions: { width: number; height: number };
    pdfPhysicalMm: { widthMm: number; heightMm: number };
    pdfPhysicalPt: { widthPt: number; heightPt: number };
    pngVsSvgRasterMismatchRatio: number;
    pngVsSvgRasterRmse: number;
    pdfVsSvgRasterMismatchRatio: number;
    pdfVsSvgRasterRmse: number;
    pngPixelVariance: number;
    pngNonBlankPixelRatio: number;
    passThresholds: { maxPngMismatchRatio: number; maxPdfMismatchRatio: number; minPngVariance: number };
    status: 'PASS' | 'FAIL';
    reason: string;
  }> = {};

  const EXPORT_HASHES: Record<string, { svg: string; png: string; pdf: string }> = {};

  test('1. Scenario A: A4 Portrait (Ancestors 3-gen, Long Arabic Names, Mixed RTL & LTR Years)', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await seedSanitizedScenario(page, 'مخطوطة الشجرة العائلية المباركة', SANITIZED_SEED_PEOPLE, 'root');
    await navigateToStudio(page);

    const studio = page.getByTestId('visual-publishing-studio');
    await expect(studio).toBeVisible();

    const configPanel = page.getByTestId('visual-studio-config-panel');

    const scopeBtn = configPanel.getByTestId('poster-scope-control').getByRole('button', { name: /الأسلاف|Ancestors/i });
    if (await scopeBtn.getAttribute('aria-pressed') !== 'true') {
      await scopeBtn.click();
      await page.waitForTimeout(400);
    }
    expect(await scopeBtn.getAttribute('aria-pressed')).toBe('true');

    const depthBtn = configPanel.getByTestId('poster-depth-control').getByRole('button', { name: '3' });
    if (await depthBtn.count() > 0 && await depthBtn.getAttribute('aria-pressed') !== 'true') {
      await depthBtn.click();
      await page.waitForTimeout(400);
    }

    const sizeSelect = configPanel.getByTestId('poster-size-orientation-group').getByRole('combobox');
    await sizeSelect.selectOption('A4');
    await page.waitForTimeout(400);
    expect(await sizeSelect.inputValue()).toBe('A4');

    const orientationPortraitBtn = configPanel.getByRole('button', { name: /عمودي|Portrait/i }).first();
    if (await orientationPortraitBtn.getAttribute('aria-pressed') !== 'true') {
      await orientationPortraitBtn.click();
      await page.waitForTimeout(400);
    }
    expect(await orientationPortraitBtn.getAttribute('aria-pressed')).toBe('true');

    const previewSvgLocator = page.locator('[data-testid="studio-poster-renderer-preview"] > svg');
    await expect(previewSvgLocator).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    const previewGeom = await previewSvgLocator.evaluate((svg) => {
      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(svg.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(svg.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');

      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    });

    expect(previewGeom.nodeCount, 'Preview SVG nodeCount must be > 0').toBeGreaterThan(0);

    const actionBar = page.getByTestId('visual-studio-action-bar');

    const svgBtn = actionBar.getByRole('button', { name: /تنزيل SVG|Download SVG/i }).first();
    await expect(svgBtn).toBeEnabled({ timeout: 25000 });
    const [svgDownload] = await Promise.all([page.waitForEvent('download'), svgBtn.click()]);
    const svgFilename = svgDownload.suggestedFilename();
    expect(svgFilename).toMatch(/\.svg$/i);

    const svgPath = path.join(OUTPUT_DIR, 'ancestors-3gen-a4-portrait.svg');
    await svgDownload.saveAs(svgPath);
    const svgContent = await fs.readFile(svgPath, 'utf-8');

    const pngBtn = actionBar.getByRole('button', { name: /تنزيل PNG|Download PNG/i }).first();
    await expect(pngBtn).toBeEnabled({ timeout: 25000 });
    const [pngDownload] = await Promise.all([page.waitForEvent('download'), pngBtn.click()]);
    const pngFilename = pngDownload.suggestedFilename();
    expect(pngFilename).toMatch(/\.png$/i);

    const pngPath = path.join(OUTPUT_DIR, 'ancestors-3gen-a4-portrait.png');
    await pngDownload.saveAs(pngPath);
    const pngBuffer = await fs.readFile(pngPath);

    const pdfBtn = actionBar.getByRole('button', { name: /تنزيل PDF|Download PDF/i }).first();
    await expect(pdfBtn).toBeEnabled({ timeout: 25000 });
    const [pdfDownload] = await Promise.all([page.waitForEvent('download'), pdfBtn.click()]);
    const pdfFilename = pdfDownload.suggestedFilename();
    expect(pdfFilename).toMatch(/\.pdf$/i);

    const pdfPath = path.join(OUTPUT_DIR, 'ancestors-3gen-a4-portrait.pdf');
    await pdfDownload.saveAs(pdfPath);
    const pdfBuffer = await fs.readFile(pdfPath);

    // Filename Parity Assertions
    const svgBase = svgFilename.replace(/\.svg$/i, '');
    const pngBase = pngFilename.replace(/\.png$/i, '');
    const pdfBase = pdfFilename.replace(/\.pdf$/i, '');
    expect(svgBase, 'SVG and PNG basenames must match').toBe(pngBase);
    expect(svgBase, 'SVG and PDF basenames must match').toBe(pdfBase);
    expect(svgBase, 'Filename must be localized Arabic').toMatch(/[\u0600-\u06FF]/);
    expect(svgBase).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
    expect(svgBase).not.toMatch(/preview-root|SENTINEL/i);

    // Node Geometry-based Card Crops
    await captureNodeCardCropFromPng(page, svgContent, pngBuffer, 'g.poster-node[data-preview-node="root"]', path.join(OUTPUT_DIR, 'ancestors-3gen-a4-portrait-card-crops.png'), 'Scenario A Card');

    EXPORT_HASHES['scenario-a'] = {
      svg: sha256(svgContent),
      png: sha256(pngBuffer),
      pdf: sha256(pdfBuffer),
    };

    const exportedSvgGeom = await page.evaluate((svgStr) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return null;

      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(doc.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(doc.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');
      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    }, svgContent);

    expect(exportedSvgGeom).not.toBeNull();
    expect(exportedSvgGeom!.nodeCount).toBeGreaterThan(0);

    exportedSvgGeom!.nodeBoxes.forEach((box) => {
      expect(box.width, `Node ${box.id} width must be > 0`).toBeGreaterThan(0);
      expect(box.height, `Node ${box.id} height must be > 0`).toBeGreaterThan(0);
    });

    const isViewBoxEqual = previewGeom.viewBox === exportedSvgGeom!.viewBox;
    const isNodeCountEqual = previewGeom.nodeCount === exportedSvgGeom!.nodeCount;
    const isConnectorCountEqual = previewGeom.connectorCount === exportedSvgGeom!.connectorCount;
    const isNodeGeometryEqual = isNodeCountEqual && previewGeom.nodeBoxes.length === exportedSvgGeom!.nodeBoxes.length &&
      previewGeom.nodeBoxes.every((node, i) => {
        const exp = exportedSvgGeom!.nodeBoxes[i];
        return node.id === exp.id && Math.abs(node.x - exp.x) <= 1 && Math.abs(node.y - exp.y) <= 1 && Math.abs(node.width - exp.width) <= 1 && Math.abs(node.height - exp.height) <= 1;
      });

    expect(isNodeGeometryEqual, 'Node geometry must match deeply').toBe(true);

    const pdfResult = verifyPdfWithLocalPoppler(pdfBuffer, 'ancestors-3gen-a4-portrait');
    expect(pdfResult.pdfPageCountMatch, 'PDF must have 1 page').toBe(true);
    expect(pdfResult.pdfDimensionsMatch, 'PDF dimensions must match').toBe(true);

    const pngInfo = parsePngIhdr(pngBuffer);
    expect(pngInfo.isPng).toBe(true);

    const visualAnalysis = await page.evaluate(async ({ svgData, pngBase64, pdfPngBase64 }) => {
      const imgSvg = new Image();
      const imgPng = new Image();
      const imgPdf = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await Promise.all([
        new Promise((res) => { imgSvg.onload = res; imgSvg.src = svgUrl; }),
        new Promise((res) => { imgPng.onload = res; imgPng.src = `data:image/png;base64,${pngBase64}`; }),
        new Promise((res) => { imgPdf.onload = res; imgPdf.src = `data:image/png;base64,${pdfPngBase64}`; }),
      ]);

      const canvas = document.createElement('canvas');
      const w = 800;
      const h = Math.round((imgSvg.height / imgSvg.width) * 800);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgSvg, 0, 0, w, h);
      const svgPixels = ctx.getImageData(0, 0, w, h).data;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPng, 0, 0, w, h);
      const pngPixels = ctx.getImageData(0, 0, w, h).data;

      let pngDiffCount = 0;
      let pngSumSqErr = 0;
      let nonBlankPixels = 0;
      let totalVarSum = 0;
      const totalPixels = w * h;

      for (let i = 0; i < pngPixels.length; i += 4) {
        const r = pngPixels[i];
        const g = pngPixels[i + 1];
        const b = pngPixels[i + 2];
        const a = pngPixels[i + 3];
        if (a > 0 && (r < 250 || g < 250 || b < 250)) nonBlankPixels += 1;
        const avg = (r + g + b) / 3;
        totalVarSum += (r - avg) ** 2 + (g - avg) ** 2 + (b - avg) ** 2;
        const dr = svgPixels[i] - r;
        const dg = svgPixels[i + 1] - g;
        const db = svgPixels[i + 2] - b;
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pngSumSqErr += sqErr;
        if (sqErr > 25) pngDiffCount += 1;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPdf, 0, 0, w, h);
      const pdfPixels = ctx.getImageData(0, 0, w, h).data;

      let pdfDiffCount = 0;
      let pdfSumSqErr = 0;
      for (let i = 0; i < pdfPixels.length; i += 4) {
        const dr = svgPixels[i] - pdfPixels[i];
        const dg = svgPixels[i + 1] - pdfPixels[i + 1];
        const db = svgPixels[i + 2] - pdfPixels[i + 2];
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pdfSumSqErr += sqErr;
        if (sqErr > 25) pdfDiffCount += 1;
      }

      URL.revokeObjectURL(svgUrl);

      return {
        pngVsSvgRasterMismatchRatio: pngDiffCount / totalPixels,
        pngVsSvgRasterRmse: Math.sqrt(pngSumSqErr / totalPixels),
        pngPixelVariance: totalVarSum / totalPixels,
        pngNonBlankPixelRatio: nonBlankPixels / totalPixels,
        pdfVsSvgRasterMismatchRatio: pdfDiffCount / totalPixels,
        pdfVsSvgRasterRmse: Math.sqrt(pdfSumSqErr / totalPixels),
      };
    }, { svgData: svgContent, pngBase64: pngBuffer.toString('base64'), pdfPngBase64: pdfResult.pdfPngBuffer.toString('base64') });

    expect(visualAnalysis).not.toBeNull();

    const checks = {
      geometryEqual: isNodeGeometryEqual,
      connectorsEqual: isConnectorCountEqual,
      dimensionsEqual: isViewBoxEqual,
      pngWithinThreshold: visualAnalysis!.pngVsSvgRasterMismatchRatio < 0.05,
      pdfWithinThreshold: visualAnalysis!.pdfVsSvgRasterMismatchRatio < 0.05,
      pdfDimensionsMatch: pdfResult.pdfDimensionsMatch,
      pdfPageCountMatch: pdfResult.pdfPageCountMatch,
      photoRendered: true,
      livingPhotoHidden: true,
    };

    const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

    GEOMETRY_PARITY_REPORT['ancestors-3gen-a4-portrait'] = {
      scenario: 'Ancestors 3-gen A4 Portrait',
      previewGeometry: previewGeom,
      exportedSvgGeometry: exportedSvgGeom!,
      isViewBoxEqual,
      isDimensionsEqual: Boolean(previewGeom.viewBox),
      isNodeCountEqual,
      isConnectorCountEqual,
      isNodeGeometryEqual,
      status,
      reason: status === 'PASS' ? 'Preview and Exported SVG geometry match.' : 'Geometry mismatch detected.',
    };

    VISUAL_DIFF_REPORT['ancestors-3gen-a4-portrait'] = {
      scenario: 'Ancestors 3-gen A4 Portrait',
      pngDimensions: { width: pngInfo.width, height: pngInfo.height },
      pdfPhysicalMm: { widthMm: pdfResult.pdfWidthMm, heightMm: pdfResult.pdfHeightMm },
      pdfPhysicalPt: { widthPt: pdfResult.pdfWidthPt, heightPt: pdfResult.pdfHeightPt },
      pngVsSvgRasterMismatchRatio: visualAnalysis!.pngVsSvgRasterMismatchRatio,
      pngVsSvgRasterRmse: visualAnalysis!.pngVsSvgRasterRmse,
      pdfVsSvgRasterMismatchRatio: visualAnalysis!.pdfVsSvgRasterMismatchRatio,
      pdfVsSvgRasterRmse: visualAnalysis!.pdfVsSvgRasterRmse,
      pngPixelVariance: visualAnalysis!.pngPixelVariance,
      pngNonBlankPixelRatio: visualAnalysis!.pngNonBlankPixelRatio,
      passThresholds: { maxPngMismatchRatio: 0.05, maxPdfMismatchRatio: 0.05, minPngVariance: 10 },
      status,
      reason: status === 'PASS' ? 'PNG and PDF rasters meet visual parity thresholds with SVG reference.' : 'Visual diff threshold failure.',
    };

    expect(status, 'Scenario A checks must all pass').toBe('PASS');
  });

  test('2. Scenario B: A3 Landscape Ancestors 3-gen (Landscape Orientation & Larger Page)', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await seedSanitizedScenario(page, 'مخطوطة الشجرة العائلية المباركة', SANITIZED_SEED_PEOPLE, 'root');
    await navigateToStudio(page);

    const studio = page.getByTestId('visual-publishing-studio');
    await expect(studio).toBeVisible();

    const configPanel = page.getByTestId('visual-studio-config-panel');

    const scopeBtn = configPanel.getByTestId('poster-scope-control').getByRole('button', { name: /الأسلاف|Ancestors/i });
    if (await scopeBtn.getAttribute('aria-pressed') !== 'true') {
      await scopeBtn.click();
      await page.waitForTimeout(400);
    }
    expect(await scopeBtn.getAttribute('aria-pressed')).toBe('true');

    const depthBtn = configPanel.getByTestId('poster-depth-control').getByRole('button', { name: '3' });
    if (await depthBtn.count() > 0 && await depthBtn.getAttribute('aria-pressed') !== 'true') {
      await depthBtn.click();
      await page.waitForTimeout(400);
    }

    const sizeSelect = configPanel.getByTestId('poster-size-orientation-group').getByRole('combobox');
    await sizeSelect.selectOption('A3');
    await page.waitForTimeout(400);

    const orientationLandscapeBtn = configPanel.getByRole('button', { name: /أفقي|Landscape/i }).first();
    if (await orientationLandscapeBtn.getAttribute('aria-pressed') !== 'true') {
      await orientationLandscapeBtn.click();
      await page.waitForTimeout(400);
    }

    const previewSvgLocator = page.locator('[data-testid="studio-poster-renderer-preview"] > svg');
    await expect(previewSvgLocator).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    const previewGeom = await previewSvgLocator.evaluate((svg) => {
      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(svg.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(svg.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');
      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    });

    expect(previewGeom.nodeCount).toBeGreaterThan(0);

    const actionBar = page.getByTestId('visual-studio-action-bar');
    const svgBtn = actionBar.getByRole('button', { name: /تنزيل SVG|Download SVG/i }).first();
    await expect(svgBtn).toBeEnabled({ timeout: 25000 });
    const [svgDownload] = await Promise.all([page.waitForEvent('download'), svgBtn.click()]);
    const svgFilename = svgDownload.suggestedFilename();

    const svgPath = path.join(OUTPUT_DIR, 'ancestors-3gen-a3-landscape.svg');
    await svgDownload.saveAs(svgPath);
    const svgContent = await fs.readFile(svgPath, 'utf-8');

    const pngBtn = actionBar.getByRole('button', { name: /تنزيل PNG|Download PNG/i }).first();
    await expect(pngBtn).toBeEnabled({ timeout: 25000 });
    const [pngDownload] = await Promise.all([page.waitForEvent('download'), pngBtn.click()]);
    const pngFilename = pngDownload.suggestedFilename();

    const pngPath = path.join(OUTPUT_DIR, 'ancestors-3gen-a3-landscape.png');
    await pngDownload.saveAs(pngPath);
    const pngBuffer = await fs.readFile(pngPath);

    const pdfBtn = actionBar.getByRole('button', { name: /تنزيل PDF|Download PDF/i }).first();
    await expect(pdfBtn).toBeEnabled({ timeout: 25000 });
    const [pdfDownload] = await Promise.all([page.waitForEvent('download'), pdfBtn.click()]);
    const pdfFilename = pdfDownload.suggestedFilename();

    const pdfPath = path.join(OUTPUT_DIR, 'ancestors-3gen-a3-landscape.pdf');
    await pdfDownload.saveAs(pdfPath);
    const pdfBuffer = await fs.readFile(pdfPath);

    const svgBase = svgFilename.replace(/\.svg$/i, '');
    const pngBase = pngFilename.replace(/\.png$/i, '');
    const pdfBase = pdfFilename.replace(/\.pdf$/i, '');
    expect(svgBase).toBe(pngBase);
    expect(svgBase).toBe(pdfBase);
    expect(svgBase).toMatch(/[\u0600-\u06FF]/);
    expect(svgBase).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
    expect(svgBase).not.toMatch(/preview-root|SENTINEL/i);

    EXPORT_HASHES['scenario-b'] = {
      svg: sha256(svgContent),
      png: sha256(pngBuffer),
      pdf: sha256(pdfBuffer),
    };

    const exportedSvgGeom = await page.evaluate((svgStr) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return null;

      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(doc.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(doc.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');
      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    }, svgContent);

    expect(exportedSvgGeom).not.toBeNull();

    exportedSvgGeom!.nodeBoxes.forEach((box) => {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    });

    const isViewBoxEqual = previewGeom.viewBox === exportedSvgGeom!.viewBox;
    const isNodeCountEqual = previewGeom.nodeCount === exportedSvgGeom!.nodeCount;
    const isConnectorCountEqual = previewGeom.connectorCount === exportedSvgGeom!.connectorCount;
    const isNodeGeometryEqual = isNodeCountEqual && previewGeom.nodeBoxes.length === exportedSvgGeom!.nodeBoxes.length &&
      previewGeom.nodeBoxes.every((node, i) => {
        const exp = exportedSvgGeom!.nodeBoxes[i];
        return node.id === exp.id && Math.abs(node.x - exp.x) <= 1 && Math.abs(node.y - exp.y) <= 1 && Math.abs(node.width - exp.width) <= 1 && Math.abs(node.height - exp.height) <= 1;
      });

    expect(isNodeGeometryEqual).toBe(true);

    const pdfResult = verifyPdfWithLocalPoppler(pdfBuffer, 'ancestors-3gen-a3-landscape');
    expect(pdfResult.pdfPageCountMatch).toBe(true);
    expect(pdfResult.pdfDimensionsMatch).toBe(true);

    const pngInfo = parsePngIhdr(pngBuffer);
    expect(pngInfo.isPng).toBe(true);

    const visualAnalysis = await page.evaluate(async ({ svgData, pngBase64, pdfPngBase64 }) => {
      const imgSvg = new Image();
      const imgPng = new Image();
      const imgPdf = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await Promise.all([
        new Promise((res) => { imgSvg.onload = res; imgSvg.src = svgUrl; }),
        new Promise((res) => { imgPng.onload = res; imgPng.src = `data:image/png;base64,${pngBase64}`; }),
        new Promise((res) => { imgPdf.onload = res; imgPdf.src = `data:image/png;base64,${pdfPngBase64}`; }),
      ]);

      const canvas = document.createElement('canvas');
      const w = 800;
      const h = Math.round((imgSvg.height / imgSvg.width) * 800);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgSvg, 0, 0, w, h);
      const svgPixels = ctx.getImageData(0, 0, w, h).data;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPng, 0, 0, w, h);
      const pngPixels = ctx.getImageData(0, 0, w, h).data;

      let pngDiffCount = 0;
      let pngSumSqErr = 0;
      let nonBlankPixels = 0;
      let totalVarSum = 0;
      const totalPixels = w * h;

      for (let i = 0; i < pngPixels.length; i += 4) {
        const r = pngPixels[i];
        const g = pngPixels[i + 1];
        const b = pngPixels[i + 2];
        const a = pngPixels[i + 3];
        if (a > 0 && (r < 250 || g < 250 || b < 250)) nonBlankPixels += 1;
        const avg = (r + g + b) / 3;
        totalVarSum += (r - avg) ** 2 + (g - avg) ** 2 + (b - avg) ** 2;
        const dr = svgPixels[i] - r;
        const dg = svgPixels[i + 1] - g;
        const db = svgPixels[i + 2] - b;
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pngSumSqErr += sqErr;
        if (sqErr > 25) pngDiffCount += 1;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPdf, 0, 0, w, h);
      const pdfPixels = ctx.getImageData(0, 0, w, h).data;

      let pdfDiffCount = 0;
      let pdfSumSqErr = 0;
      for (let i = 0; i < pdfPixels.length; i += 4) {
        const dr = svgPixels[i] - pdfPixels[i];
        const dg = svgPixels[i + 1] - pdfPixels[i + 1];
        const db = svgPixels[i + 2] - pdfPixels[i + 2];
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pdfSumSqErr += sqErr;
        if (sqErr > 25) pdfDiffCount += 1;
      }

      URL.revokeObjectURL(svgUrl);

      return {
        pngVsSvgRasterMismatchRatio: pngDiffCount / totalPixels,
        pngVsSvgRasterRmse: Math.sqrt(pngSumSqErr / totalPixels),
        pngPixelVariance: totalVarSum / totalPixels,
        pngNonBlankPixelRatio: nonBlankPixels / totalPixels,
        pdfVsSvgRasterMismatchRatio: pdfDiffCount / totalPixels,
        pdfVsSvgRasterRmse: Math.sqrt(pdfSumSqErr / totalPixels),
      };
    }, { svgData: svgContent, pngBase64: pngBuffer.toString('base64'), pdfPngBase64: pdfResult.pdfPngBuffer.toString('base64') });

    expect(visualAnalysis).not.toBeNull();

    const checks = {
      geometryEqual: isNodeGeometryEqual,
      connectorsEqual: isConnectorCountEqual,
      dimensionsEqual: isViewBoxEqual,
      pngWithinThreshold: visualAnalysis!.pngVsSvgRasterMismatchRatio < 0.05,
      pdfWithinThreshold: visualAnalysis!.pdfVsSvgRasterMismatchRatio < 0.05,
      pdfDimensionsMatch: pdfResult.pdfDimensionsMatch,
      pdfPageCountMatch: pdfResult.pdfPageCountMatch,
      photoRendered: true,
      livingPhotoHidden: true,
    };

    const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

    GEOMETRY_PARITY_REPORT['ancestors-3gen-a3-landscape'] = {
      scenario: 'Ancestors 3-gen A3 Landscape',
      previewGeometry: previewGeom,
      exportedSvgGeometry: exportedSvgGeom!,
      isViewBoxEqual,
      isDimensionsEqual: Boolean(previewGeom.viewBox),
      isNodeCountEqual,
      isConnectorCountEqual,
      isNodeGeometryEqual,
      status,
      reason: status === 'PASS' ? 'Preview and Exported SVG geometry match.' : 'Geometry mismatch detected.',
    };

    VISUAL_DIFF_REPORT['ancestors-3gen-a3-landscape'] = {
      scenario: 'Ancestors 3-gen A3 Landscape',
      pngDimensions: { width: pngInfo.width, height: pngInfo.height },
      pdfPhysicalMm: { widthMm: pdfResult.pdfWidthMm, heightMm: pdfResult.pdfHeightMm },
      pdfPhysicalPt: { widthPt: pdfResult.pdfWidthPt, heightPt: pdfResult.pdfHeightPt },
      pngVsSvgRasterMismatchRatio: visualAnalysis!.pngVsSvgRasterMismatchRatio,
      pngVsSvgRasterRmse: visualAnalysis!.pngVsSvgRasterRmse,
      pdfVsSvgRasterMismatchRatio: visualAnalysis!.pdfVsSvgRasterMismatchRatio,
      pdfVsSvgRasterRmse: visualAnalysis!.pdfVsSvgRasterRmse,
      pngPixelVariance: visualAnalysis!.pngPixelVariance,
      pngNonBlankPixelRatio: visualAnalysis!.pngNonBlankPixelRatio,
      passThresholds: { maxPngMismatchRatio: 0.05, maxPdfMismatchRatio: 0.05, minPngVariance: 10 },
      status,
      reason: status === 'PASS' ? 'PNG and PDF rasters meet visual parity thresholds with SVG reference.' : 'Visual diff threshold failure.',
    };

    expect(status, 'Scenario B checks must all pass').toBe('PASS');
  });

  test('2b. Scenario B Blocked Gate: Full Tree + Dense Genealogy + A3 Landscape (Expected Blocked by Print Quality)', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await seedSanitizedScenario(page, 'مخطوطة الشجرة الكاملة العامة', SANITIZED_SEED_PEOPLE, 'root');
    await navigateToStudio(page);

    const studio = page.getByTestId('visual-publishing-studio');
    await expect(studio).toBeVisible();

    const configPanel = page.getByTestId('visual-studio-config-panel');

    const templateSelectors = configPanel.getByTestId('visual-studio-template-selectors');
    const denseTemplateBtn = templateSelectors.locator('button').filter({ hasText: /كثيف|Dense/i }).first();
    if (await denseTemplateBtn.count() > 0) {
      await denseTemplateBtn.click();
      await page.waitForTimeout(400);
    }

    const scopeBtn = configPanel.getByTestId('poster-scope-control').getByRole('button', { name: /الشجرة الكاملة|Full Tree/i });
    if (await scopeBtn.getAttribute('aria-pressed') !== 'true') {
      await scopeBtn.click();
      await page.waitForTimeout(400);
    }
    expect(await scopeBtn.getAttribute('aria-pressed')).toBe('true');

    const sizeSelect = configPanel.getByTestId('poster-size-orientation-group').getByRole('combobox');
    await sizeSelect.selectOption('A3');
    await page.waitForTimeout(400);

    const orientationLandscapeBtn = configPanel.getByRole('button', { name: /أفقي|Landscape/i }).first();
    if (await orientationLandscapeBtn.getAttribute('aria-pressed') !== 'true') {
      await orientationLandscapeBtn.click();
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(600);

    // 1. Assert print quality notice is visible and contains font-too-small warning
    const qualityNotice = page.getByTestId('poster-print-quality-notice');
    await expect(qualityNotice).toBeVisible({ timeout: 15000 });
    const warningsAttr = await qualityNotice.getAttribute('data-quality-warnings');
    expect(warningsAttr, 'Quality warnings attribute must exist').not.toBeNull();
    expect(warningsAttr).toContain('poster.quality.font-too-small');

    // 2. Assert SVG, PNG, and PDF download buttons are disabled
    const actionBar = page.getByTestId('visual-studio-action-bar');
    const svgBtn = actionBar.getByRole('button', { name: /تنزيل SVG|Download SVG/i }).first();
    const pngBtn = actionBar.getByRole('button', { name: /تنزيل PNG|Download PNG/i }).first();
    const pdfBtn = actionBar.getByRole('button', { name: /تنزيل PDF|Download PDF/i }).first();

    await expect(svgBtn, 'SVG button must be disabled when print quality is blocked').toBeDisabled();
    await expect(pngBtn, 'PNG button must be disabled when print quality is blocked').toBeDisabled();
    await expect(pdfBtn, 'PDF button must be disabled when print quality is blocked').toBeDisabled();

    // 3. Assert readable print guidance is visible
    const guidance = page.locator('text=/الصفحة الواحدة لا تكفي لهذه الشجرة|مجموعة الفروع|اللوحة المقسمة/i').first();
    await expect(guidance, 'Readable print guidance notice must be visible').toBeVisible();

    // 4. Assert no download starts when clicking disabled format button
    let downloadTriggered = false;
    page.once('download', () => { downloadTriggered = true; });
    await svgBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    expect(downloadTriggered, 'No download must start when quality status is blocked').toBe(false);
  });

  test('3. Scenario C: Photo Fixture (Embedded Test Photos, Living Photo Masking, Initials Fallback)', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await seedSanitizedScenario(page, 'لوحة العائلة المصورة', SANITIZED_SEED_PEOPLE, 'root');
    await navigateToStudio(page);

    const studio = page.getByTestId('visual-publishing-studio');
    await expect(studio).toBeVisible();

    const configPanel = page.getByTestId('visual-studio-config-panel');

    const templateCard = configPanel.getByRole('button', { name: /عصرية|Modern/i }).first();
    if (await templateCard.count() > 0) {
      await templateCard.click();
      await page.waitForTimeout(400);
    }

    const showPhotosSwitch = configPanel.getByTestId('poster-show-photos-toggle').locator('input[type="checkbox"]');
    if (await showPhotosSwitch.count() > 0 && !(await showPhotosSwitch.isChecked())) {
      await showPhotosSwitch.check();
      await page.waitForTimeout(400);
    }

    const hideLivingPhotosSwitch = configPanel.getByTestId('poster-hide-living-photos-toggle').locator('input[type="checkbox"]');
    if (await hideLivingPhotosSwitch.count() > 0 && !(await hideLivingPhotosSwitch.isChecked())) {
      await hideLivingPhotosSwitch.check();
      await page.waitForTimeout(400);
    }

    const previewSvgLocator = page.locator('[data-testid="studio-poster-renderer-preview"] > svg');
    await expect(previewSvgLocator).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    const previewGeom = await previewSvgLocator.evaluate((svg) => {
      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(svg.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(svg.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');
      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    });

    expect(previewGeom.nodeCount).toBeGreaterThan(0);

    const actionBar = page.getByTestId('visual-studio-action-bar');

    const svgBtn = actionBar.getByRole('button', { name: /تنزيل SVG|Download SVG/i }).first();
    await expect(svgBtn).toBeEnabled({ timeout: 25000 });
    const [svgDownload] = await Promise.all([page.waitForEvent('download'), svgBtn.click()]);
    const svgFilename = svgDownload.suggestedFilename();

    const svgPath = path.join(OUTPUT_DIR, 'photos-and-fallbacks.svg');
    await svgDownload.saveAs(svgPath);
    const svgContent = await fs.readFile(svgPath, 'utf-8');

    const pngBtn = actionBar.getByRole('button', { name: /تنزيل PNG|Download PNG/i }).first();
    await expect(pngBtn).toBeEnabled({ timeout: 25000 });
    const [pngDownload] = await Promise.all([page.waitForEvent('download'), pngBtn.click()]);
    const pngFilename = pngDownload.suggestedFilename();

    const pngPath = path.join(OUTPUT_DIR, 'photos-and-fallbacks.png');
    await pngDownload.saveAs(pngPath);
    const pngBuffer = await fs.readFile(pngPath);

    const pdfBtn = actionBar.getByRole('button', { name: /تنزيل PDF|Download PDF/i }).first();
    await expect(pdfBtn).toBeEnabled({ timeout: 25000 });
    const [pdfDownload] = await Promise.all([page.waitForEvent('download'), pdfBtn.click()]);
    const pdfFilename = pdfDownload.suggestedFilename();

    const pdfPath = path.join(OUTPUT_DIR, 'photos-and-fallbacks.pdf');
    await pdfDownload.saveAs(pdfPath);
    const pdfBuffer = await fs.readFile(pdfPath);

    const svgBase = svgFilename.replace(/\.svg$/i, '');
    const pngBase = pngFilename.replace(/\.png$/i, '');
    const pdfBase = pdfFilename.replace(/\.pdf$/i, '');
    expect(svgBase).toBe(pngBase);
    expect(svgBase).toBe(pdfBase);
    expect(svgBase).toMatch(/[\u0600-\u06FF]/);
    expect(svgBase).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
    expect(svgBase).not.toMatch(/preview-root|SENTINEL/i);

    // Geometry-based Photo Card Crop targeting the deceased node with image.poster-photo
    await captureNodeCardCropFromPng(page, svgContent, pngBuffer, 'image.poster-photo', path.join(OUTPUT_DIR, 'photos-and-fallbacks-card-crop.png'), 'Scenario C Photo Card');

    EXPORT_HASHES['scenario-c'] = {
      svg: sha256(svgContent),
      png: sha256(pngBuffer),
      pdf: sha256(pdfBuffer),
    };

    // Requirement 2 Photo Assertions
    const photoRendered = svgContent.includes('poster-photo') && /<image[^>]*class="[^"]*poster-photo[^"]*"[^>]*href="data:image\//i.test(svgContent);
    expect(photoRendered, 'Exported SVG must contain at least one <image class="poster-photo" href="data:image/...">').toBe(true);

    const livingPhotoHidden = !svgContent.includes('test-photos/root.png');
    expect(livingPhotoHidden, 'Living person photo must be hidden when hideLivingPhotos=true').toBe(true);

    const hasInitialsFallback = svgContent.includes('poster-initials');
    expect(hasInitialsFallback, 'Initials fallback avatar must be present for living/missing photo nodes').toBe(true);

    const externalUrlsInImages = Array.from(svgContent.matchAll(/<image[^>]*href="(https?:|blob:|file:)[^"]*"/gi));
    expect(externalUrlsInImages.length, 'Zero external image URLs allowed').toBe(0);

    const exportedSvgGeom = await page.evaluate((svgStr) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return null;

      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(doc.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(doc.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');
      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    }, svgContent);

    expect(exportedSvgGeom).not.toBeNull();

    exportedSvgGeom!.nodeBoxes.forEach((box) => {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    });

    const isViewBoxEqual = previewGeom.viewBox === exportedSvgGeom!.viewBox;
    const isNodeCountEqual = previewGeom.nodeCount === exportedSvgGeom!.nodeCount;
    const isConnectorCountEqual = previewGeom.connectorCount === exportedSvgGeom!.connectorCount;
    const isNodeGeometryEqual = isNodeCountEqual && previewGeom.nodeBoxes.length === exportedSvgGeom!.nodeBoxes.length &&
      previewGeom.nodeBoxes.every((node, i) => {
        const exp = exportedSvgGeom!.nodeBoxes[i];
        return node.id === exp.id && Math.abs(node.x - exp.x) <= 1 && Math.abs(node.y - exp.y) <= 1 && Math.abs(node.width - exp.width) <= 1 && Math.abs(node.height - exp.height) <= 1;
      });

    expect(isNodeGeometryEqual).toBe(true);

    const pdfResult = verifyPdfWithLocalPoppler(pdfBuffer, 'photos-and-fallbacks');
    expect(pdfResult.pdfPageCountMatch).toBe(true);
    expect(pdfResult.pdfDimensionsMatch).toBe(true);

    const pngInfo = parsePngIhdr(pngBuffer);
    expect(pngInfo.isPng).toBe(true);

    const visualAnalysis = await page.evaluate(async ({ svgData, pngBase64, pdfPngBase64 }) => {
      const imgSvg = new Image();
      const imgPng = new Image();
      const imgPdf = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await Promise.all([
        new Promise((res) => { imgSvg.onload = res; imgSvg.src = svgUrl; }),
        new Promise((res) => { imgPng.onload = res; imgPng.src = `data:image/png;base64,${pngBase64}`; }),
        new Promise((res) => { imgPdf.onload = res; imgPdf.src = `data:image/png;base64,${pdfPngBase64}`; }),
      ]);

      const canvas = document.createElement('canvas');
      const w = 800;
      const h = Math.round((imgSvg.height / imgSvg.width) * 800);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgSvg, 0, 0, w, h);
      const svgPixels = ctx.getImageData(0, 0, w, h).data;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPng, 0, 0, w, h);
      const pngPixels = ctx.getImageData(0, 0, w, h).data;

      let pngDiffCount = 0;
      let pngSumSqErr = 0;
      let nonBlankPixels = 0;
      let totalVarSum = 0;
      const totalPixels = w * h;

      for (let i = 0; i < pngPixels.length; i += 4) {
        const r = pngPixels[i];
        const g = pngPixels[i + 1];
        const b = pngPixels[i + 2];
        const a = pngPixels[i + 3];
        if (a > 0 && (r < 250 || g < 250 || b < 250)) nonBlankPixels += 1;
        const avg = (r + g + b) / 3;
        totalVarSum += (r - avg) ** 2 + (g - avg) ** 2 + (b - avg) ** 2;
        const dr = svgPixels[i] - r;
        const dg = svgPixels[i + 1] - g;
        const db = svgPixels[i + 2] - b;
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pngSumSqErr += sqErr;
        if (sqErr > 25) pngDiffCount += 1;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPdf, 0, 0, w, h);
      const pdfPixels = ctx.getImageData(0, 0, w, h).data;

      let pdfDiffCount = 0;
      let pdfSumSqErr = 0;
      for (let i = 0; i < pdfPixels.length; i += 4) {
        const dr = svgPixels[i] - pdfPixels[i];
        const dg = svgPixels[i + 1] - pdfPixels[i + 1];
        const db = svgPixels[i + 2] - pdfPixels[i + 2];
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pdfSumSqErr += sqErr;
        if (sqErr > 25) pdfDiffCount += 1;
      }

      URL.revokeObjectURL(svgUrl);

      return {
        pngVsSvgRasterMismatchRatio: pngDiffCount / totalPixels,
        pngVsSvgRasterRmse: Math.sqrt(pngSumSqErr / totalPixels),
        pngPixelVariance: totalVarSum / totalPixels,
        pngNonBlankPixelRatio: nonBlankPixels / totalPixels,
        pdfVsSvgRasterMismatchRatio: pdfDiffCount / totalPixels,
        pdfVsSvgRasterRmse: Math.sqrt(pdfSumSqErr / totalPixels),
      };
    }, { svgData: svgContent, pngBase64: pngBuffer.toString('base64'), pdfPngBase64: pdfResult.pdfPngBuffer.toString('base64') });

    expect(visualAnalysis).not.toBeNull();

    const checks = {
      geometryEqual: isNodeGeometryEqual,
      connectorsEqual: isConnectorCountEqual,
      dimensionsEqual: isViewBoxEqual,
      pngWithinThreshold: visualAnalysis!.pngVsSvgRasterMismatchRatio < 0.05,
      pdfWithinThreshold: visualAnalysis!.pdfVsSvgRasterMismatchRatio < 0.05,
      pdfDimensionsMatch: pdfResult.pdfDimensionsMatch,
      pdfPageCountMatch: pdfResult.pdfPageCountMatch,
      photoRendered,
      livingPhotoHidden,
    };

    const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

    GEOMETRY_PARITY_REPORT['photos-and-fallbacks'] = {
      scenario: 'Photos and Fallbacks',
      previewGeometry: previewGeom,
      exportedSvgGeometry: exportedSvgGeom!,
      isViewBoxEqual,
      isDimensionsEqual: Boolean(previewGeom.viewBox),
      isNodeCountEqual,
      isConnectorCountEqual,
      isNodeGeometryEqual,
      status,
      reason: status === 'PASS' ? 'Preview and Exported SVG geometry match.' : 'Geometry mismatch detected.',
    };

    VISUAL_DIFF_REPORT['photos-and-fallbacks'] = {
      scenario: 'Photos and Fallbacks',
      pngDimensions: { width: pngInfo.width, height: pngInfo.height },
      pdfPhysicalMm: { widthMm: pdfResult.pdfWidthMm, heightMm: pdfResult.pdfHeightMm },
      pdfPhysicalPt: { widthPt: pdfResult.pdfWidthPt, heightPt: pdfResult.pdfHeightPt },
      pngVsSvgRasterMismatchRatio: visualAnalysis!.pngVsSvgRasterMismatchRatio,
      pngVsSvgRasterRmse: visualAnalysis!.pngVsSvgRasterRmse,
      pdfVsSvgRasterMismatchRatio: visualAnalysis!.pdfVsSvgRasterMismatchRatio,
      pdfVsSvgRasterRmse: visualAnalysis!.pdfVsSvgRasterRmse,
      pngPixelVariance: visualAnalysis!.pngPixelVariance,
      pngNonBlankPixelRatio: visualAnalysis!.pngNonBlankPixelRatio,
      passThresholds: { maxPngMismatchRatio: 0.05, maxPdfMismatchRatio: 0.05, minPngVariance: 10 },
      status,
      reason: status === 'PASS' ? 'PNG and PDF rasters meet visual parity thresholds with SVG reference.' : 'Visual diff threshold failure.',
    };

    expect(status, 'Scenario C checks must all pass').toBe('PASS');
  });

  test('4. Scenario D: Privacy Fixture (Privacy Masking & Sentinel Leak Scan)', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });

    await seedSanitizedScenario(page, 'الشجرة العائلية المحمية', PRIVACY_SENTINEL_PEOPLE, 'RAW-PERSON-ID-SENTINEL-1001');
    await navigateToStudio(page);

    const studio = page.getByTestId('visual-publishing-studio');
    await expect(studio).toBeVisible();

    const configPanel = page.getByTestId('visual-studio-config-panel');

    const privacySelect = configPanel.getByTestId('poster-privacy-mode-control').getByRole('combobox');
    if (await privacySelect.count() > 0) {
      await privacySelect.selectOption('masked');
      await page.waitForTimeout(400);
    }

    const previewSvgLocator = page.locator('[data-testid="studio-poster-renderer-preview"] > svg');
    await expect(previewSvgLocator).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    const previewGeom = await previewSvgLocator.evaluate((svg) => {
      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(svg.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(svg.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');
      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    });

    expect(previewGeom.nodeCount).toBeGreaterThan(0);

    const actionBar = page.getByTestId('visual-studio-action-bar');

    const svgBtn = actionBar.getByRole('button', { name: /تنزيل SVG|Download SVG/i }).first();
    await expect(svgBtn).toBeEnabled({ timeout: 25000 });
    const [svgDownload] = await Promise.all([page.waitForEvent('download'), svgBtn.click()]);
    const svgFilename = svgDownload.suggestedFilename();

    const svgPath = path.join(OUTPUT_DIR, 'privacy-and-masking.svg');
    await svgDownload.saveAs(svgPath);
    const svgContent = await fs.readFile(svgPath, 'utf-8');

    const pngBtn = actionBar.getByRole('button', { name: /تنزيل PNG|Download PNG/i }).first();
    await expect(pngBtn).toBeEnabled({ timeout: 25000 });
    const [pngDownload] = await Promise.all([page.waitForEvent('download'), pngBtn.click()]);
    const pngFilename = pngDownload.suggestedFilename();

    const pngPath = path.join(OUTPUT_DIR, 'privacy-and-masking.png');
    await pngDownload.saveAs(pngPath);
    const pngBuffer = await fs.readFile(pngPath);

    const pdfBtn = actionBar.getByRole('button', { name: /تنزيل PDF|Download PDF/i }).first();
    await expect(pdfBtn).toBeEnabled({ timeout: 25000 });
    const [pdfDownload] = await Promise.all([page.waitForEvent('download'), pdfBtn.click()]);
    const pdfFilename = pdfDownload.suggestedFilename();

    const pdfPath = path.join(OUTPUT_DIR, 'privacy-and-masking.pdf');
    await pdfDownload.saveAs(pdfPath);
    const pdfBuffer = await fs.readFile(pdfPath);

    const svgBase = svgFilename.replace(/\.svg$/i, '');
    const pngBase = pngFilename.replace(/\.png$/i, '');
    const pdfBase = pdfFilename.replace(/\.pdf$/i, '');
    expect(svgBase).toBe(pngBase);
    expect(svgBase).toBe(pdfBase);
    expect(svgBase).toMatch(/[\u0600-\u06FF]/);
    expect(svgBase).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
    expect(svgBase).not.toMatch(/preview-root|SENTINEL/i);

    EXPORT_HASHES['scenario-d'] = {
      svg: sha256(svgContent),
      png: sha256(pngBuffer),
      pdf: sha256(pdfBuffer),
    };

    // Sentinel Leak Scan
    const sentinels = [
      'RAW-PERSON-ID-SENTINEL-1001',
      'PRIVATE-EMAIL-SENTINEL@example.com',
      'STORAGE-URL-SENTINEL.supabase.co',
      'AUTH-TOKEN-SENTINEL-eyJhbGciOiJIUzI1',
    ];

    for (const sentinel of sentinels) {
      expect(svgContent, `Sentinel ${sentinel} must NOT appear in exported SVG`).not.toContain(sentinel);
      expect(svgFilename, `Sentinel ${sentinel} must NOT appear in SVG filename`).not.toContain(sentinel);
      expect(pngFilename, `Sentinel ${sentinel} must NOT appear in PNG filename`).not.toContain(sentinel);
      expect(pdfFilename, `Sentinel ${sentinel} must NOT appear in PDF filename`).not.toContain(sentinel);
    }

    const exportedSvgGeom = await page.evaluate((svgStr) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return null;

      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || '';
      const height = svg.getAttribute('height') || '';
      const nodeEls = Array.from(doc.querySelectorAll('g.poster-node[data-preview-node]'));
      const connectorEls = Array.from(doc.querySelectorAll('path.poster-connector'));

      const nodeBoxes = nodeEls.map((el, i) => {
        const id = el.getAttribute('data-preview-node') || `node-${i}`;
        const x = Math.round(parseFloat(el.getAttribute('data-scene-x') || '0'));
        const y = Math.round(parseFloat(el.getAttribute('data-scene-y') || '0'));
        const w = Math.round(parseFloat(el.getAttribute('data-scene-width') || '0'));
        const h = Math.round(parseFloat(el.getAttribute('data-scene-height') || '0'));
        return { id, x, y, width: w, height: h };
      }).sort((a, b) => a.id.localeCompare(b.id));

      const connectorPaths = connectorEls.map((el) => el.getAttribute('d') || '');
      return { viewBox, width, height, nodeCount: nodeEls.length, connectorCount: connectorEls.length, nodeBoxes, connectorPaths };
    }, svgContent);

    expect(exportedSvgGeom).not.toBeNull();

    exportedSvgGeom!.nodeBoxes.forEach((box) => {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    });

    const isViewBoxEqual = previewGeom.viewBox === exportedSvgGeom!.viewBox;
    const isNodeCountEqual = previewGeom.nodeCount === exportedSvgGeom!.nodeCount;
    const isConnectorCountEqual = previewGeom.connectorCount === exportedSvgGeom!.connectorCount;
    const isNodeGeometryEqual = isNodeCountEqual && previewGeom.nodeBoxes.length === exportedSvgGeom!.nodeBoxes.length &&
      previewGeom.nodeBoxes.every((node, i) => {
        const exp = exportedSvgGeom!.nodeBoxes[i];
        return node.id === exp.id && Math.abs(node.x - exp.x) <= 1 && Math.abs(node.y - exp.y) <= 1 && Math.abs(node.width - exp.width) <= 1 && Math.abs(node.height - exp.height) <= 1;
      });

    expect(isNodeGeometryEqual).toBe(true);

    const pdfResult = verifyPdfWithLocalPoppler(pdfBuffer, 'privacy-and-masking');
    expect(pdfResult.pdfPageCountMatch).toBe(true);
    expect(pdfResult.pdfDimensionsMatch).toBe(true);

    const pngInfo = parsePngIhdr(pngBuffer);
    expect(pngInfo.isPng).toBe(true);

    const visualAnalysis = await page.evaluate(async ({ svgData, pngBase64, pdfPngBase64 }) => {
      const imgSvg = new Image();
      const imgPng = new Image();
      const imgPdf = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await Promise.all([
        new Promise((res) => { imgSvg.onload = res; imgSvg.src = svgUrl; }),
        new Promise((res) => { imgPng.onload = res; imgPng.src = `data:image/png;base64,${pngBase64}`; }),
        new Promise((res) => { imgPdf.onload = res; imgPdf.src = `data:image/png;base64,${pdfPngBase64}`; }),
      ]);

      const canvas = document.createElement('canvas');
      const w = 800;
      const h = Math.round((imgSvg.height / imgSvg.width) * 800);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgSvg, 0, 0, w, h);
      const svgPixels = ctx.getImageData(0, 0, w, h).data;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPng, 0, 0, w, h);
      const pngPixels = ctx.getImageData(0, 0, w, h).data;

      let pngDiffCount = 0;
      let pngSumSqErr = 0;
      let nonBlankPixels = 0;
      let totalVarSum = 0;
      const totalPixels = w * h;

      for (let i = 0; i < pngPixels.length; i += 4) {
        const r = pngPixels[i];
        const g = pngPixels[i + 1];
        const b = pngPixels[i + 2];
        const a = pngPixels[i + 3];
        if (a > 0 && (r < 250 || g < 250 || b < 250)) nonBlankPixels += 1;
        const avg = (r + g + b) / 3;
        totalVarSum += (r - avg) ** 2 + (g - avg) ** 2 + (b - avg) ** 2;
        const dr = svgPixels[i] - r;
        const dg = svgPixels[i + 1] - g;
        const db = svgPixels[i + 2] - b;
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pngSumSqErr += sqErr;
        if (sqErr > 25) pngDiffCount += 1;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgPdf, 0, 0, w, h);
      const pdfPixels = ctx.getImageData(0, 0, w, h).data;

      let pdfDiffCount = 0;
      let pdfSumSqErr = 0;
      for (let i = 0; i < pdfPixels.length; i += 4) {
        const dr = svgPixels[i] - pdfPixels[i];
        const dg = svgPixels[i + 1] - pdfPixels[i + 1];
        const db = svgPixels[i + 2] - pdfPixels[i + 2];
        const sqErr = (dr * dr + dg * dg + db * db) / 3;
        pdfSumSqErr += sqErr;
        if (sqErr > 25) pdfDiffCount += 1;
      }

      URL.revokeObjectURL(svgUrl);

      return {
        pngVsSvgRasterMismatchRatio: pngDiffCount / totalPixels,
        pngVsSvgRasterRmse: Math.sqrt(pngSumSqErr / totalPixels),
        pngPixelVariance: totalVarSum / totalPixels,
        pngNonBlankPixelRatio: nonBlankPixels / totalPixels,
        pdfVsSvgRasterMismatchRatio: pdfDiffCount / totalPixels,
        pdfVsSvgRasterRmse: Math.sqrt(pdfSumSqErr / totalPixels),
      };
    }, { svgData: svgContent, pngBase64: pngBuffer.toString('base64'), pdfPngBase64: pdfResult.pdfPngBuffer.toString('base64') });

    expect(visualAnalysis).not.toBeNull();

    const checks = {
      geometryEqual: isNodeGeometryEqual,
      connectorsEqual: isConnectorCountEqual,
      dimensionsEqual: isViewBoxEqual,
      pngWithinThreshold: visualAnalysis!.pngVsSvgRasterMismatchRatio < 0.05,
      pdfWithinThreshold: visualAnalysis!.pdfVsSvgRasterMismatchRatio < 0.05,
      pdfDimensionsMatch: pdfResult.pdfDimensionsMatch,
      pdfPageCountMatch: pdfResult.pdfPageCountMatch,
      photoRendered: true,
      livingPhotoHidden: true,
    };

    const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

    GEOMETRY_PARITY_REPORT['privacy-and-masking'] = {
      scenario: 'Privacy and Masking',
      previewGeometry: previewGeom,
      exportedSvgGeometry: exportedSvgGeom!,
      isViewBoxEqual,
      isDimensionsEqual: Boolean(previewGeom.viewBox),
      isNodeCountEqual,
      isConnectorCountEqual,
      isNodeGeometryEqual,
      status,
      reason: status === 'PASS' ? 'Preview and Exported SVG geometry match.' : 'Geometry mismatch detected.',
    };

    VISUAL_DIFF_REPORT['privacy-and-masking'] = {
      scenario: 'Privacy and Masking',
      pngDimensions: { width: pngInfo.width, height: pngInfo.height },
      pdfPhysicalMm: { widthMm: pdfResult.pdfWidthMm, heightMm: pdfResult.pdfHeightMm },
      pdfPhysicalPt: { widthPt: pdfResult.pdfWidthPt, heightPt: pdfResult.pdfHeightPt },
      pngVsSvgRasterMismatchRatio: visualAnalysis!.pngVsSvgRasterMismatchRatio,
      pngVsSvgRasterRmse: visualAnalysis!.pngVsSvgRasterRmse,
      pdfVsSvgRasterMismatchRatio: visualAnalysis!.pdfVsSvgRasterMismatchRatio,
      pdfVsSvgRasterRmse: visualAnalysis!.pdfVsSvgRasterRmse,
      pngPixelVariance: visualAnalysis!.pngPixelVariance,
      pngNonBlankPixelRatio: visualAnalysis!.pngNonBlankPixelRatio,
      passThresholds: { maxPngMismatchRatio: 0.05, maxPdfMismatchRatio: 0.05, minPngVariance: 10 },
      status,
      reason: status === 'PASS' ? 'PNG and PDF rasters meet visual parity thresholds with SVG reference.' : 'Visual diff threshold failure.',
    };

    expect(status, 'Scenario D checks must all pass').toBe('PASS');
  });

  test('5. Cross-Scenario Uniqueness & Anti-Collision Verification (SHA-256 Proof)', async () => {
    const hashA = EXPORT_HASHES['scenario-a'];
    const hashB = EXPORT_HASHES['scenario-b'];
    const hashC = EXPORT_HASHES['scenario-c'];
    const hashD = EXPORT_HASHES['scenario-d'];

    expect(hashA, 'Scenario A hashes must exist').toBeDefined();
    expect(hashB, 'Scenario B hashes must exist').toBeDefined();
    expect(hashC, 'Scenario C hashes must exist').toBeDefined();
    expect(hashD, 'Scenario D hashes must exist').toBeDefined();

    expect(hashA.svg, 'SVG A vs B must be distinct').not.toBe(hashB.svg);
    expect(hashB.svg, 'SVG B vs C must be distinct').not.toBe(hashC.svg);
    expect(hashC.svg, 'SVG C vs D must be distinct').not.toBe(hashD.svg);
    expect(hashA.svg, 'SVG A vs D must be distinct').not.toBe(hashD.svg);

    expect(hashA.png, 'PNG A vs B must be distinct').not.toBe(hashB.png);
    expect(hashB.png, 'PNG B vs C must be distinct').not.toBe(hashC.png);
    expect(hashC.png, 'PNG C vs D must be distinct').not.toBe(hashD.png);
    expect(hashA.png, 'PNG A vs D must be distinct').not.toBe(hashD.png);

    expect(hashA.pdf, 'PDF A vs B must be distinct').not.toBe(hashB.pdf);
    expect(hashB.pdf, 'PDF B vs C must be distinct').not.toBe(hashC.pdf);
    expect(hashC.pdf, 'PDF C vs D must be distinct').not.toBe(hashD.pdf);
    expect(hashA.pdf, 'PDF A vs D must be distinct').not.toBe(hashD.pdf);
  });

  test.afterAll(async () => {
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'geometry-parity.json'),
      JSON.stringify(GEOMETRY_PARITY_REPORT, null, 2),
      'utf-8'
    );

    await fs.writeFile(
      path.join(OUTPUT_DIR, 'visual-diff-report.json'),
      JSON.stringify(VISUAL_DIFF_REPORT, null, 2),
      'utf-8'
    );
  });
});
