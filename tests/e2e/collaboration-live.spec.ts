import { expect, test, type Page } from '@playwright/test';
import {
  prepareFreshSession,
  getStateSnapshot,
  inviteCollaborator,
  updateCollaboratorRole,
  openAddRelativeMenu,
  closeContextMenu,
  createFreshTree,
  escapeRegExp,
  type DebugWindow,
} from './helpers/collabHelpers';

type E2EUser = {
  email: string;
  password: string;
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
    throw new Error(`Live collaboration login failed: ${message}`);
  }

  await page.waitForFunction((expectedEmail) => {
    const snapshot = (window as DebugWindow).jozorDebug?.getStateSnapshot?.();
    return snapshot?.user?.email?.toLowerCase() === String(expectedEmail).toLowerCase();
  }, user.email);
  await expect(page.getByText(/Manage Trees/i)).toBeVisible();
}
