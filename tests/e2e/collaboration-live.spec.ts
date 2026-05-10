import { expect, test, type Page } from '@playwright/test';

type E2EUser = {
  email: string;
  password: string;
};

type LiveDebug = {
  getStateSnapshot: () => AppSnapshot;
};

type DebugWindow = Window & { jozorDebug?: LiveDebug };

type AppSnapshot = {
  treeId: string | null;
  treeName?: string;
  role: 'owner' | 'editor' | 'viewer' | null;
  focusId?: string | null;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    supabaseToken?: string;
  } | null;
};

const ownerUser: E2EUser = {
  email: process.env.E2E_OWNER_EMAIL || '',
  password: process.env.E2E_OWNER_PASSWORD || '',
};

const editorUser: E2EUser = {
  email: process.env.E2E_EDITOR_EMAIL || '',
  password: process.env.E2E_EDITOR_PASSWORD || '',
};

const hasLiveCollaborationEnv =
  !!ownerUser.email && !!ownerUser.password && !!editorUser.email && !!editorUser.password;

test.describe('live collaboration (Supabase test environment)', () => {
  test.skip(
    !hasLiveCollaborationEnv,
    'Set E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, E2E_EDITOR_EMAIL, and E2E_EDITOR_PASSWORD to run live collaboration E2E.'
  );

  test('owner can share with viewer, promote to editor, and editor changes persist', async ({
    browser,
  }) => {
    test.slow();

    const ownerContext = await browser.newContext();
    const editorContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const editorPage = await editorContext.newPage();

    const updatedRootName = `Collaborative Root ${Date.now()}`;

    try {
      await prepareFreshSession(ownerPage);
      await loginWithEmail(ownerPage, ownerUser);
      await createFreshTree(ownerPage);

      const ownerSnapshot = await getStateSnapshot(ownerPage);
      if (!ownerSnapshot.treeId || !ownerSnapshot.user?.uid || !ownerSnapshot.treeName) {
        throw new Error('Owner tree setup failed: treeId, treeName, or owner uid is missing.');
      }

      const sharedPath = `/tree/db/${ownerSnapshot.user.uid}/${ownerSnapshot.treeId}`;

      await inviteCollaborator(ownerPage, {
        treeId: ownerSnapshot.treeId,
        ownerUid: ownerSnapshot.user.uid,
        email: editorUser.email,
        role: 'viewer',
      });

      await prepareFreshSession(editorPage);
      await loginWithEmail(editorPage, editorUser);
      await editorPage.goto(sharedPath, { waitUntil: 'domcontentloaded' });

      await expect(editorPage.getByText(`Tree: ${ownerSnapshot.treeName}`)).toBeVisible();
      await expect(editorPage.getByText(/Role:\s*Viewer/i)).toBeVisible();
      await openAddRelativeMenu(editorPage);
      await expect(editorPage.getByRole('menuitem', { name: 'Add Father' })).toBeDisabled();
      await closeContextMenu(editorPage);

      await updateCollaboratorRole(ownerPage, {
        treeId: ownerSnapshot.treeId,
        ownerUid: ownerSnapshot.user.uid,
        email: editorUser.email,
        role: 'editor',
      });

      await editorPage.goto(sharedPath, { waitUntil: 'domcontentloaded' });
      await expect(editorPage.getByText(`Tree: ${ownerSnapshot.treeName}`)).toBeVisible();
      await expect(editorPage.getByText(/Role:\s*Editor/i)).toBeVisible();

      await editorPage.getByLabel('Edit Details').click();
      const firstNameInput = editorPage.locator('aside input[type="text"]').first();
      await expect(firstNameInput).toBeVisible();
      await firstNameInput.fill(updatedRootName);
      await firstNameInput.blur();
      await editorPage.getByLabel('Done (Finish Editing)').click();

      await editorPage.goto(sharedPath, { waitUntil: 'domcontentloaded' });
      await expect(
        editorPage
          .getByRole('heading', {
            name: new RegExp(
              `${escapeRegExp(updatedRootName)}\\s*Person|${escapeRegExp(updatedRootName)}Person`,
              'i'
            ),
          })
          .first()
      ).toBeVisible();
      await expect(editorPage.getByText(`Tree: ${ownerSnapshot.treeName}`)).toBeVisible();
      await expect(editorPage.getByText(/Role:\s*Editor/i)).toBeVisible();
    } finally {
      await ownerContext.close().catch(() => {});
      await editorContext.close().catch(() => {});
    }
  });
});

