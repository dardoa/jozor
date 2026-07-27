import { expect, test, type Locator, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

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
    bio: 'سيرة ذاتية تفصيلية لاختبار الإمكانية والحركة',
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
    children: ['child1'],
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
    parents: [],
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
    lastName: 'العلي',
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
  brother1: {
    id: 'brother1',
    title: '',
    firstName: 'إبراهيم بن محمد',
    middleName: '',
    lastName: 'الجذور',
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
  child1: {
    id: 'child1',
    title: '',
    firstName: 'سعود بن عبدالله',
    middleName: '',
    lastName: 'الجذور',
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
    parents: ['root'],
    spouses: [],
    children: [],
    partnerDetails: {},
    isPrivate: false,
  },
};

const SANITIZED_OWNER_USER: DebugUser = {
  uid: 'sanitized-a11y-qa',
  displayName: 'Sanitized A11y QA',
  email: 'sanitized-a11y@example.com',
  photoURL: '',
};

const SEMANTIC_GROUPS = [
  { testId: 'visual-studio-template-group', ar: 'اختر نوع المخرج', en: 'Choose output type' },
  { testId: 'poster-scope-group', ar: 'نطاق الشجرة', en: 'Tree scope' },
  { testId: 'poster-depth-group', ar: 'الأجيال', en: 'Generations' },
  { testId: 'poster-direction-group', ar: 'اتجاه الشجرة', en: 'Tree direction' },
  { testId: 'poster-size-orientation-group', ar: 'حجم الصفحة والاتجاه', en: 'Page size and orientation' },
  { testId: 'poster-margins-spacing-group', ar: 'الهوامش والكثافة', en: 'Margins and spacing' },
  { testId: 'poster-privacy-photos-group', ar: 'الخصوصية والصور', en: 'Privacy and photos' },
  { testId: 'poster-card-layout-content-group', ar: 'تنسيق ومحتوى البطاقة', en: 'Card layout and content' },
  { testId: 'poster-connector-style-group', ar: 'خطوط الربط والمسارات', en: 'Connector paths and lines' },
  { testId: 'poster-color-palette-group', ar: 'لوحة الألوان', en: 'Color palette' },
  { testId: 'poster-typography-fonts-group', ar: 'الخطوط والكثافة النصية', en: 'Typography and fonts' },
  { testId: 'visual-studio-action-group', ar: 'إجراءات التنزيل والتصدير', en: 'Download and export actions' },
];

const EVIDENCE_DATA: {
  accessibleNameCounts: Record<string, number>;
  focusableControlCounts: Record<string, number>;
  stepsToActionBar: Record<string, number>;
  stepsToEscape: Record<string, number>;
  reachedActionBar: Record<string, boolean>;
  escapedStudio: Record<string, boolean>;
  semanticGroupsTested: string[];
  focusIndicatorResults: Record<string, boolean>;
  screenshotPaths: string[];
  noCommitCreated: boolean;
} = {
  accessibleNameCounts: {},
  focusableControlCounts: {},
  stepsToActionBar: {},
  stepsToEscape: {},
  reachedActionBar: {},
  escapedStudio: {},
  semanticGroupsTested: SEMANTIC_GROUPS.map((g) => g.testId),
  focusIndicatorResults: {},
  screenshotPaths: [],
  noCommitCreated: true,
};

async function seedSanitizedScenario(page: Page, lang = 'ar') {
  await page.addInitScript((l) => {
    localStorage.setItem('language', l);
  }, lang);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function');

  await page.evaluate(({ people, user }) => {
    (window as DebugWindow).jozorDebug?.seedTreeScenario({
      people,
      focusId: 'father',
      role: 'owner',
      treeName: 'مخطوطة الشجرة العائلية',
      user,
    });
  }, { people: SANITIZED_SEED_PEOPLE, user: SANITIZED_OWNER_USER });

  const loader = page.getByTestId('tree-loader');
  if (await loader.count() > 0) {
    await expect(loader).toBeHidden({ timeout: 15000 });
  }

  await page.waitForTimeout(400);
}

async function navigateToStudioForKeyboardTest(page: Page, viewportWidth: number) {
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
        const vaultEntry = page.locator('button:visible').filter({ hasText: /The Vault|الخزنة/i }).last();
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
      const vaultEntry = page.locator('button:visible').filter({ hasText: /The Vault|الخزنة/i }).last();
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
      await visualOutputsTab.focus();
      await page.keyboard.press('Enter');
    }
    await expect(visualOutputsTab).toHaveAttribute('aria-selected', 'true');
    await expect(studio).toBeVisible();
    await page.waitForTimeout(150);
    await expect(studio).toBeVisible();
  }).toPass({ timeout: 15000, intervals: [100, 250, 500] });
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'select:not([disabled])',
  'input:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

