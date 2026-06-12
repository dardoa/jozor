import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../../../types';
import { InfoTab } from '../InfoTab';
import { PersonBirthDeathEdit } from '../PersonBirthDeathEdit';

vi.mock('../../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: {
      birthDetails: 'Birth details',
      birthDate: 'Birth date',
      birthPlace: 'Birth place',
      deathDetails: 'Death details',
      deathDate: 'Death date',
      deathPlace: 'Death place',
      source: 'Source',
      sourcePlaceholder: 'Source',
    },
  }),
}));

vi.mock('../InfoTabView', () => ({
  InfoTabView: ({ person }: { person: Person }) => <div>Viewing {person.firstName}</div>,
}));

vi.mock('../../../../../components/DateSelect', () => ({
  DateSelect: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label="date-draft"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('../../../../../components/ui/FormField', () => ({
  FormField: () => null,
}));

vi.mock('../../../../../components/ui/PlaceInput', () => ({
  PlaceInput: () => null,
}));

vi.mock('../../../../../components/ui/Card', () => ({
  Card: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

const createPerson = (id: string, firstName: string, birthDate: string): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: '',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate,
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
});

const createInfoTabProps = (person: Person) => ({
  person,
  people: { [person.id]: person },
  isEditing: false,
  canEdit: true,
  onUpdate: vi.fn(),
  onSelect: vi.fn(),
  onOpenModal: vi.fn(),
  familyActions: {} as never,
  settings: {} as never,
});

describe('smart persona person transition state', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a temporary skeleton when the viewed person changes and settles on the latest person', () => {
    vi.useFakeTimers();
    const firstPerson = createPerson('person-1', 'Alice', '1980');
    const secondPerson = createPerson('person-2', 'Bob', '1990');
    const { rerender } = render(<InfoTab {...createInfoTabProps(firstPerson)} />);

    expect(screen.getByText('Viewing Alice')).toBeInTheDocument();

    rerender(<InfoTab {...createInfoTabProps(secondPerson)} />);

    expect(screen.queryByText('Viewing Bob')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(screen.getByText('Viewing Bob')).toBeInTheDocument();
  });

  it('resets date drafts when the person or persisted dates change', () => {
    const firstPerson = createPerson('person-1', 'Alice', '1980');
    const secondPerson = createPerson('person-2', 'Bob', '1990');
    const { rerender } = render(
      <PersonBirthDeathEdit person={firstPerson} onUpdate={vi.fn()} />
    );

    const dateInput = screen.getByRole('textbox', { name: 'date-draft' });
    fireEvent.change(dateInput, { target: { value: '1981' } });
    expect(dateInput).toHaveValue('1981');

    rerender(<PersonBirthDeathEdit person={secondPerson} onUpdate={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'date-draft' })).toHaveValue('1990');

    rerender(
      <PersonBirthDeathEdit
        person={{ ...secondPerson, birthDate: '1992' }}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.getByRole('textbox', { name: 'date-draft' })).toHaveValue('1992');
  });
});
