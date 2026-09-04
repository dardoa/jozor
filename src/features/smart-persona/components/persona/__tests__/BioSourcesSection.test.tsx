
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  unsafeSourceUrlHidden: 'The source link is hidden because it is unsafe.',
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
  it('hides unsafe imported source URLs instead of exposing or linking them', () => {
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

    expect(screen.getByText('The source link is hidden because it is unsafe.')).toBeInTheDocument();
    expect(screen.queryByText('javascript:alert(1)')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('targets the source draft without adding or changing a source automatically', () => {
    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const draftSetTitle = vi.fn();
    const { container } = render(
      <BioSourcesSection
        person={{ ...person, sources: [] }}
        isEditing
        isOpen
        hasSources={false}
        focusTarget
        t={t}
        draft={{
          title: '',
          url: '',
          date: '',
          type: '',
          setTitle: draftSetTitle,
          setUrl: vi.fn(),
          setDate: vi.fn(),
          setType: vi.fn(),
        }}
        onToggle={vi.fn()}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onRemove={vi.fn()}
      />
    );

    const target = container.querySelector<HTMLElement>('[data-smart-persona-field="sources"]');
    expect(target).not.toBeNull();
    const input = within(target!).getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onAdd).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(draftSetTitle).not.toHaveBeenCalled();
  });
});

