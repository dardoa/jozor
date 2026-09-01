import { expect, test, type Page } from '@playwright/test';
import { hasE2EAuthEnv, ensureAuthState } from './helpers/authState';
import * as collabHelpers from './helpers/collabHelpers';


type DebugUser = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
};

type DebugRole = 'owner' | 'viewer' | 'editor';

type JozorDebug = {
  seedTreeScenario: (payload: {
    people: typeof seedPeople;
    focusId: string;
    role: DebugRole;
    treeName?: string;
    user?: DebugUser;
  }) => void;
  setRole: (role: Exclude<DebugRole, 'owner'>) => void;
  persistCurrentScenario: () => void;
  clearPersistedScenario: () => void;
  setScenarioAccess: (payload: { role: DebugRole; user: DebugUser }) => void;
  setSyncStatus: (payload: Record<string, unknown>) => void;
  setInvitationTelemetry: (payload: Record<string, unknown>) => void;
  seedNotifications: (
    payload: Array<{
      type: 'birthday' | 'integrity' | 'info' | 'invitation';
      source:
        | 'heritage'
        | 'integrity'
        | 'invitation-realtime'
        | 'invitation-hydration'
        | 'owner-realtime'
        | 'activity-log'
        | 'system';
      title: string;
      body: string;
      dedupeKey?: string;
      actionable?: boolean;
      expiresAt?: string;
      invitationId?: string;
      invitationTreeId?: string;
      invitationOwnerUid?: string;
      invitationRole?: 'editor' | 'viewer';
      invitationStatus?: 'pending' | 'accepted' | 'revoked' | 'expired' | 'declined';
    }>
  ) => void;
  openDiagnostics: () => void;
  getStateSnapshot: () => {
    role?: DebugRole;
    people?: typeof seedPeople;
    user?: DebugUser;
    focusId?: string;
    treeName?: string;
  };
};

type DebugWindow = Window & { jozorDebug?: JozorDebug };

test.describe.configure({ timeout: 60000 });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
  });
});

test('application shell loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
});

const seedPeople = {
  root: {
    id: 'root',
    title: '',
    firstName: 'Root',
    middleName: '',
    lastName: 'Person',
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
    parents: [],
    spouses: [],
    children: ['child'],
    partnerDetails: {},
    isPrivate: false,
  },
  child: {
    id: 'child',
    title: '',
    firstName: 'Child',
    middleName: '',
    lastName: 'Person',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'female',
    birthDate: '2010',
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
    parents: ['root'],
    spouses: [],
    children: [],
    partnerDetails: {},
    isPrivate: false,
  },
};

const seedScenario = async (
  page: Page,
  role: DebugRole,
  user?: DebugUser,
  treeName = 'Scenario Oak'
) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const jozorDebug = (window as DebugWindow).jozorDebug;
    return typeof jozorDebug?.seedTreeScenario === 'function';
  });
  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.clearPersistedScenario?.();
  });
  await page.evaluate(
    ({ people, role, user, treeName }) => {
      const jozorDebug = (window as DebugWindow).jozorDebug;
      jozorDebug?.seedTreeScenario({
        people,
        focusId: 'root',
        role,
        treeName,
        user,
      });
    },
    { people: seedPeople, role, user, treeName }
  );
  
  // Wait for the tree loader to disappear to ensure the tree is rendered
  const loader = page.getByTestId('tree-loader');
  if (await loader.count() > 0) {
    await expect(loader).toBeHidden({ timeout: 15000 });
  }
};

const openNodeContextMenu = async (page: Page) => {
  const node = page.getByTestId('tree-node').first();
  await expect(node).toBeVisible({ timeout: 10000 });
  await node.dispatchEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    buttons: 2,
    clientX: 20,
    clientY: 20,
  });
  await expect(page.getByRole('menuitem', { name: /Add Father/i })).toBeVisible();
};

const closeContextMenu = async (page: Page) => {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: /Add Father/i })).toHaveCount(0);
};

const waitForDebugRole = async (page: Page, role: DebugRole) => {
  await page.waitForFunction((expectedRole) => {
    const snapshot = (window as DebugWindow).jozorDebug?.getStateSnapshot?.();
    return snapshot?.role === expectedRole;
  }, role);
};

const openDiagnosticsDrawer = async (page: Page) => {
  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.openDiagnostics?.();
  });
  await expect(page.getByRole('heading', { name: 'Diagnostics', exact: true })).toBeVisible();
};

