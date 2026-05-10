import { expect, test, type Page } from '@playwright/test';

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

const openAddRelativeMenu = async (page: Page) => {
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
  await page.getByRole('menuitem', { name: /Add Relative/i }).click();
};

const closeContextMenu = async (page: Page) => {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: /Add Relative/i })).toHaveCount(0);
};

const waitForDebugRole = async (page: Page, role: DebugRole) => {
  await page.waitForFunction((expectedRole) => {
    const snapshot = (window as DebugWindow).jozorDebug?.getStateSnapshot?.();
    return snapshot?.role === expectedRole;
  }, role);
};

const openHeaderTreeMenu = async (page: Page) => {
  const trigger = page.getByTestId('tree-menu-trigger').first();
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.click();
};

const openDiagnosticsDrawer = async (page: Page) => {
  await openHeaderTreeMenu(page);
  await page.getByRole('menuitem', { name: /Diagnostics/i }).click();
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
  
  await expect(page.getByRole('menuitem', { name: /Add Relative/i })).toHaveCount(0);
});

test('editor can open a tree and add relatives from node context menu', async ({ page }) => {
  await seedScenario(page, 'editor');
  await waitForDebugRole(page, 'editor');
  await openAddRelativeMenu(page);

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
  await expect(page.getByRole('menuitem', { name: /Add Relative/i })).toHaveCount(0);
  await closeContextMenu(page);

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.setRole('editor');
  });

  await waitForDebugRole(page, 'editor');
  await openAddRelativeMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Add Father' })).toBeEnabled();
});

