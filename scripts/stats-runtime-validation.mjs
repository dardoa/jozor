import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const waitForServer = (url, timeoutMs = 45000) =>
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

const outputPath = path.join(process.cwd(), 'output', 'playwright', 'stats-runtime-validation.json');

const summarizeCandidateKpis = (run) =>
  run.cases.map((caseResult) => ({
    caseId: caseResult.caseDefinition.id,
    chartType: caseResult.caseDefinition.chartType,
    focusPersonId: caseResult.caseDefinition.focusPersonId,
    showDeceased: caseResult.caseDefinition.showDeceased,
    generationLimit: caseResult.caseDefinition.generationLimit,
    parity: caseResult.pedigreeFanParity?.isMatch ?? null,
    candidateKpis: {
      totalMembers: {
        canonical: caseResult.canonical.stats.kpis.totalMembers,
        visible: caseResult.visible.stats.kpis.totalMembers,
      },
      generationDepth: {
        canonical: caseResult.canonical.stats.kpis.maxGeneration,
        visible: caseResult.visible.stats.kpis.maxGeneration,
      },
      genderRatio: {
        canonical: caseResult.canonical.stats.kpis.genderRatio,
        visible: caseResult.visible.stats.kpis.genderRatio,
      },
      vitality: {
        canonical: caseResult.canonical.stats.vitality,
        visible: caseResult.visible.stats.vitality,
      },
    },
    issues: caseResult.issues.map((issue) => ({
      metricId: issue.metricId,
      scope: issue.scope,
      classification: issue.classification,
      details: issue.details,
    })),
  }));

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vite = spawn(npmExecutable, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: process.cwd(),
  stdio: 'ignore',
  shell: true,
});

try {
  await waitForServer('http://127.0.0.1:4173');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.jozorDebug !== 'undefined');

  const result = await page.evaluate(async () => {
    window.__JOZOR_FEATURE_FLAGS__ = {
      visibleTreePedigree: true,
      visibleTreeFan: true,
    };

    const stateSnapshot = window.jozorDebug.getStateSnapshot();
    const peopleIds = Object.keys(stateSnapshot.people || {});
    const focusCandidates = [];

    if (stateSnapshot.focusId && stateSnapshot.people?.[stateSnapshot.focusId]) {
      focusCandidates.push(stateSnapshot.focusId);
    }

    for (const personId of peopleIds) {
      if (focusCandidates.includes(personId)) continue;
      focusCandidates.push(personId);
      if (focusCandidates.length >= 3) break;
    }

    const validationRun = await window.jozorDebug.validateVisibleTreeStats({
      chartTypes: ['pedigree', 'fan'],
      focusPersonIds: focusCandidates,
      showDeceasedValues: [true, false],
      generationLimits: [1, 2, 4],
    });

    return {
      generatedAt: new Date().toISOString(),
      stateSummary: {
        focusId: stateSnapshot.focusId,
        peopleCount: peopleIds.length,
        focusCandidates,
      },
      validationRun,
    };
  });

  const summarized = {
    ...result,
    candidateKpiSummary: summarizeCandidateKpis(result.validationRun),
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(summarized, null, 2), 'utf8');

  console.log(JSON.stringify({
    outputPath,
    peopleCount: summarized.stateSummary.peopleCount,
    focusCandidates: summarized.stateSummary.focusCandidates,
    totalCases: summarized.validationRun.summary.totalCases,
    expectedCorrectionCount: summarized.validationRun.summary.expectedCorrectionCount,
    regressionCount: summarized.validationRun.summary.regressionCount,
    undecidedBehaviorDifferenceCount: summarized.validationRun.summary.undecidedBehaviorDifferenceCount,
  }, null, 2));

  await browser.close();
} finally {
  if (!vite.killed) {
    vite.kill();
  }
}
