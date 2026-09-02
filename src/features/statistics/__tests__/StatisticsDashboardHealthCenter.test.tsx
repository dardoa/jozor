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
          healthScore: 'Structural Integrity',
          completeness: 'Completeness',
          citationCoverage: 'Citation Coverage',
          structuralIntegrityHelp: 'Relationship and timeline consistency only. Completeness and citation coverage are separate scores.',
          structural: 'Structural',
          timeline: 'Timeline',
          duplicates: 'Duplicates',
          citations: 'Citations',
          error: 'Error',
          warning: 'Warning',
          info: 'Info',
          allClearTitle: 'Tree health looks good',
          allClearDescription: 'No issues match the current filter.',
          searchPlaceholder: 'Search issues or people...',
          severityAll: 'All severities',
          showingResults: (visible: number, total: number) => `Showing ${visible} of ${total} current issues`,
          showMore: 'Show more issues',
          openPerson: 'Open person to fix this issue',
          currentIssuesHint: 'Issues disappear automatically after correction.',
          issueMessages: {
            broken_parent_reference: '{person} references a missing parent.',
            missing_birth_date: '{person} is missing a birth date.',
            missing_residence: '{person} is missing residence information.',
            missing_occupation: '{person} is missing occupation information.',
            missing_parents: '{person} has no listed parents.',
            missing_profile_source: '{person} has no profile-level source.',
          },
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

    expect(screen.getByText('Structural Integrity')).toBeInTheDocument();
    expect(screen.getByText(/Completeness and citation coverage are separate scores/)).toBeInTheDocument();
    expect(screen.getAllByText('Completeness').length).toBeGreaterThan(0);
    expect(screen.getByText('Citation Coverage')).toBeInTheDocument();
    expect(screen.getByText(/Completeness \d+/)).toBeInTheDocument();
    expect(screen.getByText('Structural 1')).toBeInTheDocument();
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing \d+ of \d+ current issues/)).toBeInTheDocument();
    const issueButtons = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Family'));
    expect(issueButtons[0]).toHaveTextContent('p2 Family references a missing parent.');

    fireEvent.click(screen.getByText('p1 Family is missing a birth date.'));

    expect(onNavigateToPerson).toHaveBeenCalledWith('p1');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search issues or people...' }), {
      target: { value: 'missing parent' },
    });
    expect(screen.getByText('p2 Family references a missing parent.')).toBeInTheDocument();
    expect(screen.queryByText('p1 Family is missing a birth date.')).not.toBeInTheDocument();
  });

  it('renders large issue collections in bounded batches', () => {
    const people = Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => {
        const id = `person-${index + 1}`;
        return [id, buildPerson(id)];
      })
    );

    render(
      <StatisticsDashboard
        isOpen
        onClose={vi.fn()}
        people={people}
        initialView="consistency"
      />
    );

    expect(screen.getByText('Showing 40 of 60 current issues')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more issues' }));
    expect(screen.getByText('Showing 60 of 60 current issues')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more issues' })).not.toBeInTheDocument();
  });
});