test('editor edits a person and the value persists after reload', async ({ page }) => {
  await seedScenario(page, 'editor');
  await waitForDebugRole(page, 'editor');
  
  const editDetailsBtn = page.getByLabel('Edit Details').first();
  await expect(editDetailsBtn).toBeVisible({ timeout: 10000 });
  await editDetailsBtn.click();

  const firstNameInput = page.locator('aside input[type="text"]').first();
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

test('owner can open header settings menu entries for share and admin hub', async ({ page }) => {
  const ownerUser = {
    uid: 'owner-user',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser);
  await waitForDebugRole(page, 'owner');

  await openHeaderTreeMenu(page);
  await expect(page.getByRole('menuitem', { name: /Share Tree/i })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Admin Hub/i })).toBeVisible();
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

test('shared tree access changes from owner to viewer to editor and editor changes persist after reload', async ({ page }) => {
  test.slow();
  const sharedTreeName = 'Collaborative Cedar';
  const ownerUser = {
    uid: 'owner-user',
    displayName: 'Owner User',
    email: 'owner@example.com',
    photoURL: '',
  };
  const collaboratorUser = {
    uid: 'collab-user',
    displayName: 'Collaborator User',
    email: 'collab@example.com',
    photoURL: '',
  };

  await seedScenario(page, 'owner', ownerUser, sharedTreeName);
  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.persistCurrentScenario?.();
  });

  await page.evaluate((user) => {
    (window as DebugWindow).jozorDebug?.setScenarioAccess({ role: 'viewer', user });
  }, collaboratorUser);

  await waitForDebugRole(page, 'viewer');
  await expect(page.getByText(`Tree: ${sharedTreeName}`)).toBeVisible();
  
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
  await expect(page.getByRole('menuitem', { name: /Add Relative/i })).toHaveCount(0);
  await closeContextMenu(page);

  await page.evaluate((user) => {
    (window as DebugWindow).jozorDebug?.setScenarioAccess({ role: 'editor', user });
  }, collaboratorUser);

  await waitForDebugRole(page, 'editor');
  await expect(page.getByText(`Tree: ${sharedTreeName}`)).toBeVisible();
  
  const editDetailsBtn = page.getByLabel('Edit Details').first();
  await expect(editDetailsBtn).toBeVisible({ timeout: 10000 });
  await editDetailsBtn.click();

  const firstNameInput = page.locator('aside input[type="text"]').first();
  await expect(firstNameInput).toBeVisible();
  await firstNameInput.fill('Collaborative Root');
  await firstNameInput.blur();

  await page.getByLabel('Done (Finish Editing)').click();
  await expect(page.getByRole('heading', { name: /Collaborative Root Person|Collaborative RootPerson/i }).first()).toBeVisible();
  
  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.persistCurrentScenario?.();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Collaborative Root Person|Collaborative RootPerson/i }).first()).toBeVisible();
  await expect(page.getByText(`Tree: ${sharedTreeName}`)).toBeVisible();

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.clearPersistedScenario?.();
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

    await page.getByTestId('notification-bell-trigger').click();
    await expect(page.getByText('Notification Center')).toHaveCount(0);

    await page.getByRole('button', { name: /Advanced Layout Settings|Preferences/i }).click();
    await expect(page.getByRole('tab', { name: 'Layout' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Visibility' })).toBeVisible();

    const preferencesPanel = page.locator('.ds-drawer-shell').last();
    const preferencesBox = await preferencesPanel.boundingBox();

    expect(preferencesBox).not.toBeNull();
    expect(preferencesBox!.x).toBeGreaterThanOrEqual(0);
    expect(preferencesBox!.x + preferencesBox!.width).toBeLessThanOrEqual(390);
  });

  test('mobile desktop menus remain reachable within the viewport', async ({ page }) => {
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
    await page.getByTestId('notification-bell-trigger').click();
    await expect(page.getByText('Notification Center')).toHaveCount(0);

    await page.getByRole('navigation', { name: 'Mobile actions' }).getByRole('button', { name: 'Tree' }).click();
    await expect(page.getByRole('heading', { name: 'Tree', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Admin Hub/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Diagnostics/i })).toBeVisible();

    const treeSheet = page.locator('.ds-drawer-shell').last();
    const treeSheetBox = await treeSheet.boundingBox();
    expect(treeSheetBox).not.toBeNull();
    expect(treeSheetBox!.x).toBeGreaterThanOrEqual(0);
    expect(treeSheetBox!.x + treeSheetBox!.width).toBeLessThanOrEqual(390);

    await page.getByRole('button', { name: /Admin Hub/i }).click();
    await expect(page.getByRole('heading', { name: 'Admin Hub' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Admin Hub' })).toHaveCount(0);

    await page.getByRole('navigation', { name: 'Mobile actions' }).getByRole('button', { name: 'Account' }).click();
    await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Global Settings/i })).toBeVisible();

    const accountSheet = page.locator('.ds-drawer-shell').last();
    const accountSheetBox = await accountSheet.boundingBox();
    expect(accountSheetBox).not.toBeNull();
    expect(accountSheetBox!.x).toBeGreaterThanOrEqual(0);
    expect(accountSheetBox!.x + accountSheetBox!.width).toBeLessThanOrEqual(390);

    await page.getByRole('button', { name: /Global Settings/i }).click();
    await expect(page.getByRole('heading', { name: 'Global Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Security' })).toBeVisible();

    const accountHeadingBox = await page.getByRole('heading', { name: 'Global Settings' }).boundingBox();
    expect(accountHeadingBox).not.toBeNull();
    expect(accountHeadingBox!.x).toBeGreaterThanOrEqual(0);
    expect(accountHeadingBox!.x + accountHeadingBox!.width).toBeLessThanOrEqual(390);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Global Settings' })).toHaveCount(0);

    await page.getByRole('navigation', { name: 'Mobile actions' }).getByRole('button', { name: 'Tools' }).click();
    await expect(page.getByRole('heading', { name: 'Tools' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Save As' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Print' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Jozor Archive/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible();

    const toolsDrawerBox = await page.locator('.ds-drawer-shell').last().boundingBox();
    expect(toolsDrawerBox).not.toBeNull();
    expect(toolsDrawerBox!.x).toBeGreaterThanOrEqual(0);
    expect(toolsDrawerBox!.x + toolsDrawerBox!.width).toBeLessThanOrEqual(390);
  });
});











