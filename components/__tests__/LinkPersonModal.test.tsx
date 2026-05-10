import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { LinkPersonModal } from '../LinkPersonModal';
import { OverlayProvider } from '../../context/OverlayContext';
import type { FamilyActionsProps, Person } from '../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      addFather: 'Father',
      addMother: 'Mother',
      addHusband: 'Husband',
      addWife: 'Wife',
      addSon: 'Son',
      addDaughter: 'Daughter',
      add: 'Add',
      howToAdd: 'Choose how to add',
      createNewProfile: 'Create new profile',
      startBlank: 'Start blank',
      or: 'OR',
      selectExisting: 'Select existing',
      searchByName: 'Search by name',
      noMatches: 'No matches',
      born: 'Born',
      unnamedPerson: 'Unnamed person',
    },
    language: 'en',
    setLanguage: vi.fn(),
  }),
  TranslationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const buildPerson = (overrides: Partial<Person>): Person => ({
  id: overrides.id || crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE,
  ...overrides,
});

const renderModal = (people: Record<string, Person>) => {
  const familyActions: FamilyActionsProps = {
    onAddParent: vi.fn(),
    onAddSpouse: vi.fn(),
    onAddChild: vi.fn(),
    onAddFirstPerson: vi.fn(),
    onLinkPerson: vi.fn(),
    onRemoveRelationship: vi.fn(),
  };

  render(
    <OverlayProvider>
      <LinkPersonModal
        isOpen={true}
        onClose={vi.fn()}
        people={people}
        type="child"
        gender="male"
        currentPersonId="focus"
        familyActions={familyActions}
      />
    </OverlayProvider>
  );
};

describe('LinkPersonModal', () => {
  it('shows the co-parent selector when the focused person has multiple spouses', () => {
    renderModal({
      focus: buildPerson({
        id: 'focus',
        firstName: 'Parent',
        spouses: ['spouse-1', 'spouse-2'],
      }),
      'spouse-1': buildPerson({ id: 'spouse-1', firstName: 'First', lastName: 'Spouse' }),
      'spouse-2': buildPerson({ id: 'spouse-2', firstName: 'Second', lastName: 'Spouse' }),
    });

    expect(screen.getByText('حدد الوالد الآخر')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'First Spouse' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Second Spouse' })).toBeInTheDocument();
  });

  it('shows the automatic co-parent notice when the focused person has exactly one spouse', () => {
    renderModal({
      focus: buildPerson({
        id: 'focus',
        firstName: 'Parent',
        spouses: ['spouse-1'],
      }),
      'spouse-1': buildPerson({ id: 'spouse-1', firstName: 'Only', lastName: 'Spouse' }),
    });

    expect(screen.getByText('سيتم اعتبار الشريك الحالي والدًا ثانيًا')).toBeInTheDocument();
    expect(screen.getAllByText('Only Spouse').length).toBeGreaterThan(0);
  });
});
