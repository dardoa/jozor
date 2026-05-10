import type { Person } from '../types';
import { StatsEngine, type StatsData } from './StatsEngine';

export interface CanonicalTreeAnalyticsResult {
  scope: 'canonical-tree';
  stats: StatsData;
}

export const calculateCanonicalTreeAnalytics = (
  people: Record<string, Person>,
  validationErrors: Record<string, string[]> = {}
): CanonicalTreeAnalyticsResult => ({
  scope: 'canonical-tree',
  stats: StatsEngine.calculate(people, validationErrors),
});
