import { expect, test, type Download, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

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

const OUTPUT_DIR = path.resolve('output/playwright/visual-studio-large-format-print-proof');
const TEST_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PRIVATE_SENTINELS = [
  'raw-print-',
  'private-print-proof@example.test',
  'private-print-storage.supabase.co',
  'private-print-auth-token',
];

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
  lastName: 'آل جذور',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '1950',
  birthPlace: 'الرياض',
  birthSource: '',
  deathDate: '2020',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: true,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  photoUrl: TEST_PHOTO,
  gallery: [TEST_PHOTO],
  voiceNotes: [],
  sources: [],
  events: [],
  email: 'private-print-proof@example.test',
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
  'raw-print-root': person('raw-print-root', 'سالم بن عبدالله', {
    spouses: ['raw-print-spouse'],
    children: ['raw-print-branch-1', 'raw-print-branch-2', 'raw-print-branch-3'],
  }, {
    website: 'https://private-print-storage.supabase.co/root.jpg',
    bio: 'Bearer private-print-auth-token',
  }),
  'raw-print-spouse': person('raw-print-spouse', 'نورة بنت محمد', {
    spouses: ['raw-print-root'],
    children: ['raw-print-branch-1', 'raw-print-branch-2', 'raw-print-branch-3'],
  }, { gender: 'female' }),
  'raw-print-branch-1': person('raw-print-branch-1', 'عبدالله بن سالم', {
    parents: ['raw-print-root', 'raw-print-spouse'],
    children: ['raw-print-grandchild-1', 'raw-print-grandchild-2'],
  }),
  'raw-print-branch-2': person('raw-print-branch-2', 'محمد بن سالم', {
    parents: ['raw-print-root', 'raw-print-spouse'],
    children: ['raw-print-grandchild-3', 'raw-print-grandchild-4'],
  }),
  'raw-print-branch-3': person('raw-print-branch-3', 'مريم بنت سالم', {
    parents: ['raw-print-root', 'raw-print-spouse'],
    children: ['raw-print-grandchild-5', 'raw-print-grandchild-6'],
  }, { gender: 'female' }),
  'raw-print-grandchild-1': person('raw-print-grandchild-1', 'إبراهيم بن عبدالله', { parents: ['raw-print-branch-1'] }),
  'raw-print-grandchild-2': person('raw-print-grandchild-2', 'سارة بنت عبدالله', { parents: ['raw-print-branch-1'] }, { gender: 'female' }),
  'raw-print-grandchild-3': person('raw-print-grandchild-3', 'علي بن محمد', { parents: ['raw-print-branch-2'] }),
  'raw-print-grandchild-4': person('raw-print-grandchild-4', 'ليان بنت محمد', { parents: ['raw-print-branch-2'] }, { gender: 'female' }),
  'raw-print-grandchild-5': person('raw-print-grandchild-5', 'فيصل بن مريم', { parents: ['raw-print-branch-3'] }),
  'raw-print-grandchild-6': person('raw-print-grandchild-6', 'دانة بنت مريم', { parents: ['raw-print-branch-3'] }, { gender: 'female' }),
};

const OWNER: DebugUser = {
  uid: 'large-format-proof-owner',
  displayName: 'Large Format Proof Owner',
  email: 'large-format-proof-owner@example.test',
  photoURL: '',
};

const sha256 = (buffer: Buffer | string) => crypto.createHash('sha256').update(buffer).digest('hex');

async function seedScenario(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');
  await page.evaluate(({ people, user }) => {
    (window as DebugWindow).jozorDebug?.seedTreeScenario({
      people,
      focusId: 'raw-print-root',
      role: 'owner',
      treeName: 'شجرة عائلة جذور للطباعة الكبيرة',
      user,
    });
  }, { people: PEOPLE, user: OWNER });
  const loader = page.getByTestId('tree-loader');
  if (await loader.count() > 0) await expect(loader).toBeHidden({ timeout: 15000 });
}