const openNotificationCenter = async (page: Page) => {
  await page.getByTestId('notification-bell-trigger').click();
};

test('viewer can open a tree but cannot add relatives from node context menu', async ({ page }) => {
  await seedScenario(page, 'viewer');
  await waitForDebugRole(page, 'viewer');
  
  const node = page.getByTestId('tree-node').first();
  await expect(node).toBeVisible({ timeout: 10000 });
  await node.dispatchEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    buttons: 2,
    clientX: 20,
    clientY: 20,
  });
  
  await expect(page.getByRole('menuitem', { name: /Add Father/i })).toHaveCount(0);
});

test('editor can open a tree and add relatives from node context menu', async ({ page }) => {
  await seedScenario(page, 'editor');
  await waitForDebugRole(page, 'editor');
  await openNodeContextMenu(page);

  await expect(page.getByRole('menuitem', { name: 'Add Father' })).toBeEnabled();
  await expect(page.getByRole('menuitem', { name: 'Add Mother' })).toBeEnabled();
  await expect(page.getByRole('menuitem', { name: 'Add Son' })).toBeEnabled();
});

test('role upgrade from viewer to editor unlocks editing actions without reseeding the tree', async ({ page }) => {
  await seedScenario(page, 'viewer');
  await waitForDebugRole(page, 'viewer');
  
  const node = page.getByTestId('tree-node').first();
  await expect(node).toBeVisible({ timeout: 10000 });
  await node.dispatchEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    buttons: 2,
    clientX: 20,
    clientY: 20,
  });
  await expect(page.getByRole('menuitem', { name: /Add Father/i })).toHaveCount(0);
  await closeContextMenu(page);

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.setRole('editor');
  });

  await waitForDebugRole(page, 'editor');
  await openNodeContextMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Add Father' })).toBeEnabled();
});

test('editor edits a person and the value persists after reload', async ({ page }) => {
  await seedScenario(page, 'editor');
  await waitForDebugRole(page, 'editor');
  
  const editDetailsBtn = page.getByLabel('Edit Details').first();
  await expect(editDetailsBtn).toBeVisible({ timeout: 10000 });
  await editDetailsBtn.click();

  const firstNameInput = page.getByText('First Name', { exact: true }).locator('xpath=..').getByRole('textbox');
  await expect(firstNameInput).toBeVisible();
  await firstNameInput.fill('Root Updated');
  await firstNameInput.blur();

  await page.getByLabel('Done (Finish Editing)').click();
  await expect(page.getByRole('heading', { name: /Root Updated Person|Root UpdatedPerson/i }).first()).toBeVisible();

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.persistCurrentScenario();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Root Updated Person|Root UpdatedPerson/i }).first()).toBeVisible();

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.clearPersistedScenario();
  });
});

test('owner can open the account menu and vault entry while a tree is active', async ({ page }) => {
  const ownerUser = {
    uid: 'owner-user',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser);
  await waitForDebugRole(page, 'owner');

  await page.getByTestId('account-menu-trigger').click();
  await expect(page.getByRole('menuitem', { name: /The Vault/i })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Sign Out/i })).toBeVisible();
});

test('persisted debug scenario restores the tree name in the header', async ({ page }) => {
  await seedScenario(page, 'editor', undefined, 'Scenario Redwood');
  await waitForDebugRole(page, 'editor');

  await expect(page.getByText('Tree: Scenario Redwood')).toBeVisible();

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.persistCurrentScenario();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Tree: Scenario Redwood')).toBeVisible();

  const snapshot = await page.evaluate(() => (window as DebugWindow).jozorDebug?.getStateSnapshot?.());
  expect(snapshot?.treeName).toBe('Scenario Redwood');

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.clearPersistedScenario();
  });
});

test('diagnostics surface shows maintenance tools only for the tree owner', async ({ page }) => {
  const ownerUser = {
    uid: 'owner-user',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };
  const editorUser = {
    uid: 'editor-user',
    displayName: 'Editor User',
    email: 'editor@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser);
  await waitForDebugRole(page, 'owner');

  await openDiagnosticsDrawer(page);
  await expect(page.getByText(/Sync Diagnostics/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Prune Old Sync Operations/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Prune Old Activity Logs/i })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Prune Old Sync Operations/i })).toHaveCount(0);

  await page.evaluate((user) => {
    (window as DebugWindow).jozorDebug?.setScenarioAccess({ role: 'editor', user });
  }, editorUser);

  await waitForDebugRole(page, 'editor');
  await openDiagnosticsDrawer(page);

  await expect(page.getByText(/Maintenance tools are available only to the tree owner while a tree is open./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Prune Old Sync Operations/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Prune Old Activity Logs/i })).toHaveCount(0);
});

