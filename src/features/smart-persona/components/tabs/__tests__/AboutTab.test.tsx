import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../../../types';
import { AboutTab } from '../AboutTab';

vi.mock('../../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      aboutSections: {
        overview: 'Overview',
        overviewBlurb: '',
        workBio: 'Work and bio',
        workBioBlurb: '',
        contact: 'Contact',
        contactBlurb: '',
      },
    },
  }),
}));

vi.mock('../AboutSectionContent', () => ({
  AboutSectionContent: ({ section }: { section: string }) => <div>{section} content</div>,
}));

const createPerson = (id: string): Person => ({
  id,
  title: '',
  firstName: id,
  middleName: '',
  lastName: '',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
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

const createProps = (person: Person) => ({
  person,
  people: { [person.id]: person },
  isEditing: false,
  canEdit: true,
  onUpdate: vi.fn(),
  onSelect: vi.fn(),
  onOpenModal: vi.fn(),
  familyActions: {} as never,
  settings: {} as never,
  isMobileLayout: true,
});

describe('AboutTab', () => {
  it('resets mobile accordion sections when the selected person changes', () => {
    const firstPerson = createPerson('person-1');
    const secondPerson = createPerson('person-2');
    const { rerender } = render(<AboutTab {...createProps(firstPerson)} />);

    const overviewButton = screen.getByRole('button', { name: /Overview/ });
    const contactButton = screen.getByRole('button', { name: /Contact/ });
    expect(overviewButton.nextElementSibling).toHaveClass('max-h-[1000px]');
    expect(contactButton.nextElementSibling).toHaveClass('max-h-0');

    fireEvent.click(contactButton);
    expect(contactButton.nextElementSibling).toHaveClass('max-h-[1000px]');

    rerender(<AboutTab {...createProps(secondPerson)} />);

    expect(screen.getByRole('button', { name: /Overview/ }).nextElementSibling)
      .toHaveClass('max-h-[1000px]');
    expect(screen.getByRole('button', { name: /Contact/ }).nextElementSibling)
      .toHaveClass('max-h-0');
  });
});