async function navigateToStudio(page: Page) {
  const accountTrigger = page.getByTestId('account-menu-trigger');
  await expect(accountTrigger).toBeVisible({ timeout: 15000 });
  await accountTrigger.click();
  const vaultEntry = page.locator('button:visible').filter({ hasText: /The Vault|الخزنة/i }).last();
  await expect(vaultEntry).toBeVisible();
  await vaultEntry.click();

  const publishingNav = page.getByRole('button', { name: /النشر والنسخ الاحتياطي|Publishing & Backup/i }).first();
  await expect(publishingNav).toBeVisible({ timeout: 15000 });
  await publishingNav.click();
  const visualOutputsTab = page.getByRole('tab', { name: /المخرجات البصرية|Visual Outputs/i });
  await expect(visualOutputsTab).toBeVisible();
  await visualOutputsTab.click();
  await expect(page.getByTestId('visual-publishing-studio')).toBeVisible({ timeout: 15000 });
}

async function selectPressed(button: ReturnType<Page['getByRole']>) {
  await expect(button).toBeVisible();
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function saveDownload(download: Download, fileName: string) {
  const outputPath = path.join(OUTPUT_DIR, fileName);
  await download.saveAs(outputPath);
  return readFile(outputPath);
}

async function downloadFromButton(page: Page, name: RegExp, fileName: string) {
  const button = page.getByRole('button', { name }).first();
  await expect(button).toBeVisible({ timeout: 15000 });
  await expect(button).toBeEnabled({ timeout: 15000 });
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const buffer = await saveDownload(download, fileName);
  return { buffer, suggestedFileName: download.suggestedFilename() };
}

function readPdfPhysicalSize(buffer: Buffer) {
  expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  const source = buffer.toString('latin1');
  const match = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/);
  expect(match, 'PDF must expose a physical MediaBox').not.toBeNull();
  return {
    widthMm: Number(match![1]) * (25.4 / 72),
    heightMm: Number(match![2]) * (25.4 / 72),
  };
}

function assertPrivateSentinelsAbsent(value: string) {
  for (const sentinel of PRIVATE_SENTINELS) expect(value).not.toContain(sentinel);
}