test('sync diagnostics surface pending work and retryable errors', async ({ page }) => {
  const diagnosticsTreeName = 'Diagnostics Maple';
  const ownerUser = {
    uid: 'owner-user',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser, diagnosticsTreeName);
  await waitForDebugRole(page, 'owner');
  await expect(page.getByText(`Tree: ${diagnosticsTreeName}`)).toBeVisible();

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.setSyncStatus({
      state: 'error',
      pendingCount: 3,
      errorMessage: 'Network problem detected. Your changes can be retried when the connection is stable.',
      lastErrorCategory: 'NETWORK',
      lastErrorRetryable: true,
      lastErrorAt: new Date(),
      lastSyncTime: new Date(),
      lastSyncSupabase: new Date(),
      lastSyncDrive: new Date(),
      supabaseStatus: 'error',
      driveStatus: 'idle',
    });
  });

  await openDiagnosticsDrawer(page);

  const diagnosticsPanel = page.locator('.ds-drawer-shell').last();

  await expect(page.getByText(`Tree: ${diagnosticsTreeName}`)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/Sync Diagnostics/i)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/^error$/i)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/^3$/)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/Network problem detected. Your changes can be retried when the connection is stable./i)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/Error Category:\s*NETWORK/i)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/Retry:\s*Automatic retry expected/i)).toBeVisible();
});

test('invitation diagnostics surface realtime and owner correlation details', async ({ page }) => {
  const ownerUser = {
    uid: 'owner-user',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser, 'Invitation Willow');
  await waitForDebugRole(page, 'owner');

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.setInvitationTelemetry({
      lastHydratedAt: new Date('2026-03-27T12:00:00.000Z'),
      lastHydrationCount: 2,
      lastHydrationAddedCount: 1,
      lastHydrationRemovedCount: 0,
      lastEventAt: new Date('2026-03-27T12:05:00.000Z'),
      lastEventSource: 'my-realtime',
      lastEventStatus: 'pending',
      lastEventInvitationId: 'inv-1',
      lastIgnoredAt: new Date('2026-03-27T12:04:00.000Z'),
      lastIgnoredSource: 'owned-realtime',
      lastIgnoredStatus: 'revoked',
      lastOwnerEventAt: new Date('2026-03-27T12:06:00.000Z'),
      lastOwnerEventStatus: 'declined',
      lastOwnerEventEmail: 'invitee@example.com',
      lastOwnerEventRole: 'viewer',
      lastOwnerEventInvitationId: 'inv-2',
    });
  });

  await openDiagnosticsDrawer(page);

  const diagnosticsPanel = page.locator('.ds-drawer-shell').last();

  await expect(diagnosticsPanel.getByText(/Invitation Diagnostics/i)).toBeVisible();
  await expect(diagnosticsPanel).toContainText('2/1/0');
  await expect(diagnosticsPanel.getByText(/^my-realtime$/)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/^pending$/)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/^inv-1$/)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/^owned-realtime:revoked$/)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/invitee@example.com/i)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/declined/i)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/inv-2/i)).toBeVisible();
});

test('invitation diagnostics surface telemetry errors', async ({ page }) => {
  const ownerUser = {
    uid: 'owner-user',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser, 'Invitation Fir');
  await waitForDebugRole(page, 'owner');

  await openDiagnosticsDrawer(page);

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.setInvitationTelemetry({
      lastErrorAt: new Date('2026-03-27T12:08:00.000Z'),
      lastErrorMessage: 'Hydration failed after login.',
    });
  });

  const diagnosticsPanel = page.locator('.ds-drawer-shell').last();

  await expect(diagnosticsPanel.getByText(/Invitation Diagnostics/i)).toBeVisible();
  await expect(diagnosticsPanel.getByText(/Hydration failed after login\./i)).toBeVisible();
});

