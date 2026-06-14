export type PerformanceBudgetStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export type PerformanceBudgetMetric =
  | 'fps'
  | 'domNodes'
  | 'layout'
  | 'profileFetch'
  | 'membershipsFetch'
  | 'stateHydration'
  | 'renderInteractive';

interface PerformanceBudget {
  direction: 'higher' | 'lower';
  healthy: number;
  warning: number;
}

export const PERFORMANCE_BUDGETS: Record<PerformanceBudgetMetric, PerformanceBudget> = {
  fps: { direction: 'higher', healthy: 55, warning: 30 },
  domNodes: { direction: 'lower', healthy: 2_500, warning: 5_000 },
  layout: { direction: 'lower', healthy: 250, warning: 1_000 },
  profileFetch: { direction: 'lower', healthy: 1_000, warning: 3_000 },
  membershipsFetch: { direction: 'lower', healthy: 1_500, warning: 4_000 },
  stateHydration: { direction: 'lower', healthy: 1_000, warning: 3_000 },
  renderInteractive: { direction: 'lower', healthy: 250, warning: 1_000 },
};

export const evaluatePerformanceBudget = (
  metric: PerformanceBudgetMetric,
  value: number | null | undefined,
): PerformanceBudgetStatus => {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return 'unknown';
  }

  const budget = PERFORMANCE_BUDGETS[metric];
  if (budget.direction === 'higher') {
    if (value >= budget.healthy) return 'healthy';
    if (value >= budget.warning) return 'warning';
    return 'critical';
  }

  if (value <= budget.healthy) return 'healthy';
  if (value <= budget.warning) return 'warning';
  return 'critical';
};

export const getStartupBudgetMetric = (
  stepName: string,
): PerformanceBudgetMetric | null => {
  switch (stepName) {
    case 'Profile Fetch':
      return 'profileFetch';
    case 'Memberships Fetch':
      return 'membershipsFetch';
    case 'State Hydration':
      return 'stateHydration';
    case 'Render to Interactive':
      return 'renderInteractive';
    default:
      return null;
  }
};

export const getWorstPerformanceStatus = (
  statuses: PerformanceBudgetStatus[],
): PerformanceBudgetStatus => {
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  if (statuses.includes('healthy')) return 'healthy';
  return 'unknown';
};
