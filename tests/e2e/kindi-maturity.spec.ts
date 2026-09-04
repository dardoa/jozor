import { expect, test, type Page } from '@playwright/test';

type DebugRole = 'owner' | 'editor' | 'viewer';
type DebugUser = { uid: string; displayName: string; email: string; photoURL: string };
type DebugWindow = Window & {
  jozorDebug?: {
    clearPersistedScenario?: () => void;
    seedTreeScenario: (payload: {
      people: Record<string, unknown>;
      focusId: string;
      role: DebugRole;
      treeName: string;
      user: DebugUser;
      subscriptionTier?: 'free' | 'pro' | 'family';
      aiCloudQuotaRemaining?: number;
    }) => void;
    getStateSnapshot: () => { people?: Record<string, unknown> };
  };
};

const OWNER: DebugUser = {
  uid: 'kindi-e2e-owner',
  displayName: 'Kindi E2E Owner',
  email: 'kindi-owner@example.test',
  photoURL: '',
};

const person = (
  id: string,
  firstName: string,
  relationships: { parents?: string[]; spouses?: string[]; children?: string[] } = {}
) => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'الاختبار',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '1980',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
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
  photoUrl: undefined,
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
});

const CHILD_IDS = Array.from({ length: 8 }, (_, index) => `child-${index + 1}`);
const PEOPLE: Record<string, unknown> = {
  root: person('root', 'سامي', { children: CHILD_IDS }),
  ...Object.fromEntries(CHILD_IDS.map((id, index) => [
    id,
    person(id, `ابن ${index + 1}`, { parents: ['root'] }),
  ])),
};

const seedScenario = async (
  page: Page,
  language: 'ar' | 'en',
  options: {
    role?: DebugRole;
    subscriptionTier?: 'free' | 'pro' | 'family';
    aiCloudQuotaRemaining?: number;
    people?: Record<string, unknown>;
    focusId?: string;
    treeName?: string;
  } = {}
) => {
  const role = options.role ?? 'owner';
  const subscriptionTier = options.subscriptionTier ?? 'free';
  const aiCloudQuotaRemaining = options.aiCloudQuotaRemaining ?? 0;
  const scenarioPeople = options.people ?? PEOPLE;
  const focusId = options.focusId ?? 'root';
  const treeName = options.treeName ?? 'Kindi Maturity Tree';

  await page.addInitScript(({ selectedLanguage, hasCloudAccess }) => {
    localStorage.setItem('language', selectedLanguage);
    if (hasCloudAccess) {
      localStorage.setItem('jozor_supabase_token', 'kindi-e2e-session-token');
    } else {
      localStorage.removeItem('jozor_supabase_token');
    }
  }, { selectedLanguage: language, hasCloudAccess: subscriptionTier !== 'free' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    typeof (window as DebugWindow).jozorDebug?.seedTreeScenario === 'function'
  );
  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.clearPersistedScenario?.();
  });
  await page.evaluate(({ people, owner, scenarioRole, tier, quota, scenarioFocusId, scenarioTreeName }) => {
    const debug = (window as DebugWindow).jozorDebug;
    if (!debug) throw new Error('jozorDebug seed API is unavailable');
    debug.seedTreeScenario({
      people,
      focusId: scenarioFocusId,
      role: scenarioRole,
      treeName: scenarioTreeName,
      user: owner,
      subscriptionTier: tier,
      aiCloudQuotaRemaining: quota,
    });
  }, {
    people: scenarioPeople,
    owner: OWNER,
    scenarioRole: role,
    tier: subscriptionTier,
    quota: aiCloudQuotaRemaining,
    scenarioFocusId: focusId,
    scenarioTreeName: treeName,
  });
  if (subscriptionTier !== 'free') {
    await page.evaluate(() => {
      localStorage.setItem('jozor_supabase_token', 'kindi-e2e-session-token');
    });
  }

  await expect(page.getByTestId('tree-node').first()).toBeVisible({ timeout: 15_000 });
};

