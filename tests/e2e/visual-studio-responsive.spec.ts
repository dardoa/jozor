import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
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

type MeasuredViewport = {
  name: string;
  viewportWidth: number;
  viewportHeight: number;
  studioHostWidth: number;
  studioClientWidth: number;
  studioScrollWidth: number;
  actionBarClientWidth: number;
  actionBarScrollWidth: number;
  configPanelClientWidth: number;
  configPanelScrollWidth: number;
};

const OUTPUT_DIR = path.resolve('output/playwright/visual-studio-responsive');
const MEASUREMENTS: MeasuredViewport[] = [];

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 767, height: 1024, name: '767x1024' },
  { width: 390, height: 844, name: '390x844' },
];

const SANITIZED_SEED_PEOPLE = {
  root: {
    id: 'root',
    title: 'الشيخ',
    firstName: 'عبدالله بن محمد بن علي بن عثمان',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: 'أبو فهد',
    suffix: '',
    gender: 'male',
    birthDate: '1980',
    birthPlace: 'الرياض، المملكة العربية السعودية',
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
    bio: 'سيرة ذاتية تفصيلية مبسطة لاختبار النصوص العربية الطويلة في معينة البوستر واستجابة اللوحة',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: ['father', 'mother'],
    spouses: ['spouse1'],
    children: ['child1', 'child2', 'child3'],
    partnerDetails: {},
    isPrivate: false,
  },
  father: {
    id: 'father',
    title: 'الشيخ',
    firstName: 'محمد بن علي بن عثمان',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '1950',
    birthPlace: '',
    birthSource: '',
    deathDate: '2015',
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
    parents: ['grandfather'],
    spouses: ['mother'],
    children: ['root', 'brother1'],
    partnerDetails: {},
    isPrivate: false,
  },
  mother: {
    id: 'mother',
    title: '',
    firstName: 'فاطمة بنت سليمان بن عبدالمحسن',
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
    title: 'الشيخ الكبير',
    firstName: 'علي بن عثمان بن إبراهيم',
    middleName: '',
    lastName: 'الجذور القديم',
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
    children: ['nephew1'],
    partnerDetails: {},
    isPrivate: false,
  },
  spouse1: {
    id: 'spouse1',
    title: '',
    firstName: 'نورة بنت عبدالرحمن بن ناصر',
    middleName: '',
    lastName: 'السعود الناصر',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'female',
    birthDate: '1984',
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
    children: ['child1', 'child2', 'child3'],
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
    children: ['grandchild1'],
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
  child3: {
    id: 'child3',
    title: '',
    firstName: 'خالد بن عبدالله بن محمد',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '2015',
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
  nephew1: {
    id: 'nephew1',
    title: '',
    firstName: 'فهد بن إبراهيم بن محمد',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '2010',
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
    parents: ['brother1'],
    spouses: [],
    children: [],
    partnerDetails: {},
    isPrivate: false,
  },
  grandchild1: {
    id: 'grandchild1',
    title: '',
    firstName: 'سلمان بن سعود بن عبدالله',
    middleName: '',
    lastName: 'الجذور آل الشيخ',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '2025',
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
    parents: ['child1'],
    spouses: [],
    children: [],
    partnerDetails: {},
    isPrivate: false,
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
  treeName = 'مخطوط شجرة عائلة الجذور التراثية الشاملة الكاملة',
  focusId = 'father'
) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const jozorDebug = (window as DebugWindow).jozorDebug;
    return typeof jozorDebug?.seedTreeScenario === 'function';
  });

  await page.evaluate(({ people, user, treeName, focusId }) => {
    (window as DebugWindow).jozorDebug?.seedTreeScenario({
      people,
      focusId,
      role: 'owner',
      treeName,
      user,
    });
  }, { people: SANITIZED_SEED_PEOPLE, user: SANITIZED_OWNER_USER, treeName, focusId });

  const loader = page.getByTestId('tree-loader');
  if (await loader.count() > 0) {
    await expect(loader).toBeHidden({ timeout: 15000 });
  }

  await page.waitForTimeout(500);
}