test.describe('authenticated shared tree access smoke', () => {
  if (!hasE2EAuthEnv()) {
    test.skip('shared tree access changes from owner to viewer to editor and editor changes persist after reload', () => undefined);
    return;
  }

  test('shared tree access changes from owner to viewer to editor and editor changes persist after reload', async ({ browser }) => {
    test.slow();

    // 1. Prepare owner and collaborator contexts
    const tempContext = await browser.newContext();
    const tempPage = await tempContext.newPage();

    // Ensure storage state files are generated/validated
    const ownerState = await ensureAuthState(tempPage, 'owner');
    const collabState = await ensureAuthState(tempPage, 'collab');
    await tempContext.close();

    // Create real authenticated contexts
    const ownerContext = await browser.newContext({ storageState: ownerState });
    const collabContext = await browser.newContext({ storageState: collabState });

    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    const updatedRootName = `Collaborative Root ${Date.now()}`;

    try {
      // 2. Owner logs in, creates a fresh tree
      await collabHelpers.prepareFreshSession(ownerPage);
      await ownerPage.goto('/', { waitUntil: 'domcontentloaded' });
      await collabHelpers.createFreshTree(ownerPage);

      const ownerSnapshot = await collabHelpers.getStateSnapshot(ownerPage);
      if (!ownerSnapshot.treeId || !ownerSnapshot.user?.uid) {
        throw new Error('Owner tree setup failed: treeId or owner uid is missing.');
      }

      const sharedPath = `/tree/db/${ownerSnapshot.user.uid}/${ownerSnapshot.treeId}`;

      // 3. Owner invites collaborator as viewer
      await collabHelpers.inviteCollaborator(ownerPage, {
        treeId: ownerSnapshot.treeId,
        ownerUid: ownerSnapshot.user.uid,
        email: process.env.E2E_COLLAB_EMAIL!,
        role: 'viewer',
      });

      // 4. Collaborator visits tree, verifies viewer write block
      await collabHelpers.prepareFreshSession(collabPage);
      await collabPage.goto(sharedPath, { waitUntil: 'domcontentloaded' });

      await expect(collabPage.getByText(`Tree: ${ownerSnapshot.treeName}`)).toBeVisible();
      await expect(collabPage.getByText(/Role:\s*Viewer/i)).toBeVisible();

      await collabHelpers.openAddRelativeMenu(collabPage);
      await expect(collabPage.getByRole('menuitem', { name: 'Add Father' })).toBeDisabled();
      await collabHelpers.closeContextMenu(collabPage);

      // 5. Owner promotes collaborator to editor
      await collabHelpers.updateCollaboratorRole(ownerPage, {
        treeId: ownerSnapshot.treeId,
        ownerUid: ownerSnapshot.user.uid,
        email: process.env.E2E_COLLAB_EMAIL!,
        role: 'editor',
      });

      // 6. Collaborator reloads tree, verifies editor role and write permission
      await collabPage.goto(sharedPath, { waitUntil: 'domcontentloaded' });
      await expect(collabPage.getByText(`Tree: ${ownerSnapshot.treeName}`)).toBeVisible();
      await expect(collabPage.getByText(/Role:\s*Editor/i)).toBeVisible();

      await collabPage.getByLabel('Edit Details').click();
      const firstNameInput = collabPage.locator('aside input[type="text"]').first();
      await expect(firstNameInput).toBeVisible();
      await firstNameInput.fill(updatedRootName);
      await firstNameInput.blur();
      await collabPage.getByLabel('Done (Finish Editing)').click();

      // 7. Collaborator reloads again, verifies changes persist
      await collabPage.goto(sharedPath, { waitUntil: 'domcontentloaded' });
      await expect(
        collabPage.getByRole('heading', {
          name: new RegExp(`${collabHelpers.escapeRegExp(updatedRootName)}\\s*Person|${collabHelpers.escapeRegExp(updatedRootName)}Person`, 'i'),
        }).first()
      ).toBeVisible();
      await expect(collabPage.getByText(`Tree: ${ownerSnapshot.treeName}`)).toBeVisible();
      await expect(collabPage.getByText(/Role:\s*Editor/i)).toBeVisible();
    } finally {
      await ownerContext.close().catch(() => {});
      await collabContext.close().catch(() => {});
    }
  });
});


