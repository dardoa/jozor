import { expect, type Page } from '@playwright/test';

export type DebugRole = 'owner' | 'viewer' | 'editor';

export type AppSnapshot = {
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

export type DebugWindow = Window & {
  jozorDebug?: {
    getStateSnapshot: () => AppSnapshot;
    seedTreeScenario: (payload: Record<string, unknown>) => void;
    setRole: (role: DebugRole) => void;
    clearPersistedScenario: () => void;
    setScenarioAccess: (payload: Record<string, unknown>) => void;
    setSyncStatus: (payload: Record<string, unknown>) => void;
    setInvitationTelemetry: (payload: Record<string, unknown>) => void;
    openDiagnostics: () => void;
  };
};

export async function prepareFreshSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('lastActiveTreeId');
    sessionStorage.removeItem('jozor:e2e-scenario');
  });
}

export async function createFreshTree(page: Page): Promise<void> {
  await expect(page.getByText(/Manage Trees/i)).toBeVisible();

  const createButton = page.getByRole('button', { name: /^Add$/i }).first();
  await expect(createButton).toBeVisible();
  await createButton.click();

  await page.waitForFunction(() => {
    const debug = (window as DebugWindow).jozorDebug;
    return typeof debug?.getStateSnapshot === 'function' && !!debug.getStateSnapshot()?.treeId;
  });
}

export async function getStateSnapshot(page: Page): Promise<AppSnapshot> {
  await page.waitForFunction(
    () => typeof (window as DebugWindow).jozorDebug?.getStateSnapshot === 'function'
  );
  return page.evaluate(() => (window as DebugWindow).jozorDebug!.getStateSnapshot());
}

export async function openHeaderSettingsMenu(page: Page): Promise<void> {
  const trigger = page.locator('header button:has(svg.lucide-settings)').first();
  await expect(trigger).toBeVisible();
  await trigger.click();
}

export async function inviteCollaborator(
  page: Page,
  params: { treeId: string; ownerUid: string; email: string; role: 'viewer' | 'editor' }
): Promise<void> {
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

export async function updateCollaboratorRole(
  page: Page,
  params: { treeId: string; ownerUid: string; email: string; role: 'viewer' | 'editor' }
): Promise<void> {
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

export async function openAddRelativeMenu(page: Page): Promise<void> {
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

export async function closeContextMenu(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: 'Add Relative' })).toHaveCount(0);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