const openKindi = async (page: Page, language: 'ar' | 'en') => {
  const trigger = page.getByRole('button', {
    name: language === 'ar' ? 'فتح مساعد كِندي الذكي' : 'Open Kindi intelligent assistant',
  });
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();

  const dialog = page.getByRole('dialog', {
    name: language === 'ar' ? 'مساعد كِندي الذكي' : 'Kindi intelligent assistant',
  });
  await expect(dialog).toBeVisible();
  return { dialog, trigger };
};

const getPeopleCount = (page: Page) => page.evaluate(() => {
  const people = (window as DebugWindow).jozorDebug?.getStateSnapshot().people ?? {};
  return Object.keys(people).length;
});

const getPersonField = (page: Page, personId: string, field: string) => page.evaluate(
  ({ id, fieldName }) => {
    const personRecord = (window as DebugWindow).jozorDebug?.getStateSnapshot().people?.[id];
    if (!personRecord || typeof personRecord !== 'object') return undefined;
    return (personRecord as Record<string, unknown>)[fieldName];
  },
  { id: personId, fieldName: field }
);

const getKindiStorageSnapshot = (page: Page) => page.evaluate(() => {
  const collect = (storage: Storage) => Array.from({ length: storage.length }, (_, index) => {
    const key = storage.key(index) ?? '';
    return [key, storage.getItem(key) ?? ''] as const;
  }).filter(([key]) => key.toLowerCase().includes('kindi'));

  return {
    local: collect(localStorage),
    session: collect(sessionStorage),
  };
});

