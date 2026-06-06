import { expect, test, type Page } from '@playwright/test';

type DebugPerson = {
  id: string;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  birthName: string;
  nickName: string;
  suffix: string;
  gender: 'male' | 'female';
  birthDate: string;
  birthPlace: string;
  birthSource: string;
  marriageDate: string;
  marriagePlace: string;
  deathDate: string;
  deathPlace: string;
  deathSource: string;
  burialPlace: string;
  residence: string;
  isDeceased: boolean;
  profession: string;
  company: string;
  interests: string;
  bio: string;
  photoUrl?: string;
  gallery: string[];
  voiceNotes: string[];
  sources: unknown[];
  events: unknown[];
  email: string;
  website: string;
  blog: string;
  address: string;
  parents: string[];
  spouses: string[];
  children: string[];
  partnerDetails: Record<string, unknown>;
  isPrivate: boolean;
};

type DebugWindow = Window & {
  jozorDebug?: {
    clearPersistedScenario?: () => void;
    seedTreeScenario?: (payload: {
      people: Record<string, DebugPerson>;
      focusId: string;
      role: 'owner' | 'editor' | 'viewer';
      treeName?: string;
    }) => void;
    setTreeSettings?: (updates: Record<string, unknown>) => void;
  };
};

const buildPerson = (
  id: string,
  firstName: string,
  gender: 'male' | 'female',
  parents: string[] = [],
): DebugPerson => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Runtime',
  birthName: '',
  nickName: '',
  suffix: '',
  gender,
  birthDate: '',
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
  parents,
  spouses: [],
  children: [],
  partnerDetails: {},
  isPrivate: false,
});

const buildWideTree = () => {
  const people: Record<string, DebugPerson> = {
    root: buildPerson('root', 'Root', 'male'),
  };

  for (let childIndex = 0; childIndex < 10; childIndex += 1) {
    const childId = `child-${childIndex}`;
    people[childId] = buildPerson(
      childId,
      `Child ${childIndex}`,
      childIndex % 2 === 0 ? 'female' : 'male',
      ['root'],
    );
    people.root.children.push(childId);

    for (let grandIndex = 0; grandIndex < 5; grandIndex += 1) {
      const grandchildId = `grandchild-${childIndex}-${grandIndex}`;
      people[grandchildId] = buildPerson(
        grandchildId,
        `Grandchild ${childIndex}-${grandIndex}`,
        grandIndex % 2 === 0 ? 'male' : 'female',
        [childId],
      );
      people[childId].children.push(grandchildId);
    }
  }

  return people;
};

const seedRuntimeScenario = async (page: Page) => {
  const people = buildWideTree();

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const debug = (window as DebugWindow).jozorDebug;
    return typeof debug?.seedTreeScenario === 'function';
  });

  await page.evaluate(() => {
    (window as DebugWindow).jozorDebug?.clearPersistedScenario?.();
  });

  await page.evaluate((scenarioPeople) => {
    const debug = (window as DebugWindow).jozorDebug;
    debug?.seedTreeScenario?.({
      people: scenarioPeople,
      focusId: 'root',
      role: 'owner',
      treeName: 'Render Runtime Cypress',
    });
    debug?.setTreeSettings?.({
      chartType: 'focus',
      generationLimit: 8,
      showPhotos: true,
      privacyMode: false,
    });
  }, people);

  const loader = page.getByTestId('tree-loader');
  if (await loader.count() > 0) {
    await expect(loader).toBeHidden({ timeout: 15000 });
  }

  await expect(page.locator('[data-renderer="v3-family-graph"]')).toBeVisible({ timeout: 15000 });
};

const readRenderMetrics = async (page: Page) =>
  page.evaluate(() => {
    const renderer = document.querySelector('[data-renderer="v3-family-graph"]');
    return {
      hasRenderer: Boolean(renderer),
      treeNodes: renderer?.querySelectorAll('[data-testid="tree-node"]').length ?? 0,
      foreignObjects: renderer?.querySelectorAll('foreignObject').length ?? 0,
      edgePaths: renderer?.querySelectorAll('[data-edge-id]').length ?? 0,
      totalDomNodes: document.querySelectorAll('*').length,
    };
  });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
  });
});

test('V3 renderer exposes runtime DOM metrics and switches to LOD after zooming out', async ({ page }) => {
  await seedRuntimeScenario(page);

  const initialMetrics = await readRenderMetrics(page);
  expect(initialMetrics.hasRenderer).toBe(true);
  expect(initialMetrics.treeNodes).toBeGreaterThan(0);
  expect(initialMetrics.treeNodes).toBeLessThanOrEqual(Object.keys(buildWideTree()).length);

  for (let index = 0; index < 7; index += 1) {
    await page.getByLabel(/Zoom In/i).click();
  }

  await expect.poll(
    async () => {
      const metrics = await readRenderMetrics(page);
      return metrics.foreignObjects;
    },
    { timeout: 5000 },
  ).toBeGreaterThan(0);

  const fullCardMetrics = await readRenderMetrics(page);

  for (let index = 0; index < 9; index += 1) {
    await page.getByLabel(/Zoom Out/i).click();
  }

  await expect.poll(
    async () => {
      const metrics = await readRenderMetrics(page);
      return metrics.foreignObjects;
    },
    { timeout: 5000 },
  ).toBe(0);

  const lodMetrics = await readRenderMetrics(page);
  expect(lodMetrics.treeNodes).toBeGreaterThan(0);
  expect(lodMetrics.totalDomNodes).toBeLessThan(fullCardMetrics.totalDomNodes);
});