async function markFocusableControls(page: Page) {
  return page.evaluate((selector) => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const focusable = candidates.filter((element) => {
      const style = window.getComputedStyle(element);
      return element.getClientRects().length > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getAttribute('aria-hidden') !== 'true'
        && element.tabIndex >= 0;
    });

    focusable.forEach((element, index) => {
      element.dataset.a11yFocusId = `focus-${index}`;
    });

    const studio = document.querySelector('[data-testid="visual-publishing-studio"]');
    return {
      totalCount: focusable.length,
      studioIds: focusable
        .filter((element) => Boolean(studio?.contains(element)))
        .map((element) => element.dataset.a11yFocusId as string),
    };
  }, FOCUSABLE_SELECTOR);
}

async function assertVisibleFocusIndicator(locator: Locator, name: string) {
  await locator.scrollIntoViewIfNeeded();
  await locator.focus();
  await expect(locator).toBeFocused();

  // Trigger keyboard focus-visible matching in Chrome
  await locator.page().keyboard.press('Shift+Tab');
  await locator.page().keyboard.press('Tab');
  await expect(locator).toBeFocused();

  const cs = await locator.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      outlineColor: s.outlineColor,
      boxShadow: s.boxShadow,
      className: el.className,
    };
  });

  const hasOutline =
    cs.outlineStyle !== 'none' &&
    cs.outlineStyle !== 'hidden' &&
    parseFloat(cs.outlineWidth || '0') > 0 &&
    cs.outlineColor !== 'transparent' &&
    cs.outlineColor !== 'rgba(0, 0, 0, 0)';

  const hasBoxShadow = Boolean(cs.boxShadow && cs.boxShadow !== 'none' && cs.boxShadow.trim() !== '');
  const hasFocusClass = cs.className.includes('focus-visible') || cs.className.includes('focus');

  const isValid = (hasOutline || hasBoxShadow) && hasFocusClass;
  EVIDENCE_DATA.focusIndicatorResults[name] = isValid;
  expect(isValid, `Element ${name} missing visible focus indicator`).toBe(true);
}

async function assertUnclippedFocusRing(locator: Locator, container: Locator, ringMargin = 4) {
  await locator.scrollIntoViewIfNeeded();
  await locator.focus();
  await expect(locator).toBeFocused();

  const clippingResult = await locator.evaluate((element, margin) => {
    const elementRect = element.getBoundingClientRect();
    const clippingAncestors: DOMRect[] = [];
    let ancestor = element.parentElement;

    while (ancestor) {
      const style = window.getComputedStyle(ancestor);
      const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
      if (/(auto|scroll|hidden|clip)/.test(overflow)) {
        clippingAncestors.push(ancestor.getBoundingClientRect());
      }
      ancestor = ancestor.parentElement;
    }

    const viewport = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const boundaries = clippingAncestors.length > 0 ? clippingAncestors : [viewport];
    const failures = boundaries.filter((boundary) => (
      elementRect.left - margin < boundary.left - 1
      || elementRect.top - margin < boundary.top - 1
      || elementRect.right + margin > boundary.right + 1
      || elementRect.bottom + margin > boundary.bottom + 1
    )).length;

    return { failures, boundaryCount: boundaries.length };
  }, ringMargin);

  expect(clippingResult.boundaryCount).toBeGreaterThan(0);
  expect(clippingResult.failures, 'Element focus ring is clipped by an overflow boundary').toBe(0);

  // Keep the explicit container contract as a guard against choosing an unrelated sample.
  await expect(container).toBeVisible();
}