test.describe('Visual Publishing Studio large-format digital print proof', () => {
  test.beforeAll(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true });
    await mkdir(OUTPUT_DIR, { recursive: true });
  });

  test('exports A2/A1/A0 and verifies Branch Collection and Tiled Wall packages', async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => localStorage.setItem('language', 'ar'));
    await seedScenario(page);
    await navigateToStudio(page);

    await selectPressed(page.getByRole('button', { name: 'الأحفاد', exact: true }));
    await page.getByRole('button', { name: 'التراث الكلاسيكي', exact: true }).click();
    await page.getByRole('button', { name: 'عرض جميع البيانات والمعلومات', exact: true }).click();

    const proof: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      classification: 'digital-print-proof-physical-printer-review-pending',
      formats: {},
      packages: {},
    };
    const formats = proof.formats as Record<string, unknown>;
    const expectedMm = {
      A2: { width: 594, height: 420 },
      A1: { width: 841, height: 594 },
      A0: { width: 1189, height: 841 },
    } as const;

    for (const size of ['A2', 'A1', 'A0'] as const) {
      const sizeButton = page.getByTestId('poster-page-size-controls').getByRole('button', { name: size, exact: true });
      await selectPressed(sizeButton);
      await expect(page.getByTestId('visual-studio-action-bar')).toBeVisible();

      const svg = await downloadFromButton(page, /تنزيل SVG|Download SVG/i, `${size.toLowerCase()}-classic-heritage.svg`);
      const svgText = svg.buffer.toString('utf8');
      expect(svgText).toContain('data-poster-theme="classic-heritage"');
      expect(svgText).toContain('data-poster-card-layout="photo-focused"');
      expect(svgText).toContain('<image');
      assertPrivateSentinelsAbsent(svgText);

      const pdf = await downloadFromButton(page, /تنزيل PDF|Download PDF/i, `${size.toLowerCase()}-classic-heritage.pdf`);
      const physical = readPdfPhysicalSize(pdf.buffer);
      expect(physical.widthMm).toBeCloseTo(expectedMm[size].width, 0);
      expect(physical.heightMm).toBeCloseTo(expectedMm[size].height, 0);

      const entry: Record<string, unknown> = {
        orientation: 'landscape',
        physicalSizeMm: physical,
        svgBytes: svg.buffer.length,
        pdfBytes: pdf.buffer.length,
        svgSha256: sha256(svg.buffer),
        pdfSha256: sha256(pdf.buffer),
        suggestedSvgFileName: svg.suggestedFileName,
        suggestedPdfFileName: pdf.suggestedFileName,
      };

      if (size === 'A2') {
        const png = await downloadFromButton(page, /تنزيل PNG|Download PNG/i, 'a2-classic-heritage.png');
        expect(png.buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const pngWidth = png.buffer.readUInt32BE(16);
        const pngHeight = png.buffer.readUInt32BE(20);
        expect(pngWidth).toBeGreaterThan(pngHeight);
        expect(pngWidth).toBeGreaterThanOrEqual(4000);
        Object.assign(entry, {
          pngBytes: png.buffer.length,
          pngDimensions: { width: pngWidth, height: pngHeight },
          pngSha256: sha256(png.buffer),
          suggestedPngFileName: png.suggestedFileName,
        });
        await page.getByRole('button', { name: /فتح معاينة كبيرة|Open large preview/i }).click();
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'a2-classic-heritage-preview.png') });
        await page.getByTestId('poster-preview-expanded-dialog').getByRole('button').first().click();
      }

      formats[size] = entry;
    }

    await page.getByTestId('poster-layout-engine-control').getByRole('button', { name: /الشجرة الكاملة|Full Family Tree/i }).click();
    const assemblyControls = page.getByTestId('poster-output-assembly-controls');

    await assemblyControls.getByRole('button', { name: /مجموعة الفروع|Branch collection/i }).click();
    const branch = await downloadFromButton(page, /تنزيل مجموعة الفروع|Download branch collection/i, 'branch-collection.zip');
    const branchZip = await JSZip.loadAsync(branch.buffer);
    const branchFiles = Object.keys(branchZip.files).filter((name) => !branchZip.files[name]!.dir);
    const branchManifestText = await branchZip.file('manifest.json')!.async('string');
    const branchManifest = JSON.parse(branchManifestText) as { itemCount: number; representedPeople: number };
    expect(branchFiles).toContain('overview.svg');
    expect(branchManifest.itemCount).toBe(3);
    expect(branchFiles.filter((name) => name.startsWith('branches/') && name.endsWith('.svg'))).toHaveLength(3);
    assertPrivateSentinelsAbsent(await Promise.all(branchFiles.filter((name) => name.endsWith('.svg')).map((name) => branchZip.file(name)!.async('string'))).then((items) => items.join('\n')));

    await assemblyControls.getByRole('button', { name: /لوحة مقسمة|Tiled wall/i }).click();
    const tiled = await downloadFromButton(page, /تنزيل لوحة مقسمة|Download tiled wall poster/i, 'tiled-wall.zip');
    const tiledZip = await JSZip.loadAsync(tiled.buffer);
    const tiledFiles = Object.keys(tiledZip.files).filter((name) => !tiledZip.files[name]!.dir);
    const assemblyText = await tiledZip.file('assembly.json')!.async('string');
    const assembly = JSON.parse(assemblyText) as { rows: number; columns: number; order: unknown[]; assembledPhysicalSizeMm: { width: number; height: number } };
    expect(assembly.rows).toBe(3);
    expect(assembly.columns).toBe(3);
    expect(assembly.order).toHaveLength(9);
    expect(tiledFiles.filter((name) => name.startsWith('tiles/') && name.endsWith('.svg'))).toHaveLength(9);
    assertPrivateSentinelsAbsent(await Promise.all(tiledFiles.filter((name) => name.endsWith('.svg')).map((name) => tiledZip.file(name)!.async('string'))).then((items) => items.join('\n')));

    proof.packages = {
      branchCollection: {
        fileCount: branchFiles.length,
        itemCount: branchManifest.itemCount,
        representedPeople: branchManifest.representedPeople,
        sha256: sha256(branch.buffer),
      },
      tiledWall: {
        fileCount: tiledFiles.length,
        rows: assembly.rows,
        columns: assembly.columns,
        assembledPhysicalSizeMm: assembly.assembledPhysicalSizeMm,
        sha256: sha256(tiled.buffer),
      },
    };

    await writeFile(path.join(OUTPUT_DIR, 'proof-manifest.json'), JSON.stringify(proof, null, 2), 'utf8');
  });
});