async function prepareFreshSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('lastActiveTreeId');
    sessionStorage.removeItem('jozor:e2e-scenario');
  });
}

async function loginWithEmail(page: Page, user: E2EUser) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const loginTrigger = page.getByRole('button', { name: /google|sign in|login/i }).first();
  await expect(loginTrigger).toBeVisible();
  await loginTrigger.click();

  const loginDialog = page
    .getByRole('dialog')
    .filter({ has: page.locator('input[type="email"]') })
    .first();
  await expect(loginDialog).toBeVisible();

  await loginDialog.locator('input[type="email"]').fill(user.email);
  await loginDialog.locator('input[type="password"]').fill(user.password);
  await loginDialog.locator('button[type="submit"]').click();

  const authError = loginDialog
    .getByText(/invalid credential|wrong password|user-not-found|authentication failed/i)
    .first();
  if (await authError.isVisible().catch(() => false)) {
    const message = (await authError.textContent())?.trim() || 'Authentication failed.';
    throw new Error(`Live collaboration login failed for ${user.email}: ${message}`);
  }

  await page.waitForFunction((expectedEmail) => {
    const snapshot = (window as DebugWindow).jozorDebug?.getStateSnapshot?.();
    return snapshot?.user?.email?.toLowerCase() === String(expectedEmail).toLowerCase();
  }, user.email);
  await expect(page.getByText(/Manage Trees/i)).toBeVisible();
}

async function createFreshTree(page: Page) {
  await expect(page.getByText(/Manage Trees/i)).toBeVisible();

  const createButton = page.getByRole('button', { name: /^Add$/i }).first();
  await expect(createButton).toBeVisible();
  await createButton.click();

  await page.waitForFunction(() => {
    const debug = (window as DebugWindow).jozorDebug;
    return typeof debug?.getStateSnapshot === 'function' && !!debug.getStateSnapshot()?.treeId;
  });
}

async function getStateSnapshot(page: Page): Promise<AppSnapshot> {
  await page.waitForFunction(
    () => typeof (window as DebugWindow).jozorDebug?.getStateSnapshot === 'function'
  );
  return page.evaluate(() => (window as DebugWindow).jozorDebug.getStateSnapshot());
}

async function openHeaderSettingsMenu(page: Page) {
  const trigger = page.locator('header button:has(svg.lucide-settings)').first();
  await expect(trigger).toBeVisible();
  await trigger.click();
}

async function inviteCollaborator(
  page: Page,
  params: { treeId: string; ownerUid: string; email: string; role: 'viewer' | 'editor' }
) {
  await openHeaderSettingsMenu(page);
  await page.getByRole('menuitem').filter({ hasText: /share/i }).first().click();

  const shareDialog = page.locator('[data-overlay-id="share-modal"], #share-modal').first();
  await expect(shareDialog).toBeVisible();

  await shareDialog.locator('input[type="email"]').fill(params.email);
  await shareDialog.locator('select').selectOption(params.role);
  await shareDialog.locator('button[type="submit"]').click();

  await expect(shareDialog.locator('input[type="email"]')).toHaveValue('');
  await page.keyboard.press('Escape');
}

async function updateCollaboratorRole(
  page: Page,
  params: { treeId: string; ownerUid: string; email: string; role: 'viewer' | 'editor' }
) {
  await openHeaderSettingsMenu(page);
  await page.getByRole('menuitem').filter({ hasText: /tree control|control center/i }).first().click();

  const treeControlCenter = page.locator('[data-overlay-id="tree-control-center"], #tree-control-center').first();
  await expect(treeControlCenter).toBeVisible();
  await treeControlCenter.getByRole('button', { name: /access/i }).click();

  const emailRow = treeControlCenter.locator('div').filter({ hasText: params.email }).first();
  await expect(emailRow).toBeVisible();
  await emailRow.locator('select').selectOption(params.role);

  await page.keyboard.press('Escape');
}

async function openAddRelativeMenu(page: Page) {
  const node = page.locator('svg g.cursor-pointer').first();
  await expect(node).toBeVisible();
  await node.dispatchEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    buttons: 2,
    clientX: 20,
    clientY: 20,
  });
  await page.getByRole('menuitem', { name: 'Add Relative' }).click();
}

async function closeContextMenu(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: 'Add Relative' })).toHaveCount(0);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