test('persisted notifications survive reload for the same user and do not leak to another user', async ({ page }) => {
  const ownerUser = {
    uid: 'notif-owner',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };
  const otherUser = {
    uid: 'notif-other',
    displayName: 'Other User',
    email: 'other@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser, 'Notification Birch');
  await waitForDebugRole(page, 'owner');

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.seedNotifications([
      {
        type: 'info',
        source: 'owner-realtime',
        title: 'Invitation accepted',
        body: 'invitee@example.com accepted the invitation as viewer.',
        dedupeKey: 'owner-invitation:e2e:accepted',
        invitationId: 'inv-e2e',
        invitationStatus: 'accepted',
        invitationRole: 'viewer',
      },
    ]);
    (window as DebugWindow).jozorDebug?.persistCurrentScenario();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await openNotificationCenter(page);
  await expect(page.getByText('Invitation accepted')).toBeVisible();
  await expect(page.getByText('invitee@example.com accepted the invitation as viewer.')).toBeVisible();

  await page.evaluate((user) => {
    (window as DebugWindow).jozorDebug?.setScenarioAccess({ role: 'owner', user });
    (window as DebugWindow).jozorDebug?.persistCurrentScenario();
  }, otherUser);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await openNotificationCenter(page);
  await expect(page.getByText('Invitation accepted')).toHaveCount(0);
  await expect(page.getByText('No notifications yet')).toBeVisible();

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.clearPersistedScenario?.();
  });
});

test.describe('Vault role boundaries', () => {
  test('keeps owner-only destinations and Drive management out of editor and viewer sessions', async ({ page }) => {
    const scenarios: Array<{ role: DebugRole; canManage: boolean }> = [
      { role: 'owner', canManage: true },
      { role: 'editor', canManage: false },
      { role: 'viewer', canManage: false },
    ];

    for (const scenario of scenarios) {
      await seedScenario(page, scenario.role, undefined, `${scenario.role} Vault Tree`);
      await waitForDebugRole(page, scenario.role);

      await page.getByTestId('account-menu-trigger').click();
      await page.getByRole('menuitem', { name: /The Vault/i }).click();
      await expect(page.getByRole('heading', { name: 'The Vault' })).toBeVisible();

      const navigation = page.getByRole('navigation', { name: 'The Vault' });
      await expect(navigation.getByRole('button', { name: 'Trees', exact: true })).toBeVisible();
      await expect(navigation.getByRole('button', { name: 'Insights & Tools', exact: true })).toBeVisible();
      await expect(navigation.getByRole('button', { name: 'Publishing & Backup', exact: true })).toBeVisible();

      await navigation.getByRole('button', { name: 'Insights & Tools', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Explore the tree' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Check and calculate' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Open data consistency check:/i })).toBeVisible();

      if (scenario.canManage) {
        await expect(navigation.getByRole('button', { name: 'Members', exact: true })).toBeVisible();
        await expect(navigation.getByRole('button', { name: 'Privacy', exact: true })).toBeVisible();
        await navigation.getByRole('button', { name: 'Publishing & Backup', exact: true }).click();
        await page.getByRole('tab', { name: 'Portable Data', exact: true }).click();
        await expect(page.getByRole('button', { name: /Jozor Full Backup/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Raw Project JSON/i })).toBeVisible();
        await navigation.getByRole('button', { name: 'Privacy', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Collaboration access' })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: 'Privacy Mode' })).toBeVisible();
      } else {
        await expect(navigation.getByRole('button', { name: 'Members', exact: true })).toHaveCount(0);
        await expect(navigation.getByRole('button', { name: 'Privacy', exact: true })).toHaveCount(0);

        await navigation.getByRole('button', { name: 'Publishing & Backup', exact: true }).click();
        await page.getByRole('tab', { name: 'Portable Data', exact: true }).click();
        await expect(page.getByRole('button', { name: /Jozor Full Backup/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Raw Project JSON/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /GEDCOM/i })).toBeVisible();
        await expect(page.getByText(/available only to the tree owner/i)).toBeVisible();

        await page.getByRole('tab', { name: /Cloud Backup/i }).click();
        await expect(page.getByText('Cloud access limited')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Refresh files' })).toHaveCount(0);
        await expect(page.getByRole('textbox', { name: 'File name' })).toHaveCount(0);
      }

      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'The Vault' })).toHaveCount(0);
    }
  });
});

