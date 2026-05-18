
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../../../types';
import type { TranslationSchema } from '../../../../../utils/translationLoader';
import { BioSourcesSection } from '../BioSourcesSection';

const t = {
  sourcesTab: 'Sources',
  sourceTitle: 'Title',
  sourceUrl: 'URL',
  sourceDate: 'Date',
  sourceType: 'Type',
  sourceTitlePlaceholder: 'Title',
  sourceTypePlaceholder: 'Type',
  addSource: 'Add source',
  noSources: 'No sources',
  removeSource: 'Remove source',
} as unknown as TranslationSchema;

const person: Person = {
  id: 'person-1',
  title: '',
  firstName: 'Amina',
  middleName: '',
  lastName: 'Source',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'female',
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
  sources: [
    {
      id: 'source-1',
      title: 'Unsafe source',
      url: 'javascript:alert(1)',
    },
  ],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
};

describe('BioSourcesSection', () => {
  it('renders unsafe imported source URLs as plain text instead of executable links', () => {
    render(
      <BioSourcesSection
        person={person}
        isEditing={false}
        isOpen
        hasSources
        t={t}
        draft={{
          title: '',
          url: '',
          date: '',
          type: '',
          setTitle: vi.fn(),
          setUrl: vi.fn(),
          setDate: vi.fn(),
          setType: vi.fn(),
        }}
        onToggle={vi.fn()}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