async function openVaultAndNavigateToStudio(page: Page, viewportWidth: number) {
  await page.waitForTimeout(500);
  if (viewportWidth <= 767) {
    const mobileActionsNav = page.getByRole('navigation', { name: /Mobile actions|إجراءات الجوال/i });
    const vaultMobileBtn = mobileActionsNav.getByRole('button', { name: /The Vault|الخزنة/i });
    if (await vaultMobileBtn.isVisible().catch(() => false)) {
      await vaultMobileBtn.click();
    } else {
      const accountTrigger = page.getByTestId('account-menu-trigger');
      if (await accountTrigger.isVisible({ timeout: 10000 }).catch(() => false)) {
        await accountTrigger.click();
        await page.waitForTimeout(400);
        const vaultEntry = page.locator('button:visible').filter({ hasText: 'The Vault' }).last();
        if (await vaultEntry.count()) {
          await vaultEntry.click();
        }
      }
    }

    await expect(page.getByRole('heading', { name: /The Vault|الخزنة/i })).toBeVisible({ timeout: 15000 });

    const toolsHubBtn = page.locator('button:visible').filter({ hasText: /الأدوات|Tools/i }).first();
    if (await toolsHubBtn.isVisible().catch(() => false)) {
      await toolsHubBtn.click();
      await page.waitForTimeout(400);
    }
  } else {
    const accountTrigger = page.getByTestId('account-menu-trigger');
    if (await accountTrigger.isVisible({ timeout: 10000 }).catch(() => false)) {
      await accountTrigger.click();
      await page.waitForTimeout(400);
      const vaultEntry = page.locator('button:visible').filter({ hasText: 'The Vault' }).last();
      if (await vaultEntry.count()) {
        await vaultEntry.click();
      }
    }

    await expect(page.getByRole('heading', { name: /The Vault|الخزنة/i })).toBeVisible({ timeout: 15000 });

    const cloudExportNav = page.locator('button:visible').filter({ hasText: /التصدير & إدارة السحابة|Cloud|Export/i }).first();
    if (await cloudExportNav.count()) {
      await cloudExportNav.click();
      await page.waitForTimeout(400);
    }
  }

  const visualOutputsTab = page.locator('button[role="tab"]:visible').filter({ hasText: /المخرجات البصرية|Visual Outputs/i }).first();
  await expect(visualOutputsTab).toBeVisible({ timeout: 15000 });
  const studio = page.getByTestId('visual-publishing-studio');
  await expect(async () => {
    if (!(await studio.isVisible().catch(() => false))) {
      await visualOutputsTab.click();
    }
    await expect(visualOutputsTab).toHaveAttribute('aria-selected', 'true');
    await expect(studio).toBeVisible();
    await page.waitForTimeout(150);
    await expect(studio).toBeVisible();
  }).toPass({ timeout: 15000, intervals: [100, 250, 500] });
}

