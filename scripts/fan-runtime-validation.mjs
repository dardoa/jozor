import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:4173';
const outputPath = path.join(process.cwd(), 'output', 'playwright', 'fan-visible-tree-runtime-validation.json');

const makePerson = (id, overrides = {}) => ({
  id,
  title: '',
  firstName: id,
  middleName: '',
  lastName: 'Person',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
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
  children: [],
  ...overrides,
});

const scenarios = {
  focus_no_parents: {
    people: {
      solo: makePerson('solo'),
    },
    focusId: 'solo',
    generationLimit: 4,
    showDeceased: true,
  },
  one_parent: {
    people: {
      child: makePerson('child', { parents: ['parent-a'] }),
      'parent-a': makePerson('parent-a', { gender: 'male', children: ['child'] }),
    },
    focusId: 'child',
    generationLimit: 4,
    showDeceased: true,
  },
  two_parents: {
    people: {
      child: makePerson('child', { parents: ['father', 'mother'] }),
      father: makePerson('father', { gender: 'male', children: ['child'] }),
      mother: makePerson('mother', { gender: 'female', children: ['child'] }),
    },
    focusId: 'child',
    generationLimit: 4,
    showDeceased: true,
  },
  missing_gender_parent: {
    people: {
      child: makePerson('child', { parents: ['parent-a'] }),
      'parent-a': makePerson('parent-a', { gender: '', children: ['child'] }),
    },
    focusId: 'child',
    generationLimit: 4,
    showDeceased: true,
  },
  deceased_focus: {
    people: {
      focus: makePerson('focus', { isDeceased: true, parents: ['father'] }),
      father: makePerson('father', { gender: 'male', children: ['focus'] }),
    },
    focusId: 'focus',
    generationLimit: 4,
    showDeceased: false,
  },
  deceased_ancestors: {
    people: {
      child: makePerson('child', { parents: ['father', 'mother'] }),
      father: makePerson('father', { gender: 'male', isDeceased: true, children: ['child'] }),
      mother: makePerson('mother', { gender: 'female', children: ['child'] }),
    },
    focusId: 'child',
    generationLimit: 4,
    showDeceased: false,
  },
  generation_limit: {
    people: {
      child: makePerson('child', { parents: ['parent'] }),
      parent: makePerson('parent', { parents: ['grandparent'], children: ['child'] }),
      grandparent: makePerson('grandparent', { children: ['parent'] }),
    },
    focusId: 'child',
    generationLimit: 2,
    showDeceased: true,
  },
  focus_switching: {
    people: {
      child: makePerson('child', { parents: ['parent'] }),
      parent: makePerson('parent', { children: ['child'] }),
    },
    focusId: 'child',
    alternateFocusId: 'parent',
    generationLimit: 4,
    showDeceased: true,
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForLayoutSnapshot = async (page, predicate, timeoutMs = 5000) => {
  await page.waitForFunction(predicate, undefined, { timeout: timeoutMs });
};

const waitForFanLayout = async (page, { focusId, minimumFanArcs = 1, timeoutMs = 5000 }) => {
  await page.waitForFunction(
    ({ focusId, minimumFanArcs }) => {
      const snapshot = window.__JOZOR_LAYOUT_DEBUG__;
      return Boolean(
        snapshot &&
          snapshot.chartType === 'fan' &&
          snapshot.focusId === focusId &&
          snapshot.hasReceivedLayout === true &&
          snapshot.isLoading === false &&
          (snapshot.fanArcCount ?? 0) >= minimumFanArcs
      );
    },
    { focusId, minimumFanArcs },
    { timeout: timeoutMs }
  );
};

const knownExpectedIssues = [
  {
    kind: 'extra_in_new',
    personId: 'focus',
    classification: 'expected_correction',
    label: 'deceased-focus-visible',
  },
  {
    kind: 'extra_in_new',
    personId: 'parent-a',
    classification: 'expected_correction',
    label: 'missing-gender-parent-fallback',
  },
  {
    kind: 'filtered_mismatch',
    classification: 'expected_correction',
    label: 'legacy-filtered-vs-visible-tree-filtered',
  },
];

const classifyRuntime = ({ flagOn, layoutSnapshot, validation }) => {
  const expectedNodes = flagOn
    ? validation.cases[0]?.report.newSnapshot.visibleNodeIds.length ?? 0
    : validation.cases[0]?.report.oldSnapshot.visibleNodeIds.length ?? 0;

  const issues = [];

  if ((layoutSnapshot?.fanArcCount ?? 0) !== expectedNodes) {
    issues.push({
      category: flagOn ? 'worker-path mismatch' : 'rendering mismatch',
      details: `fanArcCount=${layoutSnapshot?.fanArcCount ?? 'n/a'} expectedNodes=${expectedNodes}`,
    });
  }

  if ((layoutSnapshot?.chartType ?? 'unknown') !== 'fan') {
    issues.push({
      category: 'rendering mismatch',
      details: `layoutSnapshot.chartType=${layoutSnapshot?.chartType ?? 'n/a'} expected fan`,
    });
  }

  if (layoutSnapshot?.isLoading) {
    issues.push({
      category: 'rendering mismatch',
      details: 'layout snapshot was still loading when captured',
    });
  }

  if (!validation.cases[0]?.parity.isMatch) {
    issues.push({
      category: 'regression',
      details: 'Pedigree/fan ancestry parity failed in the VisibleTree semantic validator.',
    });
  }

  return {
    expectedNodes,
    issues,
  };
};

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.jozorDebug !== 'undefined');

  const results = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    scenarios: {},
    modeSwitching: null,
    summary: {
      off: { pass: 0, warn: 0, fail: 0 },
      on: { pass: 0, warn: 0, fail: 0 },
      runtimeIssues: [],
    },
  };

  for (const [scenarioName, scenario] of Object.entries(scenarios)) {
    results.scenarios[scenarioName] = {};

    for (const flagOn of [false, true]) {
      await page.evaluate(
        async ({ scenario, flagOn }) => {
          window.__JOZOR_FEATURE_FLAGS__ = {
            visibleTreePedigree: true,
            visibleTreeFan: flagOn,
          };
          window.jozorDebug.seedTreeScenario({
            people: scenario.people,
            focusId: scenario.focusId,
            role: 'owner',
          });
          window.jozorDebug.setTreeSettings({
            chartType: 'fan',
            showDeceased: scenario.showDeceased,
            generationLimit: scenario.generationLimit,
          });
          if (scenario.focusId) {
            window.jozorDebug.setFocusPerson(scenario.focusId);
          }
        },
        { scenario, flagOn }
      );

      const expectedMinimumFanArcs = scenarioName === 'focus_no_parents'
        ? 1
        : scenarioName === 'deceased_focus' && !flagOn
          ? 0
          : 1;

      await waitForFanLayout(page, {
        focusId: scenario.focusId,
        minimumFanArcs: expectedMinimumFanArcs,
      });
      await sleep(150);

      const validation = await page.evaluate(
        async ({ scenario }) =>
          window.jozorDebug.validateVisibleTreeFan({
            focusPersonIds: [scenario.focusId],
            showDeceasedValues: [scenario.showDeceased],
            generationLimits: [scenario.generationLimit],
            knownExpectedIssues,
          }),
        { scenario }
      );

      const layoutSnapshot = await page.evaluate(async () => window.jozorDebug.getLayoutSnapshot());
      const probe = await page.evaluate(async () => window.jozorDebug.probeFanRuntime());

      const runtimeAssessment = classifyRuntime({ flagOn, layoutSnapshot, validation });

      const modeKey = flagOn ? 'on' : 'off';
      results.scenarios[scenarioName][modeKey] = {
        flagOn,
        layoutSnapshot,
        probe,
        validation,
        runtimeAssessment,
      };

      const topStatus = validation.summary.failCount > 0 ? 'fail' : validation.summary.warnCount > 0 ? 'warn' : 'pass';
      results.summary[modeKey][topStatus] += 1;
      for (const issue of runtimeAssessment.issues) {
        results.summary.runtimeIssues.push({
          scenario: scenarioName,
          flagOn,
          ...issue,
        });
      }

      if (scenarioName === 'focus_switching' && scenario.alternateFocusId) {
        await page.evaluate(
          async ({ alternateFocusId }) => {
            window.jozorDebug.setFocusPerson(alternateFocusId);
          },
          { alternateFocusId: scenario.alternateFocusId }
        );
        await waitForFanLayout(page, {
          focusId: scenario.alternateFocusId,
          minimumFanArcs: 1,
        });
        await sleep(150);
        results.scenarios[scenarioName][modeKey].afterFocusSwitch = {
          layoutSnapshot: await page.evaluate(async () => window.jozorDebug.getLayoutSnapshot()),
          probe: await page.evaluate(async () => window.jozorDebug.probeFanRuntime()),
          stateSnapshot: await page.evaluate(async () => window.jozorDebug.getStateSnapshot()),
        };
      }
    }
  }

  await page.evaluate(() => {
    window.__JOZOR_FEATURE_FLAGS__ = {
      visibleTreePedigree: true,
      visibleTreeFan: true,
    };
    window.jozorDebug.seedTreeScenario({
      people: {
        child: {
          id: 'child', title: '', firstName: 'child', middleName: '', lastName: 'Person', birthName: '', nickName: '', suffix: '',
          gender: 'male', birthDate: '', birthPlace: '', birthSource: '', marriageDate: '', marriagePlace: '',
          deathDate: '', deathPlace: '', deathSource: '', burialPlace: '', residence: '', isDeceased: false,
          profession: '', company: '', interests: '', bio: '', gallery: [], voiceNotes: [], sources: [], events: [],
          email: '', website: '', blog: '', address: '', parents: ['father', 'mother'], spouses: [], children: []
        },
        father: {
          id: 'father', title: '', firstName: 'father', middleName: '', lastName: 'Person', birthName: '', nickName: '', suffix: '',
          gender: 'male', birthDate: '', birthPlace: '', birthSource: '', marriageDate: '', marriagePlace: '',
          deathDate: '', deathPlace: '', deathSource: '', burialPlace: '', residence: '', isDeceased: false,
          profession: '', company: '', interests: '', bio: '', gallery: [], voiceNotes: [], sources: [], events: [],
          email: '', website: '', blog: '', address: '', parents: [], spouses: [], children: ['child']
        },
        mother: {
          id: 'mother', title: '', firstName: 'mother', middleName: '', lastName: 'Person', birthName: '', nickName: '', suffix: '',
          gender: 'female', birthDate: '', birthPlace: '', birthSource: '', marriageDate: '', marriagePlace: '',
          deathDate: '', deathPlace: '', deathSource: '', burialPlace: '', residence: '', isDeceased: false,
          profession: '', company: '', interests: '', bio: '', gallery: [], voiceNotes: [], sources: [], events: [],
          email: '', website: '', blog: '', address: '', parents: [], spouses: [], children: ['child']
        },
      },
      focusId: 'child',
      role: 'owner',
    });
    window.jozorDebug.setTreeSettings({ chartType: 'pedigree', showDeceased: true, generationLimit: 4 });
  });
  await waitForLayoutSnapshot(
    page,
    () => {
      const snapshot = window.__JOZOR_LAYOUT_DEBUG__;
      return snapshot?.chartType === 'pedigree' && snapshot?.isLoading === false;
    }
  );
  await sleep(150);
  const pedigreeSnapshot = await page.evaluate(async () => window.jozorDebug.getLayoutSnapshot());
  await page.evaluate(() => window.jozorDebug.setTreeSettings({ chartType: 'fan', showDeceased: true, generationLimit: 4 }));
  await waitForFanLayout(page, {
    focusId: 'child',
    minimumFanArcs: 1,
  });
  await sleep(150);
  const fanSnapshot = await page.evaluate(async () => window.jozorDebug.getLayoutSnapshot());
  results.modeSwitching = { pedigreeSnapshot, fanSnapshot };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
};

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