test.describe('Kindi product maturity journeys', () => {
  test.setTimeout(90_000);

  test('uses current context, limits long relationship results, and resets the conversation', async ({ page }) => {
    await seedScenario(page, 'ar');
    const { dialog } = await openKindi(page, 'ar');

    await expect(dialog.getByText('السياق الحالي')).toBeVisible();
    await expect(dialog.getByText('سامي الاختبار', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'اسأل عن العائلة' }).click();

    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });
    await expect(input).toHaveValue('من هم أبناؤه؟');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();

    await expect(dialog.getByText(/وجدت 8 من الأبناء/)).toBeVisible();
    await expect(dialog.getByText('إجابة عائلية', { exact: true })).toBeVisible();
    await expect(dialog.getByText('من شجرتك', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /عرض المزيد/ })).toBeVisible();
    await expect(dialog.getByText('ابن 7 الاختبار', { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: /عرض المزيد/ }).click();
    await expect(dialog.getByText('ابن 8 الاختبار', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'مفيدة', exact: true }).click();
    await expect(dialog.getByText('شكرًا لملاحظتك')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'غير مفيدة' })).toHaveCount(0);

    await dialog.getByRole('button', { name: 'بدء محادثة جديدة' }).click();
    await expect(dialog.getByRole('button', { name: 'اسأل عن العائلة' })).toBeVisible();
    await expect(dialog.getByText('من هم أبناؤه؟', { exact: true })).toHaveCount(0);
  });

  test('explains the recorded relationship path between two named people locally', async ({ page }) => {
    await seedScenario(page, 'ar');
    const initialPeopleCount = await getPeopleCount(page);
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('ما صلة القرابة بين سامي الاختبار وابن 1 الاختبار؟');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();

    await expect(dialog.getByText(/^صلة القرابة بين سامي الاختبار وابن 1 الاختبار/)).toBeVisible();
    await expect(dialog.getByText(/أقصر مسار مسجل/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /سامي الاختبار/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /ابن 1 الاختبار/ })).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
  });

  test('diagnoses tree data quality locally without exposing internal identifiers', async ({ page }) => {
    await seedScenario(page, 'ar');
    const initialPeopleCount = await getPeopleCount(page);
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('كيف هي جودة البيانات في الشجرة؟');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();

    await expect(dialog.getByText(/^اكتمل فحص بيانات الشجرة/)).toBeVisible();
    await expect(dialog.getByText('فحص بيانات الشجرة', { exact: true })).toBeVisible();
    await expect(dialog.getByText('من شجرتك', { exact: true })).toBeVisible();
    const diagnosticSummary = dialog.getByTestId('kindi-diagnostic-summary');
    await expect(diagnosticSummary).toBeVisible();
    await expect(diagnosticSummary).toContainText('الصحة');
    await expect(diagnosticSummary).toContainText('الاكتمال');
    await expect(diagnosticSummary).toContainText('المصادر');
    await expect(diagnosticSummary).toContainText('100%');
    await expect(diagnosticSummary).toContainText(/المصادر\s*0%/);
    const affectedRecord = dialog.getByRole('button', { name: /فتح السجل/ }).first();
    await expect(affectedRecord).toBeVisible();
    await expect(affectedRecord).toContainText(/ملاحظ/);
    await expect(dialog).not.toContainText('child-1');
    await expect(dialog).not.toContainText('kindi-owner@example.test');
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);

    await input.fill('افحص هذا الشخص');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();

    const suggestions = dialog.getByTestId('kindi-diagnostic-suggestions');
    await expect(suggestions).toBeVisible();
    await expect(suggestions).toContainText('خطوات الإثراء المقترحة');
    const suggestionCount = await suggestions.locator('li').count();
    expect(suggestionCount).toBeGreaterThan(0);
    expect(suggestionCount).toBeLessThanOrEqual(4);
    await expect(suggestions).not.toContainText('child-1');
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);

    const reviewParentsSuggestion = suggestions.getByRole('button', {
      name: /أضف الوالدين المعروفين.*فتح السجل/,
    });
    await expect(reviewParentsSuggestion).toBeVisible();
    await reviewParentsSuggestion.click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/person\//);
    const personDrawer = page.locator('#smart-persona-drawer');
    await expect(personDrawer).toBeVisible();
    await expect(personDrawer.locator('#persona-tab-links')).toHaveAttribute('aria-selected', 'true');
    const parentsTarget = personDrawer.locator('[data-smart-persona-field="parents"]');
    await expect(parentsTarget).toBeVisible();
    await expect.poll(() => parentsTarget.evaluate((target) => (
      target === document.activeElement || target.contains(document.activeElement)
    ))).toBe(true);
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
  });

  test('drafts a biography from recorded facts locally without saving or leaking private fields', async ({ page }) => {
    const privatePersonId = 'biography-raw-id-sentinel';
    const privateEmail = 'biography-private@example.test';
    const privatePhotoUrl = 'https://private-bucket.supabase.co/biography-photo-sentinel';
    const privateNote = 'bearer biography-private-token';
    const biographyPeople: Record<string, unknown> = {
      [privatePersonId]: {
        ...person(privatePersonId, 'رمضان'),
        birthDate: '1895-03-02',
        birthPlace: 'المدينة المنورة',
        profession: 'معلّم',
        residence: 'مكة المكرمة',
        isDeceased: true,
        deathDate: '1983-08-01',
        deathPlace: 'جدة',
        email: privateEmail,
        photoUrl: privatePhotoUrl,
        bio: privateNote,
      },
    };
    let aiRequestCount = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/ai-proxy') aiRequestCount += 1;
    });
    await seedScenario(page, 'ar', {
      people: biographyPeople,
      focusId: privatePersonId,
      treeName: 'Kindi Biography Draft Tree',
    });
    const initialPeopleCount = await getPeopleCount(page);
    const initialBio = await getPersonField(page, privatePersonId, 'bio');
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('أنشئ مسودة سيرة لهذا الشخص');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();

    await expect(dialog.getByText('مسودة سيرة محلية', { exact: true })).toBeVisible();
    const draft = dialog.getByTestId('kindi-biography-draft');
    await expect(draft).toBeVisible();
    await expect(draft).toContainText('الحقائق المستخدمة');
    await expect(draft).toContainText('رمضان الاختبار');
    await expect(draft).toContainText('1895');
    await expect(draft).toContainText('المدينة المنورة');
    await expect(draft).toContainText('معلّم');
    await expect(draft).toContainText('لم تُحفظ في سجل الشخص');
    await expect(dialog.getByRole('button', { name: 'تأكيد', exact: true })).toHaveCount(0);
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
    await expect.poll(() => getPersonField(page, privatePersonId, 'bio')).toBe(initialBio);
    expect(aiRequestCount).toBe(0);

    const dialogMarkup = await dialog.evaluate((element) => element.outerHTML);
    expect(dialogMarkup).not.toContain(privatePersonId);
    expect(dialogMarkup).not.toContain(privateEmail);
    expect(dialogMarkup).not.toContain(privatePhotoUrl);
    expect(dialogMarkup).not.toContain(privateNote);
  });

  test('organizes notes and sources locally without saving or exposing internal references', async ({ page }) => {
    const privatePersonId = 'record-review-raw-id-sentinel';
    const privateEmail = 'record-review-private@example.test';
    const privatePhotoUrl = 'https://private-bucket.supabase.co/record-review-photo';
    const privateSourceUrl = 'https://private-bucket.supabase.co/record-review-source';
    const privateSourceId = 'record-review-source-id-sentinel';
    const privateToken = 'bearer record-review-private-token';
    const safeNote = 'وثّقت العائلة انتقاله إلى مكة في سجلها الورقي.';
    const reviewPeople: Record<string, unknown> = {
      [privatePersonId]: {
        ...person(privatePersonId, 'رمضان'),
        birthDate: '1895-03-02',
        birthPlace: 'المدينة المنورة',
        birthSource: 'private/internal/birth-record',
        profession: 'معلّم',
        residence: 'مكة المكرمة',
        bio: `${safeNote}\n${privateToken}`,
        sources: [{
          id: privateSourceId,
          title: 'سجل الأسرة الورقي',
          url: privateSourceUrl,
          date: '1950',
          type: 'دفتر عائلي',
        }],
        email: privateEmail,
        photoUrl: privatePhotoUrl,
      },
    };
    let aiRequestCount = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/ai-proxy') aiRequestCount += 1;
    });
    await seedScenario(page, 'ar', {
      people: reviewPeople,
      focusId: privatePersonId,
      treeName: 'Kindi Record Review Tree',
    });
    const initialPeopleCount = await getPeopleCount(page);
    const initialBio = await getPersonField(page, privatePersonId, 'bio');
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('نظّم ملاحظات ومصادر هذا الشخص');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();

    await expect(dialog.getByText('مراجعة السجل والمصادر', { exact: true })).toBeVisible();
    const review = dialog.getByTestId('kindi-record-review');
    await expect(review).toBeVisible();
    await expect(review).toContainText('الحقائق المسجلة');
    await expect(review).toContainText('الملاحظات');
    await expect(review).toContainText('المصادر');
    await expect(review).toContainText('رمضان الاختبار');
    await expect(review).toContainText(safeNote);
    await expect(review).toContainText('سجل الأسرة الورقي');
    await expect(review).toContainText('المصادر المسجلة: 2 · الملخصة بأمان: 2');
    await expect(review).toContainText('لم تغيّر هذه المراجعة سجل الشخص');
    await expect(review).toContainText('أُخفي محتوى');
    await expect(dialog.getByRole('button', { name: 'تأكيد', exact: true })).toHaveCount(0);
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
    await expect.poll(() => getPersonField(page, privatePersonId, 'bio')).toBe(initialBio);
    expect(aiRequestCount).toBe(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(review).toBeVisible();
    const reviewOverflow = await review.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(reviewOverflow.scrollWidth).toBeLessThanOrEqual(reviewOverflow.clientWidth);
    const mobileDialogBounds = await dialog.boundingBox();
    expect(mobileDialogBounds).not.toBeNull();
    expect(mobileDialogBounds!.width).toBeLessThanOrEqual(390.1);

    const dialogMarkup = await dialog.evaluate((element) => element.outerHTML);
    expect(dialogMarkup).not.toContain(privatePersonId);
    expect(dialogMarkup).not.toContain(privateEmail);
    expect(dialogMarkup).not.toContain(privatePhotoUrl);
    expect(dialogMarkup).not.toContain(privateSourceUrl);
    expect(dialogMarkup).not.toContain(privateSourceId);
    expect(dialogMarkup).not.toContain(privateToken);

    const openRecordButton = dialog.getByRole('button', { name: 'فتح سجل الشخص' });
    await expect(openRecordButton).toBeVisible();
    await openRecordButton.click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/person/${privatePersonId}$`));
    const personDrawer = page.locator('#smart-persona-drawer');
    await expect(personDrawer).toBeVisible();
    await expect(personDrawer.getByRole('button', { name: 'إضافة مصدر' })).toBeVisible();
  });

  test('opens a reviewed record read-only for a viewer', async ({ page }) => {
    const viewerPerson = person('viewer-record-id', 'آمنة');
    viewerPerson.bio = 'ملاحظة عائلية قابلة للمراجعة.';
    await seedScenario(page, 'ar', {
      role: 'viewer',
      people: { [viewerPerson.id]: viewerPerson },
      focusId: viewerPerson.id,
      treeName: 'Kindi Viewer Record Review Tree',
    });
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('نظّم ملاحظات ومصادر هذا الشخص');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await dialog.getByRole('button', { name: 'فتح سجل الشخص' }).click();

    const personDrawer = page.locator('#smart-persona-drawer');
    await expect(personDrawer).toBeVisible();
    await expect(personDrawer.getByText('للقراءة فقط', { exact: true }).first()).toBeVisible();
    await expect(personDrawer.getByRole('button', { name: 'إضافة مصدر' })).toHaveCount(0);
    await expect(personDrawer.getByLabel('تعديل التفاصيل')).toHaveCount(0);
  });

  test('keeps a contextual add behind confirmation and safely undoes the applied change', async ({ page }) => {
    await seedScenario(page, 'ar');
    const initialPeopleCount = await getPeopleCount(page);
    const { dialog } = await openKindi(page, 'ar');

    await dialog.getByRole('button', { name: 'حضّر تغييرًا آمنًا' }).click();
    await expect(dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' }))
      .toHaveValue('أضف ابن لهذا الشخص');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText(/ما اسم ابن/)).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);

    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });
    await input.fill('آدم تجربة');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText('التفاصيل التي سيتم حفظها')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'بدء محادثة جديدة' })).toBeDisabled();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);

    await dialog.getByRole('button', { name: 'تأكيد', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'التراجع عن هذا التغيير' })).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount + 1);

    await dialog.getByRole('button', { name: 'التراجع عن هذا التغيير' }).click();
    await expect(dialog.getByText('تم التراجع عن التغيير')).toBeVisible();
    await expect(dialog.getByText('تم التراجع عن آخر تغيير نفذه كيندي.')).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
  });

  test('answers from the English help guide and restores focus after closing on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedScenario(page, 'en');
    const { dialog, trigger } = await openKindi(page, 'en');

    await dialog.getByRole('button', { name: 'Learn how Jozor works' }).click();
    const input = dialog.getByRole('textbox', { name: 'Kindi message' });
    await expect(input).toHaveValue('How do I add a person to the tree?');
    await dialog.getByRole('button', { name: 'Send to Kindi' }).click();
    await expect(dialog.getByText(/Add from a person card/)).toBeVisible();
    await expect(dialog.getByText('Jozor guide', { exact: true })).toBeVisible();
    await expect(dialog.getByText('From Help Center', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Show steps' })).toBeVisible();

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('allows a viewer to ask local questions but blocks every change before confirmation', async ({ page }) => {
    await seedScenario(page, 'ar', { role: 'viewer' });
    const initialPeopleCount = await getPeopleCount(page);
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('من هم أبناؤه؟');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText(/وجدت 8 من الأبناء/)).toBeVisible();

    await input.fill('احذف ابن 1 الاختبار');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText(/هذه الشجرة للقراءة فقط/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'تأكيد' })).toHaveCount(0);
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
  });

  test('lets an editor prepare a contextual change and cancel it without mutation', async ({ page }) => {
    await seedScenario(page, 'ar', { role: 'editor' });
    const initialPeopleCount = await getPeopleCount(page);
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('أضف ابن لهذا الشخص');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText(/ما اسم ابن/)).toBeVisible();
    await input.fill('محرر تجريبي');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText('التفاصيل التي سيتم حفظها')).toBeVisible();
    await dialog.getByRole('button', { name: 'إلغاء' }).click();

    await expect(dialog.getByText('تم إلغاء الطلب. لم يتم تغيير أي بيانات.')).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
  });

  test('keeps deletion behind confirmation and restores the deleted fixture through undo', async ({ page }) => {
    await seedScenario(page, 'ar');
    const initialPeopleCount = await getPeopleCount(page);
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('احذف ابن 1 الاختبار');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText('مراجعة حذف شخص', { exact: true })).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);

    await dialog.getByRole('button', { name: 'حذف', exact: true }).click();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount - 1);
    await expect(dialog.getByRole('button', { name: 'التراجع عن هذا التغيير' })).toBeVisible();

    await dialog.getByRole('button', { name: 'التراجع عن هذا التغيير' }).click();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
    await expect(dialog.getByText('تم التراجع عن آخر تغيير نفذه كيندي.')).toBeVisible();
  });

  test('reports a cloud network failure without leaking private fixture data', async ({ page }) => {
    const privateRawId = 'raw-person-id-sentinel-9001';
    const privateEmail = 'private-person-sentinel@example.test';
    const privatePhotoUrl = 'https://private-bucket.supabase.co/storage/v1/object/private-photo-sentinel';
    const privateAuthToken = 'private-auth-token-sentinel';
    const privatePeople: Record<string, unknown> = {
      [privateRawId]: {
        ...person(privateRawId, 'سامي'),
        email: privateEmail,
        photoUrl: privatePhotoUrl,
        bio: privateAuthToken,
      },
    };
    const consoleMessages: string[] = [];
    const aiRequestBodies: string[] = [];
    page.on('console', (message) => consoleMessages.push(message.text()));
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/ai-proxy') {
        aiRequestBodies.push(request.postData() ?? '');
      }
    });
    await page.context().route('**/api/ai-proxy*', async (route) => {
      await route.abort('internetdisconnected');
    });
    await seedScenario(page, 'en', {
      role: 'owner',
      subscriptionTier: 'pro',
      aiCloudQuotaRemaining: 10,
      people: privatePeople,
      focusId: privateRawId,
    });
    const { dialog } = await openKindi(page, 'en');
    const input = dialog.getByRole('textbox', { name: 'Kindi message' });

    await expect.poll(() => page.evaluate(() =>
      localStorage.getItem('jozor_supabase_token')
    )).toBe('kindi-e2e-session-token');

    await input.fill('change سامي الاختبار in a way I cannot describe');
    await dialog.getByRole('button', { name: 'Send to Kindi' }).click();

    await expect(dialog.getByText(/Cloud understanding is unavailable right now/)).toBeVisible({ timeout: 15_000 });
    expect(aiRequestBodies).toHaveLength(1);
    expect(aiRequestBodies[0]).toContain('[NAME_1]');
    expect(aiRequestBodies[0]).not.toContain('سامي');
    expect(aiRequestBodies[0]).not.toContain(privateRawId);
    expect(aiRequestBodies[0]).not.toContain(privateEmail);
    expect(aiRequestBodies[0]).not.toContain(privatePhotoUrl);
    expect(aiRequestBodies[0]).not.toContain(privateAuthToken);
    expect(aiRequestBodies[0]).not.toContain(OWNER.email);
    const consoleText = consoleMessages.join('\n');
    expect(consoleText).not.toContain(OWNER.email);
    expect(consoleText).not.toContain('kindi-e2e-session-token');
    expect(consoleText).not.toContain(privateRawId);
    expect(consoleText).not.toContain(privateEmail);
    expect(consoleText).not.toContain(privatePhotoUrl);
    expect(consoleText).not.toContain(privateAuthToken);
    const dialogMarkup = await dialog.evaluate((element) => element.outerHTML);
    expect(dialogMarkup).not.toContain(privateRawId);
    expect(dialogMarkup).not.toContain(privateEmail);
    expect(dialogMarkup).not.toContain(privatePhotoUrl);
    expect(dialogMarkup).not.toContain(privateAuthToken);
    const kindiStorage = JSON.stringify(await getKindiStorageSnapshot(page));
    expect(kindiStorage).not.toContain(OWNER.email);
    expect(kindiStorage).not.toContain('kindi-e2e-session-token');
    expect(kindiStorage).not.toContain(privateRawId);
    expect(kindiStorage).not.toContain(privateEmail);
    expect(kindiStorage).not.toContain(privatePhotoUrl);
    expect(kindiStorage).not.toContain(privateAuthToken);
    expect(kindiStorage).not.toContain('سامي');
    await expect.poll(() => getPeopleCount(page)).toBe(Object.keys(privatePeople).length);
  });

  test('keeps a large family query bounded and responsive in the browser', async ({ page }) => {
    const largeChildIds = Array.from({ length: 180 }, (_, index) => `large-child-${index + 1}`);
    const largePeople: Record<string, unknown> = {
      root: person('root', 'سامي', { children: largeChildIds }),
      ...Object.fromEntries(largeChildIds.map((id, index) => [
        id,
        person(id, `فرد ${String(index + 1).padStart(3, '0')}`, { parents: ['root'] }),
      ])),
    };
    await seedScenario(page, 'ar', {
      people: largePeople,
      treeName: 'Kindi Large Family Tree',
    });
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });
    const startedAt = Date.now();

    await input.fill('من هم أبناؤه؟');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText(/وجدت 180 من الأبناء/)).toBeVisible({ timeout: 15_000 });

    expect(Date.now() - startedAt).toBeLessThan(15_000);
    await expect(dialog.getByRole('button', { name: /فرد \d{3} الاختبار/ })).toHaveCount(6);
    await dialog.getByRole('button', { name: /عرض المزيد/ }).click();
    await expect(dialog.getByRole('button', { name: /فرد \d{3} الاختبار/ })).toHaveCount(18);
    await expect(dialog.getByText('فرد 180 الاختبار', { exact: true })).toHaveCount(0);

    const overflow = await dialog.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });

  test('requires an explicit contextual choice for similar names before preparing a change', async ({ page }) => {
    const ambiguousPeople: Record<string, unknown> = {
      root: person('root', 'سامي'),
      'parent-a': person('parent-a', 'أحمد', { children: ['mohammed-a'] }),
      'parent-b': person('parent-b', 'خالد', { children: ['mohammed-b'] }),
      'mohammed-a': person('mohammed-a', 'محمد', { parents: ['parent-a'] }),
      'mohammed-b': person('mohammed-b', 'محمد', { parents: ['parent-b'] }),
    };
    await seedScenario(page, 'ar', { people: ambiguousPeople });
    const initialPeopleCount = await getPeopleCount(page);
    const { dialog } = await openKindi(page, 'ar');
    const input = dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' });

    await input.fill('أضف ابن لمحمد اسمه علي');
    await dialog.getByRole('button', { name: 'إرسال إلى كِندي' }).click();
    await expect(dialog.getByText(/أي محمد تقصد/)).toBeVisible();
    await expect(dialog.getByText('ابن أحمد الاختبار', { exact: true })).toBeVisible();
    await expect(dialog.getByText('ابن خالد الاختبار', { exact: true })).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);

    await dialog.getByRole('button').filter({ hasText: 'ابن خالد الاختبار' }).click();
    await expect(dialog.getByText('التفاصيل التي سيتم حفظها')).toBeVisible();
    await expect(dialog.getByText(/محمد الاختبار/).last()).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
    await dialog.getByRole('button', { name: 'إلغاء' }).click();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
  });

  test('enforces viewer and editor permissions with English interface copy', async ({ page }) => {
    const englishPeople: Record<string, unknown> = {
      root: { ...person('root', 'Sami'), lastName: 'Test' },
    };
    await seedScenario(page, 'en', { role: 'viewer', people: englishPeople });
    let initialPeopleCount = await getPeopleCount(page);
    let opened = await openKindi(page, 'en');
    let input = opened.dialog.getByRole('textbox', { name: 'Kindi message' });

    await input.fill('delete Sami Test');
    await opened.dialog.getByRole('button', { name: 'Send to Kindi' }).click();
    await expect(opened.dialog.getByText(/This tree is read-only/)).toBeVisible();
    await expect(opened.dialog.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);

    await seedScenario(page, 'en', { role: 'editor', people: englishPeople });
    initialPeopleCount = await getPeopleCount(page);
    opened = await openKindi(page, 'en');
    input = opened.dialog.getByRole('textbox', { name: 'Kindi message' });
    await input.fill('add a son to this person');
    await opened.dialog.getByRole('button', { name: 'Send to Kindi' }).click();
    await expect(opened.dialog.getByText(/What is the name of the son/)).toBeVisible();
    await input.fill('Adam Test');
    await opened.dialog.getByRole('button', { name: 'Send to Kindi' }).click();
    await expect(opened.dialog.getByText('Review tree addition', { exact: true })).toBeVisible();
    await opened.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(opened.dialog.getByText('The request was cancelled. No data was changed.')).toBeVisible();
    await expect.poll(() => getPeopleCount(page)).toBe(initialPeopleCount);
  });

  test('keeps an English data update behind confirmation and restores it through undo', async ({ page }) => {
    const englishPeople: Record<string, unknown> = {
      root: { ...person('root', 'Sami'), lastName: 'Test' },
    };
    await seedScenario(page, 'en', { people: englishPeople });
    const { dialog } = await openKindi(page, 'en');
    const input = dialog.getByRole('textbox', { name: 'Kindi message' });

    await input.fill('update birth date for Sami Test to 1990-01-01');
    await dialog.getByRole('button', { name: 'Send to Kindi' }).click();
    await expect(dialog.getByText('Review data update', { exact: true })).toBeVisible();
    await expect.poll(() => getPersonField(page, 'root', 'birthDate')).toBe('1980');

    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect.poll(() => getPersonField(page, 'root', 'birthDate')).toBe('1990-01-01');
    await expect(dialog.getByRole('button', { name: 'Undo this change' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Undo this change' }).click();
    await expect.poll(() => getPersonField(page, 'root', 'birthDate')).toBe('1980');
    await expect(dialog.getByText('Kindi’s latest change was undone.')).toBeVisible();
  });

  test('remains operable after a live desktop-to-mobile viewport transition', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await seedScenario(page, 'ar');
    const firstOpen = await openKindi(page, 'ar');
    await page.keyboard.press('Escape');
    await expect(firstOpen.dialog).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobilePersonDrawer = page.getByRole('complementary', { name: 'تفاصيل الشخص' });
    await expect(mobilePersonDrawer.getByRole('button', { name: 'إغلاق', exact: true })).toBeVisible();
    await mobilePersonDrawer.getByRole('button', { name: 'إغلاق', exact: true }).click();
    const mobileOpen = await openKindi(page, 'ar');
    const bounds = await mobileOpen.dialog.boundingBox();

    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.width).toBeLessThanOrEqual(390.1);
    await expect(mobileOpen.dialog.getByRole('button', { name: 'اسأل عن العائلة' })).toBeVisible();
    await expect(mobileOpen.dialog.getByRole('textbox', { name: 'رسالة إلى كِندي' })).toBeFocused();
  });
});