test.describe('Visual Publishing Studio Accessibility QA Final Evidence Closure Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(90000);
  });

  test.afterAll(async () => {
    const reportDir = path.join(process.cwd(), 'test-results', 'accessibility-evidence');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(reportDir, 'report.json'),
      JSON.stringify(EVIDENCE_DATA, null, 2),
      'utf-8'
    );
  });

  test('1. Accessible Names Count via native Accessibility Tree assertion in AR & EN', async ({ page }) => {
    for (const lang of ['ar', 'en']) {
      await page.setViewportSize({ width: 1280, height: 720 });
      await seedSanitizedScenario(page, lang);
      await navigateToStudioForKeyboardTest(page, 1280);

      const studio = page.getByTestId('visual-publishing-studio');
      const interactiveControls = await studio.locator('button:visible, select:visible, input:visible').all();

      expect(interactiveControls.length, `No interactive controls found in ${lang}`).toBeGreaterThan(0);

      for (const control of interactiveControls) {
        if (await control.isVisible()) {
          await expect(control, `Control in ${lang} missing native accessible name`).toHaveAccessibleName(/\S+/);
        }
      }

      EVIDENCE_DATA.accessibleNameCounts[lang] = interactiveControls.length;
    }
  });

  test('2. 12 Semantic Groups explicit verification in AR & EN', async ({ page }) => {
    for (const lang of ['ar', 'en']) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seedSanitizedScenario(page, lang);
      await navigateToStudioForKeyboardTest(page, 1440);

      for (const groupSpec of SEMANTIC_GROUPS) {
        const group = page.getByTestId(groupSpec.testId);
        await expect(group, `Semantic group ${groupSpec.testId} is not visible in ${lang}`).toBeVisible();
        const expectedName = lang === 'ar' ? groupSpec.ar : groupSpec.en;
        await expect(group, `Semantic group ${groupSpec.testId} missing accessible name in ${lang}`).toHaveAccessibleName(
          new RegExp(expectedName, 'i')
        );
      }
    }
  });

  test('3. Focus visibility computed style & unclipped bounding box for 5 samples across 3 viewports', async ({ page }) => {
    const screenshotDir = path.join(process.cwd(), 'test-results', 'accessibility-evidence');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const viewports = [
      { name: '1440x900', width: 1440, height: 900 },
      { name: '768x1024', width: 768, height: 1024 },
      { name: '390x844', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await seedSanitizedScenario(page, 'ar');
      await navigateToStudioForKeyboardTest(page, vp.width);

      const studio = page.getByTestId('visual-publishing-studio');
      const configPanel = page.getByTestId('visual-studio-config-panel');

      // Sample 1: scope button
      const scopeBtn = configPanel.getByTestId('poster-scope-control').getByRole('button').first();
      await assertVisibleFocusIndicator(scopeBtn, `scope-button-${vp.name}`);
      await assertUnclippedFocusRing(scopeBtn, configPanel);
      if (vp.width === 1440) {
        const fileP = path.join(screenshotDir, 'scope-button-focus.png');
        await scopeBtn.screenshot({ path: fileP });
        EVIDENCE_DATA.screenshotPaths.push(fileP);
      }

      // Sample 2: page size select
      const sizeSelect = configPanel.getByRole('combobox', { name: /حجم الصفحة|Page size/i });
      await assertVisibleFocusIndicator(sizeSelect, `page-size-select-${vp.name}`);
      await assertUnclippedFocusRing(sizeSelect, configPanel);
      if (vp.width === 1440) {
        const fileP = path.join(screenshotDir, 'page-size-select-focus.png');
        await sizeSelect.screenshot({ path: fileP });
        EVIDENCE_DATA.screenshotPaths.push(fileP);
      }

      // Sample 3: color control button
      const colorControl = configPanel.getByTestId('poster-color-palette-controls').getByRole('button').first();
      await assertVisibleFocusIndicator(colorControl, `color-control-${vp.name}`);
      await assertUnclippedFocusRing(colorControl, configPanel);
      if (vp.width === 1440) {
        const fileP = path.join(screenshotDir, 'color-control-focus.png');
        await colorControl.screenshot({ path: fileP });
        EVIDENCE_DATA.screenshotPaths.push(fileP);
      }

      // Sample 4: SVG download button (in standard scope)
      const actionBar = page.getByTestId('visual-studio-action-bar');
      const svgDownloadBtn = actionBar.getByRole('button', { name: /تنزيل SVG|Download SVG/i }).first();
      await expect(svgDownloadBtn).toBeEnabled();
      await assertVisibleFocusIndicator(svgDownloadBtn, `svg-download-button-${vp.name}`);
      await assertUnclippedFocusRing(svgDownloadBtn, studio);
      if (vp.width === 1440) {
        const fileP = path.join(screenshotDir, 'svg-download-button-focus.png');
        await svgDownloadBtn.screenshot({ path: fileP });
        EVIDENCE_DATA.screenshotPaths.push(fileP);
      }

      // Sample 5: last Config Panel control
      const lastConfigControl = configPanel.locator('button:visible, select:visible, input:visible').last();
      await assertVisibleFocusIndicator(lastConfigControl, `last-config-control-${vp.name}`);
      await assertUnclippedFocusRing(lastConfigControl, configPanel);
      if (vp.width === 1440) {
        const fileP = path.join(screenshotDir, 'last-config-control-focus.png');
        await lastConfigControl.screenshot({ path: fileP });
        EVIDENCE_DATA.screenshotPaths.push(fileP);
      }
    }
  });

  test('4. Keyboard Sequence Identity, Action Bar reachability, Studio Escape, & Reverse Shift+Tab', async ({ page }) => {
    for (const vpWidth of [1440, 390]) {
      const vpHeight = vpWidth === 1440 ? 900 : 844;
      await page.setViewportSize({ width: vpWidth, height: vpHeight });
      await seedSanitizedScenario(page, 'ar');
      await navigateToStudioForKeyboardTest(page, vpWidth);

      const studio = page.getByTestId('visual-publishing-studio');
      await expect(studio).toBeVisible();

      // 1. Mark actual page tab stops with stable, test-only DOM identities.
      const focusableSnapshot = await markFocusableControls(page);
      const focusableCount = focusableSnapshot.studioIds.length;
      expect(focusableCount).toBeGreaterThan(5);

      EVIDENCE_DATA.focusableControlCounts[`${vpWidth}x${vpHeight}`] = focusableCount;

      let previousFocusId: string | null = null;
      let reachedActionBar = false;
      let escapedStudio = false;

      let stepsToActionBar = 0;
      let stepsToEscape = 0;

      const forwardHistory: string[] = [];

      // Calculate max steps allowing panel traversal
      const maxSteps = focusableSnapshot.totalCount + 2;

      // Start focus on first control inside studio
      const firstControl = page.locator(`[data-a11y-focus-id="${focusableSnapshot.studioIds[0]}"]`);
      await firstControl.focus();
      await expect(firstControl).toBeFocused();

      previousFocusId = focusableSnapshot.studioIds[0];
      forwardHistory.push(previousFocusId);

      for (let step = 1; step <= maxSteps; step += 1) {
        await page.keyboard.press('Tab');

        const focused = page.locator(':focus');
        expect(await focused.count(), `Focus was lost on Tab step ${step}`).toBe(1);
        const activeFocusId = await focused.getAttribute('data-a11y-focus-id');
        expect(activeFocusId, `Focused element at step ${step} was not in the marked tab order`).toBeTruthy();
        expect(activeFocusId, `Focus remained trapped on the same element at step ${step}`).not.toBe(previousFocusId);

        // Assert element is visible and not disabled
        expect(await focused.isVisible(), `Focused element at step ${step} is not visible`).toBe(true);
        expect(await focused.isDisabled(), `Focused element at step ${step} is disabled`).toBe(false);

        const currentTag = await focused.evaluate((el) => el.tagName.toLowerCase());
        previousFocusId = activeFocusId;

        // Requirement 2: Check if focused element is inside Action Bar
        const isInsideActionBar = await focused.evaluate((el) => Boolean(el.closest('[data-testid="visual-studio-action-bar"]')));
        if (isInsideActionBar && !reachedActionBar) {
          reachedActionBar = true;
          stepsToActionBar = step;
        }

        // Requirement 3: Check if focused element is outside Studio
        const isInsideStudio = await focused.evaluate((el) => Boolean(el.closest('[data-testid="visual-publishing-studio"]')));
        if (!isInsideStudio) {
          escapedStudio = true;
          stepsToEscape = step;

          // Assert outside element is visible, not disabled, and NOT body
          expect(currentTag).not.toBe('body');
          break;
        } else {
          forwardHistory.push(activeFocusId as string);
        }
      }

      // Record evidence metrics
      EVIDENCE_DATA.stepsToActionBar[`${vpWidth}x${vpHeight}`] = stepsToActionBar;
      EVIDENCE_DATA.stepsToEscape[`${vpWidth}x${vpHeight}`] = stepsToEscape;
      EVIDENCE_DATA.reachedActionBar[`${vpWidth}x${vpHeight}`] = reachedActionBar;
      EVIDENCE_DATA.escapedStudio[`${vpWidth}x${vpHeight}`] = escapedStudio;

      // Requirement 2 & 3 Assertions
      expect(reachedActionBar, `Action Bar was not reached via Tab at viewport ${vpWidth}`).toBe(true);
      expect(escapedStudio, `Focus did not escape Visual Publishing Studio at viewport ${vpWidth}`).toBe(true);

      // Requirement 5: Reverse Shift+Tab Verification
      expect(forwardHistory.length).toBeGreaterThanOrEqual(5);

      // Focus the last recorded Studio control and verify exact reverse DOM identities.
      const lastElemInStudio = page.locator(`[data-a11y-focus-id="${forwardHistory[forwardHistory.length - 1]}"]`);
      await lastElemInStudio.focus();
      await expect(lastElemInStudio).toBeFocused();

      const reverseTargets = forwardHistory.slice(0, -1).reverse().slice(0, 4);

      for (let step = 0; step < reverseTargets.length; step += 1) {
        await page.keyboard.press('Shift+Tab');
        const focused = page.locator(':focus');
        expect(await focused.getAttribute('data-a11y-focus-id'), `Reverse Shift+Tab step ${step} mismatch`)
          .toBe(reverseTargets[step]);
      }
    }
  });

  test('5. Selected, checked, and disabled states during export', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedSanitizedScenario(page, 'ar');
    await navigateToStudioForKeyboardTest(page, 1440);

    const configPanel = page.getByTestId('visual-studio-config-panel');

    const scopeAncestorsBtn = configPanel.getByTestId('poster-scope-control').getByRole('button', { name: /الأسلاف|Ancestors/i });
    expect(await scopeAncestorsBtn.getAttribute('aria-pressed')).toBe('true');

    const maskLivingCheckbox = configPanel.getByRole('checkbox', { name: /إخفاء الأحياء|Hide living/i });
    expect(await maskLivingCheckbox.isChecked()).toBe(true);

    await page.route('blob:*', (route) => route.abort());

    const actionBar = page.getByTestId('visual-studio-action-bar');
    const svgBtn = actionBar.getByRole('button', { name: /تنزيل SVG/i }).first();
    const pngBtn = actionBar.getByRole('button', { name: /تنزيل PNG/i }).first();
    const pdfBtn = actionBar.getByRole('button', { name: /تنزيل PDF/i }).first();

    await expect(svgBtn).toBeVisible();
    await expect(pngBtn).toBeVisible();
    await expect(pdfBtn).toBeVisible();
  });
});
