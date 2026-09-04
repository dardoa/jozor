import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import { OverlayProvider } from '../../../../context/OverlayContext';
import type { Person } from '../../../../types';
import { TimelineModal } from '../TimelineModal';

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      unnamedPerson: 'Unnamed',
      familyTimelineHeader: 'Timeline',
      familyTimeline: 'Family Timeline',
      personTimeline: 'Personal Timeline',
      personScope: 'Person only',
      familyScope: 'Family',
      births: 'Births',
      deaths: 'Deaths',
      marriages: 'Marriages',
      customEvents: 'Custom',
      born: 'Born',
      died: 'Died',
      marriage: 'Marriage',
      oldestFirst: 'Oldest first',
      newestFirst: 'Newest first',
      close: 'Close',
      filterBy: 'Filter by',
      noEvents: 'No events',
      timelineSearchPlaceholder: 'Search people, places, or event text...',
      timelineSearchResults: (visible: number, total: number) => `Showing ${visible} of ${total} events`,
      showMoreEvents: 'Show more events',
    },
  }),
}));

const makePerson = ({ id, firstName, ...overrides }: Partial<Person> & Pick<Person, 'id' | 'firstName'>): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: overrides.lastName ?? '',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: overrides.birthDate ?? '',
  birthPlace: overrides.birthPlace ?? '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
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
  burialPlace: '',
  residence: '',
  partnerDetails: {},
  isPrivate: false,
  ...overrides,
});

describe('TimelineModal', () => {
  it('opens in person scope when launched for a selected person and can switch to family scope', () => {
    const people = {
      'person-1': makePerson({
        id: 'person-1',
        firstName: 'Amina',
        lastName: 'One',
        birthDate: '1950-01-01',
      }),
      'person-2': makePerson({
        id: 'person-2',
        firstName: 'Samir',
        lastName: 'Two',
        birthDate: '1975-01-01',
      }),
    };

    render(
      <OverlayProvider>
        <TimelineModal
          isOpen
          onClose={vi.fn()}
          people={people}
          onSelectPerson={vi.fn()}
          focusPersonId="person-1"
        />
      </OverlayProvider>
    );

    expect(screen.getByText('Amina One - Personal Timeline')).toBeInTheDocument();
    expect(screen.getByText('Born: Amina One')).toBeInTheDocument();
    expect(screen.queryByText('Born: Samir Two')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Family' }));

    expect(screen.getByText('Family Timeline')).toBeInTheDocument();
    expect(screen.getByText('Born: Amina One')).toBeInTheDocument();
    expect(screen.getByText('Born: Samir Two')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search people, places, or event text...' }), {
      target: { value: 'Samir' },
    });
    expect(screen.queryByText('Born: Amina One')).not.toBeInTheDocument();
    expect(screen.getByText('Born: Samir Two')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 1 events')).toBeInTheDocument();
  });

  it('renders long timelines in bounded batches', () => {
    const person = makePerson({
      id: 'person-many-events',
      firstName: 'Amina',
      events: Array.from({ length: 55 }, (_, index) => ({
        id: `event-${index + 1}`,
        title: `Event ${index + 1}`,
        date: `${1950 + index}-01-01`,
        place: '',
        description: '',
        type: 'other' as const,
      })),
    });

    render(
      <OverlayProvider>
        <TimelineModal
          isOpen
          onClose={vi.fn()}
          people={{ [person.id]: person }}
          onSelectPerson={vi.fn()}
        />
      </OverlayProvider>
    );

    expect(screen.getByText('Showing 50 of 55 events')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more events' }));
    expect(screen.getByText('Showing 55 of 55 events')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more events' })).not.toBeInTheDocument();
  }, 10_000);
});
