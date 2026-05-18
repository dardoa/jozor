
import { describe, expect, it } from 'vitest';
import { buildStatisticsDashboardDisplayStats } from '../components/StatisticsDashboard';
import type { StatsData } from '../../../services/StatsEngine';

const canonicalStats: StatsData = {
  kpis: {
    totalMembers: 12,
    maxGeneration: 5,
    genderRatio: { male: 7, female: 4, other: 1 },
    averageLifespan: 72,
    healthScore: 88,
  },
  records: {
    oldestPerson: { name: 'Old Root', age: 91 },
    mostChildren: { name: 'Big Family', count: 6 },
  },
  demographics: [{ decade: '1950s', count: 2 }],
  vitality: [
    { status: 'Living', count: 9, color: '#E1AD01' },
    { status: 'Deceased', count: 3, color: '#002366' },
  ],
  surnames: [{ text: 'Smith', value: 4 }],
  topNames: {
    male: [{ name: 'John', count: 3 }],
    female: [{ name: 'Mary', count: 2 }],
  },
  topPlaces: [{ name: 'Riyadh', count: 2 }],
  ageDistribution: [{ range: '40-59', count: 4 }],
  upcomingBirthdays: [],
};

const visibleStats: StatsData = {
  ...canonicalStats,
  kpis: {
    ...canonicalStats.kpis,
    totalMembers: 4,
    maxGeneration: 2,
    genderRatio: { male: 2, female: 2, other: 0 },
  },
  vitality: [
    { status: 'Living', count: 3, color: '#E1AD01' },
    { status: 'Deceased', count: 1, color: '#002366' },
  ],
};

describe('buildStatisticsDashboardDisplayStats', () => {
  it('uses canonical values when the flag is off', () => {
    const result = buildStatisticsDashboardDisplayStats(canonicalStats, visibleStats, false);

    expect(result).toEqual(canonicalStats);
  });

  it('uses visible values for the approved visible-view KPIs when the flag is on', () => {
    const result = buildStatisticsDashboardDisplayStats(canonicalStats, visibleStats, true);

    expect(result.kpis.totalMembers).toBe(4);
    expect(result.kpis.maxGeneration).toBe(2);
    expect(result.kpis.genderRatio).toEqual(visibleStats.kpis.genderRatio);
    expect(result.vitality).toEqual(visibleStats.vitality);
  });

  it('keeps other dashboard metrics canonical when the flag is on', () => {
    const result = buildStatisticsDashboardDisplayStats(canonicalStats, visibleStats, true);

    expect(result.kpis.averageLifespan).toBe(canonicalStats.kpis.averageLifespan);
    expect(result.kpis.healthScore).toBe(canonicalStats.kpis.healthScore);
    expect(result.records).toEqual(canonicalStats.records);
    expect(result.demographics).toEqual(canonicalStats.demographics);
    expect(result.surnames).toEqual(canonicalStats.surnames);
    expect(result.topNames).toEqual(canonicalStats.topNames);
    expect(result.topPlaces).toEqual(canonicalStats.topPlaces);
    expect(result.ageDistribution).toEqual(canonicalStats.ageDistribution);
    expect(result.upcomingBirthdays).toEqual(canonicalStats.upcomingBirthdays);
  });

  it('falls back to canonical values when visible stats are unavailable', () => {
    const result = buildStatisticsDashboardDisplayStats(canonicalStats, null, true);

    expect(result).toEqual(canonicalStats);
  });
});
