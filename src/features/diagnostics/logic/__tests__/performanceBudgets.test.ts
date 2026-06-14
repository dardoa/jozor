import { describe, expect, it } from 'vitest';

import {
  evaluatePerformanceBudget,
  getStartupBudgetMetric,
  getWorstPerformanceStatus,
} from '../performanceBudgets';

describe('performance budgets', () => {
  it('classifies higher-is-better FPS values', () => {
    expect(evaluatePerformanceBudget('fps', 60)).toBe('healthy');
    expect(evaluatePerformanceBudget('fps', 40)).toBe('warning');
    expect(evaluatePerformanceBudget('fps', 20)).toBe('critical');
  });

  it('classifies lower-is-better layout values', () => {
    expect(evaluatePerformanceBudget('layout', 200)).toBe('healthy');
    expect(evaluatePerformanceBudget('layout', 600)).toBe('warning');
    expect(evaluatePerformanceBudget('layout', 1_200)).toBe('critical');
  });

  it('returns unknown for unavailable or invalid measurements', () => {
    expect(evaluatePerformanceBudget('domNodes', null)).toBe('unknown');
    expect(evaluatePerformanceBudget('domNodes', Number.NaN)).toBe('unknown');
    expect(evaluatePerformanceBudget('domNodes', -1)).toBe('unknown');
  });

  it('maps measured startup phases to their budgets', () => {
    expect(getStartupBudgetMetric('Profile Fetch')).toBe('profileFetch');
    expect(getStartupBudgetMetric('Memberships Fetch')).toBe('membershipsFetch');
    expect(getStartupBudgetMetric('State Hydration')).toBe('stateHydration');
    expect(getStartupBudgetMetric('Render to Interactive')).toBe('renderInteractive');
    expect(getStartupBudgetMetric('UID Resolved')).toBeNull();
  });

  it('selects the most actionable status for the summary', () => {
    expect(getWorstPerformanceStatus(['healthy', 'warning'])).toBe('warning');
    expect(getWorstPerformanceStatus(['unknown', 'critical', 'healthy'])).toBe('critical');
    expect(getWorstPerformanceStatus(['unknown'])).toBe('unknown');
  });
});
