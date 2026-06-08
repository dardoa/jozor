import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:4173';
const outputPath = path.join(process.cwd(), 'output', 'playwright', 'render-performance-probe.json');
const scenarioSizes = [100, 300, 500, 1000];

const waitForServer = (url, timeoutMs = 60000) =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const poll = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(poll, 1000);
      });
    };

    poll();
  });

const makePerson = (id, firstName, gender = 'male', parents = []) => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Perf',
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

const buildTree = (targetCount) => {
  const people = {
    root: makePerson('root', 'Root'),
  };
  let nextId = 1;
  const parentCount = Math.min(32, Math.max(8, Math.ceil(Math.sqrt(targetCount))));
  const parentIds = [];

  for (let index = 0; index < parentCount && Object.keys(people).length < targetCount; index += 1) {
    const childId = `person-${nextId}`;
    nextId += 1;
    people[childId] = makePerson(
      childId,
      `Person ${nextId}`,
      nextId % 2 === 0 ? 'female' : 'male',
      ['root'],
    );
    people.root.children.push(childId);
    parentIds.push(childId);
  }

  let parentCursor = 0;
  while (Object.keys(people).length < targetCount) {
    const parentId = parentIds[parentCursor % parentIds.length];
    parentCursor += 1;
    const childId = `person-${nextId}`;
    nextId += 1;
    people[childId] = makePerson(
      childId,
      `Person ${nextId}`,
      nextId % 2 === 0 ? 'female' : 'male',
      [parentId],
    );
    people[parentId].children.push(childId);
  }

  return people;
};

const waitForRenderer = async (page) => {
  await page.waitForSelector('[data-renderer="v3-family-graph"]', { timeout: 20000 });
  await page.waitForFunction(() => Boolean(window.__JOZOR_V3_RENDER_STATS__), undefined, { timeout: 20000 });
};

const settle = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

const captureMetrics = async (page, label) =>
  page.evaluate((label) => {
    const renderer = document.querySelector('[data-renderer="v3-family-graph"]');
    const stats = window.__JOZOR_V3_RENDER_STATS__ ?? null;
    const renderMetrics = {
      label,
      stats,
      dom: {
        treeNodes: renderer?.querySelectorAll('[data-testid="tree-node"]').length ?? 0,
        foreignObjects: renderer?.querySelectorAll('foreignObject').length ?? 0,
        edgePaths: renderer?.querySelectorAll('[data-edge-id]').length ?? 0,
        rendererElements: renderer?.querySelectorAll('*').length ?? 0,
        totalDomNodes: document.querySelectorAll('*').length,
      },
    };
    return renderMetrics;
  }, label);

const summarizeScenario = (scenario) => {
  const maxDomNodes = Math.max(...scenario.samples.map((sample) => sample.dom.totalDomNodes));
  const maxRendererElements = Math.max(...scenario.samples.map((sample) => sample.dom.rendererElements));
  const maxForeignObjects = Math.max(...scenario.samples.map((sample) => sample.dom.foreignObjects));
  const farZoomSample = scenario.samples.find((sample) => sample.label === 'zoom-out-lod') ?? null;
  const closeZoomSample = scenario.samples.find((sample) => sample.label === 'zoom-in-close') ?? null;

  return {
    requestedSize: scenario.requestedSize,
    actualPeopleCount: scenario.actualPeopleCount,
    maxDomNodes,
    maxRendererElements,
    maxForeignObjects,
    approxAvgFps: scenario.interactionFps.approxAvgFps,
    approxP95Fps: scenario.interactionFps.approxP95Fps,
    closeZoomUsesFullCards: Boolean(closeZoomSample && closeZoomSample.dom.foreignObjects > 0),
    farZoomUsesLightweightLod: Boolean(
      farZoomSample &&
      farZoomSample.dom.treeNodes > 0 &&
      farZoomSample.dom.foreignObjects === 0
    ),
    farZoomForeignObjects: farZoomSample?.dom.foreignObjects ?? 0,
    farZoomTreeNodes: farZoomSample?.dom.treeNodes ?? 0,
    farZoomScale: farZoomSample?.stats?.zoomScale ?? null,
  };
};

const zoomCanvas = async (page, direction, count) => {
  const box = await page.locator('#family-tree-canvas').boundingBox();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const deltaY = direction === 'in' ? -360 : 360;

  for (let index = 0; index < count; index += 1) {
    await page.mouse.wheel(0, deltaY);
    await settle(120);
  }
};

const sampleInteractionFps = async (page) => {
  const samplePromise = page.evaluate(
    () =>
      new Promise((resolve) => {
        const frameTimes = [];
        let last = performance.now();
        const startedAt = last;

        const tick = (now) => {
          frameTimes.push(now - last);
          last = now;
          if (now - startedAt >= 1200) {
            const sorted = [...frameTimes].sort((left, right) => left - right);
            const avgFrameMs = frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length;
            const p95FrameMs = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
            resolve({
              frames: frameTimes.length,
              avgFrameMs: Number(avgFrameMs.toFixed(2)),
              p95FrameMs: Number(p95FrameMs.toFixed(2)),
              approxAvgFps: Number((1000 / avgFrameMs).toFixed(1)),
              approxP95Fps: p95FrameMs > 0 ? Number((1000 / p95FrameMs).toFixed(1)) : 0,
            });
            return;
          }
          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      }),
  );

  const box = await page.locator('#family-tree-canvas').boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let index = 0; index < 12; index += 1) {
      await page.mouse.move(x + 24 * index, y + 10 * Math.sin(index), { steps: 2 });
    }
    await page.mouse.up();
  }

  return samplePromise;
};

const runScenario = async (page, size) => {
  const people = buildTree(size);

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.jozorDebug !== 'undefined', undefined, { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('jozor.renderDiagnostics', '0');
    window.jozorDebug?.clearPersistedScenario?.();
  });
  await page.evaluate((people) => {
    window.jozorDebug.seedTreeScenario({
      people,
      focusId: 'root',
      role: 'owner',
      treeName: `Render Performance ${Object.keys(people).length}`,
    });
    window.jozorDebug.setTreeSettings({
      chartType: 'focus',
      generationLimit: 12,
      showPhotos: true,
      privacyMode: false,
      isCompact: false,
    });
  }, people);

  await waitForRenderer(page);
  await settle(600);

  const initial = await captureMetrics(page, 'initial-fit');
  await zoomCanvas(page, 'in', 4);
  const zoomIn = await captureMetrics(page, 'zoom-in-close');
  const interactionFps = await sampleInteractionFps(page);
  await settle(500);
  const afterPan = await captureMetrics(page, 'after-pan');
  await zoomCanvas(page, 'out', 8);
  const zoomOut = await captureMetrics(page, 'zoom-out-lod');

  return {
    requestedSize: size,
    actualPeopleCount: Object.keys(people).length,
    samples: [initial, zoomIn, afterPan, zoomOut],
    interactionFps,
  };
};

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vite = spawn(npmExecutable, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: process.cwd(),
  stdio: 'ignore',
  shell: true,
});

try {
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const scenarios = [];

  for (const size of scenarioSizes) {
    scenarios.push(await runScenario(page, size));
  }

  await browser.close();

  const result = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    viewport: { width: 1440, height: 900 },
    summary: scenarios.map(summarizeScenario),
    scenarios,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (!vite.killed) {
    vite.kill();
  }
}