test.describe('mobile shell', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('mobile notifications and preferences stay within the viewport', async ({ page }) => {
    const ownerUser = {
      uid: 'mobile-owner',
      displayName: 'Mobile Owner',
      email: 'mobile-owner@example.com',
      photoURL: '',
    };

    await seedScenario(page, 'owner', ownerUser, 'Mobile Cypress');
    await waitForDebugRole(page, 'owner');

    await page.evaluate(() => {
      (window as DebugWindow).jozorDebug?.seedNotifications([
        {
          type: 'invitation',
          source: 'invitation-realtime',
          title: 'Tree invitation',
          body: 'A collaborator invited you to edit this tree.',
          dedupeKey: 'mobile:test:invitation',
          actionable: true,
          invitationId: 'mobile-inv-1',
          invitationTreeId: 'tree-mobile',
          invitationOwnerUid: 'owner-mobile',
          invitationRole: 'editor',
          invitationStatus: 'pending',
        },
      ]);
    });

    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('jozor_persisted_notifications:mobile-owner');
      return Boolean(raw && raw !== '[]');
    });

    await openNotificationCenter(page);
    await expect(page.getByText('Notification Center')).toBeVisible();
    await expect(page.getByText('Tree invitation', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();

    const notificationHeaderBox = await page
      .getByText('Notification Center')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")]')
      .boundingBox();

    expect(notificationHeaderBox).not.toBeNull();
    expect(notificationHeaderBox!.x).toBeGreaterThanOrEqual(0);
    expect(notificationHeaderBox!.x + notificationHeaderBox!.width).toBeLessThanOrEqual(390);
    expect(notificationHeaderBox!.y + notificationHeaderBox!.height).toBeLessThanOrEqual(844);

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Notification Center')).toHaveCount(0);

    await page.getByRole('navigation', { name: 'Mobile actions' }).getByRole('button', { name: 'Appearance' }).click();
    await expect(page.getByRole('heading', { name: 'Appearance Lab' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Core' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Layout/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Visible Content/i })).toBeVisible();

    const preferencesBox = await page.getByRole('heading', { name: 'Appearance Lab' }).boundingBox();

    expect(preferencesBox).not.toBeNull();
    expect(preferencesBox!.x).toBeGreaterThanOrEqual(0);
    expect(preferencesBox!.x + preferencesBox!.width).toBeLessThanOrEqual(390);
  });

  test('mobile vault remains reachable within the viewport', async ({ page }) => {
    const ownerUser = {
      uid: 'mobile-owner-actions',
      displayName: 'Mobile Owner',
      email: 'mobile-owner@example.com',
      photoURL: '',
    };

    await seedScenario(page, 'owner', ownerUser, 'Mobile Spruce');
    await waitForDebugRole(page, 'owner');

    await openNotificationCenter(page);
    await expect(page.getByText('Notification Center')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Notification Center')).toHaveCount(0);

    await page.getByRole('navigation', { name: 'Mobile actions' }).getByRole('button', { name: 'The Vault' }).click();
    await expect(page.getByRole('heading', { name: 'The Vault' })).toBeVisible();
    const vaultNavigation = page.getByRole('navigation', { name: 'The Vault' });
    await expect(vaultNavigation.getByRole('button', { name: 'Trees', exact: true })).toBeVisible();
    await expect(vaultNavigation.getByRole('button', { name: 'Insights & Tools', exact: true })).toBeVisible();
    await expect(vaultNavigation.getByRole('button', { name: 'Publishing & Backup', exact: true })).toBeVisible();
    await expect(vaultNavigation.getByRole('button', { name: 'Privacy', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Management', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tools', exact: true })).toHaveCount(0);

    const vaultHeadingBox = await page.getByRole('heading', { name: 'The Vault' }).boundingBox();
    expect(vaultHeadingBox).not.toBeNull();
    expect(vaultHeadingBox!.x).toBeGreaterThanOrEqual(0);
    expect(vaultHeadingBox!.x + vaultHeadingBox!.width).toBeLessThanOrEqual(390);

    await vaultNavigation.getByRole('button', { name: 'Insights & Tools', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Explore the tree' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Check and calculate' })).toBeVisible();

    await vaultNavigation.getByRole('button', { name: 'Privacy', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Collaboration access' })).toBeVisible();
    const privacyPanelBox = await page.getByRole('heading', { name: 'Tree Privacy' }).locator('xpath=ancestor::section').boundingBox();
    expect(privacyPanelBox).not.toBeNull();
    expect(privacyPanelBox!.x).toBeGreaterThanOrEqual(0);
    expect(privacyPanelBox!.x + privacyPanelBox!.width).toBeLessThanOrEqual(390);
  });
});