test.describe('Visual Publishing Studio Responsive QA Evidence Pass', () => {
  test.beforeEach(async () => {
    test.setTimeout(90000);
  });

  test.beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    await writeFile(
      path.join(OUTPUT_DIR, 'measurements.json'),
      JSON.stringify(MEASUREMENTS, null, 2),
      'utf-8'
    );
  });

  VIEWPORTS.forEach(({ width, height, name }) => {
    test(`responsive layout & DOM bounding boxes at viewport ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.addInitScript(() => {
        localStorage.setItem('language', 'ar');
      });

      await seedSanitizedScenario(page, 'مخطوط شجرة عائلة الجذور التراثية الشاملة الكاملة', 'father');
      await openVaultAndNavigateToStudio(page, width);

      const studio = page.getByTestId('visual-publishing-studio');
      await expect(studio).toBeVisible();

      const actionBar = page.getByTestId('visual-studio-action-bar');
      const configPanel = page.getByTestId('visual-studio-config-panel');
      const previewPane = page.getByTestId('visual-studio-preview-pane');

      await expect(actionBar).toBeVisible({ timeout: 15000 });
      await expect(configPanel).toBeVisible({ timeout: 15000 });
      await expect(previewPane).toBeVisible({ timeout: 15000 });

      // Programmatic DOM Measurements
      const studioDims = await studio.evaluate((el) => ({
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }));

      const actionBarDims = await actionBar.evaluate((el) => ({
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }));

      const configPanelDims = await configPanel.evaluate((el) => ({
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }));

      const studioHostWidth = await page.evaluate(() => {
        const hostNode = document.querySelector('[data-testid="visual-publishing-studio"]')?.parentElement
          ?? document.querySelector('[role="heading"][aria-level="2"]')?.closest('.flex.flex-col, .h-full, .max-w-6xl');
        return hostNode ? hostNode.clientWidth : document.documentElement.clientWidth;
      });

      MEASUREMENTS.push({
        name,
        viewportWidth: width,
        viewportHeight: height,
        studioHostWidth,
        studioClientWidth: studioDims.clientWidth,
        studioScrollWidth: studioDims.scrollWidth,
        actionBarClientWidth: actionBarDims.clientWidth,
        actionBarScrollWidth: actionBarDims.scrollWidth,
        configPanelClientWidth: configPanelDims.clientWidth,
        configPanelScrollWidth: configPanelDims.scrollWidth,
      });

      // Screenshots
      await page.screenshot({ path: path.join(OUTPUT_DIR, `vault-full-${name}.png`), fullPage: false });
      await studio.screenshot({ path: path.join(OUTPUT_DIR, `studio-${name}.png`) });

      // 1. Assert Studio container overflow (scrollWidth <= clientWidth)
      expect(studioDims.scrollWidth, `Studio scrollWidth (${studioDims.scrollWidth}) > clientWidth (${studioDims.clientWidth}) at ${name}`).toBeLessThanOrEqual(studioDims.clientWidth);

      // 2. Assert Document body overflow (scrollWidth <= clientWidth + 1)
      const docDims = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(docDims.scrollWidth, `Document scrollWidth (${docDims.scrollWidth}) > clientWidth (${docDims.clientWidth}) at ${name}`).toBeLessThanOrEqual(docDims.clientWidth + 1);

      // 3. Per-Element Arabic Text Clipping Assertions (Display elements)
      const formatGuidance = page.getByTestId('poster-format-guidance');
      await expect(formatGuidance).toBeVisible({ timeout: 10000 });
      const guidanceClip = await formatGuidance.evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
      expect(guidanceClip, `Format guidance text clipped at ${name}`).toBe(true);

      const qualityNotice = page.getByTestId('poster-print-quality-notice');
      if (await qualityNotice.isVisible().catch(() => false)) {
        const noticeClip = await qualityNotice.evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
        expect(noticeClip, `Print quality notice text clipped at ${name}`).toBe(true);
      }

      const titleInput = configPanel.locator('input[type="text"]').first();
      if (await titleInput.isVisible().catch(() => false)) {
        const inputWidths = await titleInput.evaluate((el) => ({
          clientWidth: el.clientWidth,
          parentWidth: el.parentElement?.clientWidth ?? el.clientWidth,
        }));
        expect(inputWidths.clientWidth, `Title input width exceeds container at ${name}`).toBeLessThanOrEqual(inputWidths.parentWidth + 2);
      }

      // 4. Strict Action Bar Button Bounding Box & Overlap Check
      const barBox = await actionBar.boundingBox();
      expect(barBox).not.toBeNull();

      const buttons = await actionBar.getByRole('button').all();
      const visibleButtonsInfo: Array<{ name: string; box: { x: number; y: number; width: number; height: number } }> = [];

      for (const button of buttons) {
        if (await button.isVisible()) {
          const btnBox = await button.boundingBox();
          const btnText = (await button.textContent())?.trim() ?? '';
          if (btnBox && barBox) {
            expect(btnBox.x, `Button "${btnText}" left (${btnBox.x}) < actionBar.left (${barBox.x}) at ${name}`).toBeGreaterThanOrEqual(barBox.x - 2);
            expect(btnBox.x + btnBox.width, `Button "${btnText}" right (${btnBox.x + btnBox.width}) > actionBar.right (${barBox.x + barBox.width}) at ${name}`).toBeLessThanOrEqual(barBox.x + barBox.width + 3);
            expect(btnBox.y, `Button "${btnText}" top (${btnBox.y}) < actionBar.top (${barBox.y}) at ${name}`).toBeGreaterThanOrEqual(barBox.y - 2);
            expect(btnBox.y + btnBox.height, `Button "${btnText}" bottom (${btnBox.y + btnBox.height}) > actionBar.bottom (${barBox.y + barBox.height}) at ${name}`).toBeLessThanOrEqual(barBox.y + barBox.height + 3);

            const btnTextOverflow = await button.evaluate((el) => ({
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
            }));
            expect(btnTextOverflow.scrollWidth, `Button text "${btnText}" scrollWidth (${btnTextOverflow.scrollWidth}) > clientWidth (${btnTextOverflow.clientWidth}) at ${name}`).toBeLessThanOrEqual(btnTextOverflow.clientWidth + 2);

            visibleButtonsInfo.push({ name: btnText, box: btnBox });
          }
        }
      }

      for (let i = 0; i < visibleButtonsInfo.length; i += 1) {
        for (let j = i + 1; j < visibleButtonsInfo.length; j += 1) {
          const b1 = visibleButtonsInfo[i].box;
          const b2 = visibleButtonsInfo[j].box;
          const overlapX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
          const overlapY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
          expect(overlapX * overlapY, `Button "${visibleButtonsInfo[i].name}" overlaps with "${visibleButtonsInfo[j].name}" at ${name}`).toBe(0);
        }
      }

      // 5. Config Panel Reachability & Operability Verification
      await configPanel.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(OUTPUT_DIR, `config-panel-${name}.png`) });

      const formControls = await configPanel.locator('select, input').all();
      expect(formControls.length).toBeGreaterThan(0);

      const firstControl = formControls[0];
      const lastControl = formControls[formControls.length - 1];

      await firstControl.scrollIntoViewIfNeeded();
      await expect(firstControl).toBeVisible();

      await lastControl.scrollIntoViewIfNeeded();
      await expect(lastControl).toBeVisible();
      await lastControl.focus();
      await expect(lastControl).toBeFocused();

      // 6. Preview SVG Bounds & ViewBox Aspect Ratio Verification
      const previewSvg = page.locator('[data-testid="studio-poster-renderer-preview"] svg').first();
      await expect(previewSvg, `Preview SVG not visible at ${name}`).toBeVisible({ timeout: 15000 });

      const viewBoxAttr = await previewSvg.getAttribute('viewBox');
      expect(viewBoxAttr, `Missing viewBox attribute on SVG at ${name}`).toBeTruthy();

      const viewBoxParts = viewBoxAttr!.trim().split(/[\s,]+/).map(Number);
      expect(viewBoxParts.length, `Invalid viewBox attribute "${viewBoxAttr}" at ${name}`).toBe(4);
      expect(viewBoxParts[2], `Invalid viewBox width at ${name}`).toBeGreaterThan(0);
      expect(viewBoxParts[3], `Invalid viewBox height at ${name}`).toBeGreaterThan(0);

      const svgBox = await previewSvg.boundingBox();
      const paneBox = await previewPane.boundingBox();
      expect(svgBox, `SVG bounding box missing at ${name}`).not.toBeNull();
      expect(paneBox, `Preview pane bounding box missing at ${name}`).not.toBeNull();

      if (svgBox && paneBox) {
        expect(svgBox.x, `SVG x (${svgBox.x}) < pane x (${paneBox.x}) at ${name}`).toBeGreaterThanOrEqual(paneBox.x - 2);
        expect(svgBox.x + svgBox.width, `SVG right (${svgBox.x + svgBox.width}) > pane right (${paneBox.x + paneBox.width}) at ${name}`).toBeLessThanOrEqual(paneBox.x + paneBox.width + 2);
        expect(svgBox.y, `SVG y (${svgBox.y}) < pane y (${paneBox.y}) at ${name}`).toBeGreaterThanOrEqual(paneBox.y - 2);
        expect(svgBox.y + svgBox.height, `SVG bottom (${svgBox.y + svgBox.height}) > pane bottom (${paneBox.y + paneBox.height}) at ${name}`).toBeLessThanOrEqual(paneBox.y + paneBox.height + 2);
        expect(svgBox.width).toBeGreaterThan(50);
        expect(svgBox.height).toBeGreaterThan(50);

        const viewBoxAspect = viewBoxParts[2] / viewBoxParts[3];
        const svgAspect = svgBox.width / svgBox.height;
        const aspectDiff = Math.abs(svgAspect - viewBoxAspect);
        expect(aspectDiff, `SVG aspect ratio (${svgAspect.toFixed(3)}) differs from viewBox aspect ratio (${viewBoxAspect.toFixed(3)}) at ${name}`).toBeLessThan(0.05);
      }
    });
  });

  test('isolated desktop 768px vs mobile 767px Vault navigation mode transition', async ({ page }) => {
    // 768px Desktop check (fresh page)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.addInitScript(() => {
      localStorage.setItem('language', 'ar');
    });

    await seedSanitizedScenario(page, 'مخطوط شجرة عائلة الجذور التراثية الشاملة الكاملة', 'father');
    const accountTrigger = page.getByTestId('account-menu-trigger');
    if (await accountTrigger.isVisible().catch(() => false)) {
      await accountTrigger.click();
      await page.waitForTimeout(400);
      const vaultEntry = page.locator('button:visible').filter({ hasText: 'The Vault' }).last();
      if (await vaultEntry.count()) {
        await vaultEntry.click();
      }
    }
    await expect(page.getByRole('heading', { name: /The Vault|الخزنة/i })).toBeVisible();

    const desktopNav = page.locator('nav').filter({ has: page.getByRole('button', { name: /التصدير|إدارة السحابة|Cloud|Export/i }) });
    await expect(desktopNav).toBeVisible();

    // 767px Mobile check (fresh reload)
    await page.setViewportSize({ width: 767, height: 1024 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await seedSanitizedScenario(page, 'مخطوط شجرة عائلة الجذور التراثية الشاملة الكاملة', 'father');

    const mobileActionsNav = page.getByRole('navigation', { name: /Mobile actions|إجراءات الجوال/i });
    const vaultMobileBtn = mobileActionsNav.getByRole('button', { name: /The Vault|الخزنة/i });
    if (await vaultMobileBtn.isVisible().catch(() => false)) {
      await vaultMobileBtn.click();
    } else {
      const accTrigger = page.getByTestId('account-menu-trigger');
      if (await accTrigger.isVisible().catch(() => false)) {
        await accTrigger.click();
        await page.waitForTimeout(400);
        const vaultEntry = page.locator('button:visible').filter({ hasText: 'The Vault' }).last();
        if (await vaultEntry.count()) {
          await vaultEntry.click();
        }
      }
    }
    await expect(page.getByRole('heading', { name: /The Vault|الخزنة/i })).toBeVisible();

    const mobileHubNav = page.locator('nav').filter({ has: page.getByRole('button', { name: /الأدوات|Tools|الإدارة|Management/i }) });
    await expect(mobileHubNav).toBeVisible();
  });

  test('large-tree full scope actions, branch collection, tiled wall, and quality guidance at 768px and 390px', async ({ page }) => {
    for (const targetWidth of [768, 390]) {
      await page.setViewportSize({ width: targetWidth, height: targetWidth === 768 ? 1024 : 844 });
      await page.addInitScript(() => {
        localStorage.setItem('language', 'ar');
      });

      await seedSanitizedScenario(page, 'مخطوط شجرة عائلة الجذور التراثية الشاملة الكاملة', 'father');
      await openVaultAndNavigateToStudio(page, targetWidth);

      const studio = page.getByTestId('visual-publishing-studio');
      await expect(studio).toBeVisible();

      // Select full-tree scope button inside poster-scope-control
      const fullTreeScopeBtn = page.getByTestId('poster-scope-control').getByRole('button', { name: /الشجرة الكاملة|Full tree/i });
      await expect(fullTreeScopeBtn).toBeVisible();
      await fullTreeScopeBtn.click();
      await page.waitForTimeout(600);

      const actionBar = page.getByTestId('visual-studio-action-bar');
      await expect(actionBar).toBeVisible();
      await actionBar.scrollIntoViewIfNeeded();

      await page.screenshot({ path: path.join(OUTPUT_DIR, `studio-large-tree-${targetWidth}.png`) });

      // STRICT 5-Button Action Check: SVG, PNG, PDF, Branch Collection, Tiled Wall
      const branchCollectionBtn = actionBar.getByRole('button', { name: /تنزيل مجموعة الفروع|Branch collection/i }).first();
      const tiledWallBtn = actionBar.getByRole('button', { name: /تنزيل لوحة مقسمة|Tiled wall/i }).first();
      const svgBtn = actionBar.getByRole('button', { name: /تنزيل SVG|SVG/i }).first();
      const pngBtn = actionBar.getByRole('button', { name: /تنزيل PNG|PNG/i }).first();
      const pdfBtn = actionBar.getByRole('button', { name: /تنزيل PDF|PDF/i }).first();

      const downloadButtons = [
        branchCollectionBtn,
        tiledWallBtn,
        svgBtn,
        pngBtn,
        pdfBtn,
      ];

      for (const btn of downloadButtons) {
        await expect(btn, `Download action button missing at ${targetWidth}px`).toBeVisible({ timeout: 10000 });
      }

      // Check guidance notice & per-element clipping
      const guidance = page.getByTestId('poster-format-guidance');
      await expect(guidance).toBeVisible();
      const guidanceClip = await guidance.evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
      expect(guidanceClip, `Guidance text clipped at ${targetWidth}px`).toBe(true);

      // Measure action bar overflow
      const barDims = await actionBar.evaluate((el) => ({
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }));
      expect(barDims.scrollWidth, `Action bar scrollWidth (${barDims.scrollWidth}) > clientWidth (${barDims.clientWidth}) at ${targetWidth}px`).toBeLessThanOrEqual(barDims.clientWidth);

      // Button non-overlapping check inside action bar for download buttons
      const barBox = await actionBar.boundingBox();
      expect(barBox).not.toBeNull();

      const visibleButtons: Array<{ name: string; box: { x: number; y: number; width: number; height: number } }> = [];

      for (const btn of downloadButtons) {
        if (await btn.isVisible()) {
          const btnBox = await btn.boundingBox();
          const btnText = (await btn.textContent())?.trim() ?? '';
          if (btnBox && barBox) {
            expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(barBox.x + barBox.width + 4);
            expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(barBox.y + barBox.height + 4);
            visibleButtons.push({ name: btnText, box: btnBox });
          }
        }
      }

      for (let i = 0; i < visibleButtons.length; i += 1) {
        for (let j = i + 1; j < visibleButtons.length; j += 1) {
          const b1 = visibleButtons[i].box;
          const b2 = visibleButtons[j].box;
          const overlapX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
          const overlapY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
          expect(overlapX * overlapY, `Buttons "${visibleButtons[i].name}" and "${visibleButtons[j].name}" overlap at ${targetWidth}px`).toBe(0);
        }
      }
    }
  });
});
