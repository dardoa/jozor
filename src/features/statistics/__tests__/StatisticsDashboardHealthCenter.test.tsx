import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../../constants';
import type { Person } from '../../../types';
import { StatisticsDashboard } from '../components/StatisticsDashboard';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      close: 'Close',
      consistencyChecker: 'Consistency Checker',
      untitledTree: 'Untitled Tree',
      noIssuesFound: 'No issues found',
      issuesFound: 'Issues found',
      oldestMember: 'Oldest member',
      mostChildren: 'Most children',
      topPlaces: 'Top places',
      statistics: {
        title: 'Statistics',
        total: 'Total',
        depth: 'Depth',
        health: 'Health',
        issues: 'Issues',
        places: 'Places',
        birthdays: 'Birthdays',
        topNames: 'Top names',
        dataHealth: 'Data health',
        noDataAvailable: 'No data',
        noUpcomingBirthdays: 'No birthdays',
        visualSummary: 'Visual summary',
        genderDistribution: 'Gender distribution',
        status: 'Status',
        male: 'Male',
        female: 'Female',
        unknown: 'Unknown',
        living: 'Living',
        deceased: 'Deceased',
        snapshot: 'Snapshot',
        currentTree: 'Current tree',
        coreRecords: 'Core records',
        members: 'Members',
        topMaleNames: 'Top male names',
        topFemaleNames: 'Top female names',
        turnsAgeOn: 'Turns {age} on {date}',
        today: 'Today',
        days: 'days',
        healthCenter: {
          all: 'All',
          healthScore: 'Health Score',
          completeness: 'Completeness',
          citationCoverage: 'Citation Coverage',
          structural: 'Structural',
          timeline: 'Timeline',
          duplicates: 'Duplicates',
          citations: 'Citations',
          error: 'Error',
          warning: 'Warning',
          info: 'Info',
          allClearTitle: 'Tree health looks good',
          allClearDescription: 'No issues match the current filter.',
        },
      },
    },
  }),
}));

vi.mock('../../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (
    isOpen ? <div>{children}</div> : null
  ),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { validationErrors: Record<string, string[]>; treeName: string }) => unknown) => selector({
    validationErrors: {},
    treeName: 'Demo Tree',
  }),
}));

const buildPerson = (id: string, patch: Partial<Person> = {}): Person => ({
  ...DEFAULT_PERSON_TEMPLATE,
  id,
  firstName: id,
  lastName: 'Family',
  gender: 'male',
  parents: [],
  children: [],
  spouses: [],
  ...patch,
});

describe('StatisticsDashboard health center consistency view', () => {
  it('renders integrity score cards, category filters, and navigable issues', () => {
    const onNavigateToPerson = vi.fn();
    const people = {
      p1: buildPerson('p1'),
      p2: buildPerson('p2', { parents: ['missing-parent'] }),
    };

    render(
      <StatisticsDashboard
        isOpen
        onClose={vi.fn()}
        people={people}
        onNavigateToPerson={onNavigateToPerson}
        initialView="consistency"
      />
    );

    expect(screen.getByText('Health Score')).toBeInTheDocument();
    expect(screen.getAllByText('Completeness').length).toBeGreaterThan(0);
    expect(screen.getByText('Citation Coverage')).toBeInTheDocument();
    expect(screen.getByText(/Completeness \d+/)).toBeInTheDocument();
    expect(screen.getByText('Structural 1')).toBeInTheDocument();
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0);
    const issueButtons = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Family'));
    expect(issueButtons[0]).toHaveTextContent('p2 Family references a missing parent.');

    fireEvent.click(screen.getByText('p1 Family is missing a birth date.'));

    expect(onNavigateToPerson).toHaveBeenCalledWith('p1');
  });
});
