import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeContextMenu } from '../NodeContextMenu';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: {
      personActions: 'Person Actions',
      editDetails: 'Edit Details',
      viewDetails: 'View Details',
      addFather: 'Add Father',
      addMother: 'Add Mother',
      addSpouse: 'Add Spouse',
      addSon: 'Add Son',
      addDaughter: 'Add Daughter',
      linkExistingPerson: 'Link Existing Person',
      setAsRoot: 'Set As Root',
      deletePerson: 'Delete Person',
      back: 'Back',
    },
  }),
}));

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Main',
  lastName: 'Person',
  gender: 'male',
  ...overrides,
});

const baseProps = {
  person: buildPerson(),
  x: 100,
  y: 100,
  onClose: vi.fn(),
  onAddRelation: vi.fn(),
  onOpenDetails: vi.fn(),
  onLinkExisting: vi.fn(),
  onSetAsRoot: vi.fn(),
  onDelete: vi.fn(),
};

describe('NodeContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps viewer menu shallow and opens details', () => {
    render(<NodeContextMenu {...baseProps} currentUserRole="viewer" />);

    expect(screen.getByRole('menuitem', { name: 'View Details' })).toBeEnabled();
    expect(screen.queryByRole('menuitem', { name: 'Add Father' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete Person' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Set As Root' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'View Details' }));

    expect(baseProps.onOpenDetails).toHaveBeenCalledWith('person-1', 'view');
  });

  it('allows editor to use quick local shortcuts', () => {
    render(<NodeContextMenu {...baseProps} currentUserRole="editor" />);

    expect(screen.getByRole('menuitem', { name: 'Edit Details' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Father' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Mother' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Spouse' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Son' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Daughter' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Link Existing Person' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Set As Root' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Delete Person' })).toBeEnabled();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Father' }));
    expect(baseProps.onAddRelation).toHaveBeenCalledWith('parent', 'male');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Link Existing Person' }));
    expect(screen.getByRole('menuitem', { name: 'Add Father' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Mother' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Spouse' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Son' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Add Daughter' })).toBeEnabled();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Add Daughter' }));
    expect(baseProps.onLinkExisting).toHaveBeenCalledWith('child', 'female');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Set As Root' }));

    expect(baseProps.onSetAsRoot).toHaveBeenCalledWith('person-1');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete Person' }));
    expect(baseProps.onDelete).toHaveBeenCalledWith('person-1');
  });
});
