import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../../../../constants';
import type { Person } from '../../../../../types';
import { PersonaFooter } from '../PersonaFooter';

vi.mock('../../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      deletePerson: 'Delete Person',
      readOnly: 'Read only',
      doneTooltip: 'Done',
      editDetails: 'Edit Details',
    },
  }),
}));

const person: Person = {
  id: 'person-1',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Main',
  lastName: 'Person',
};

describe('PersonaFooter', () => {
  it('allows editors to delete people from the details drawer', () => {
    const onDelete = vi.fn();

    render(
      <PersonaFooter
        person={person}
        isEditing={false}
        setIsEditing={vi.fn()}
        onDelete={onDelete}
        canEdit
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Person' }));

    expect(onDelete).toHaveBeenCalledWith('person-1');
  });

  it('keeps the delete action disabled for read-only viewers', () => {
    const onDelete = vi.fn();

    render(
      <PersonaFooter
        person={person}
        isEditing={false}
        setIsEditing={vi.fn()}
        onDelete={onDelete}
        canEdit={false}
      />
    );

    const [deleteButton] = screen.getAllByRole('button', { name: 'Read only' });
    expect(deleteButton).toBeDisabled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
