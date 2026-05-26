

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NodeComponent } from '../tree/node/NodeComponent';
import type { Person, TreeNode, TreeSettings } from '../../types';
import { DEFAULT_TREE_SETTINGS } from '../../constants';

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  title: '',
  firstName: 'Amina',
  middleName: '',
  lastName: 'Saleh',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'female',
  birthDate: '1990-01-01',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
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
  photoUrl: 'https://example.com/person.jpg',
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
  partnerDetails: {},
  ...overrides,
});

const baseState = {
  people: {} as Record<string, Person>,
  syncingNodes: new Set<string>(),
  pulseTargetId: null,
  validationErrors: {},
};

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof baseState) => unknown) => selector(baseState),
}));

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      unnamedPerson: 'Unnamed Person',
    },
  }),
}));

const renderNode = (
  person: Person,
  privacyMode: boolean,
  settingsOverrides: Partial<TreeSettings> = {},
) => {
  const node: TreeNode = {
    id: person.id,
    x: 100,
    y: 100,
    type: 'focus',
    data: person,
    isReference: false,
  };

  baseState.people = { [person.id]: person };

  return render(
    <svg>
      <NodeComponent
        node={node}
        index={0}
        isFocused={false}
        isHighlighted={false}
        onSelect={() => undefined}
        onNodeContextMenu={() => undefined}
        settings={{ ...DEFAULT_TREE_SETTINGS, showPhotos: true, privacyMode, ...settingsOverrides }}
        zoomScale={1}
        nodeWidth={180}
        nodeHeight={120}
      />
    </svg>
  );
};

describe('NodeComponent privacy mode', () => {
  it('renders the person photo when privacy mode is disabled', () => {
    const person = buildPerson();

    renderNode(person, false);

    expect(screen.getByRole('img', { name: 'Amina Saleh' })).toBeInTheDocument();
  });

  it.each([
    {
      label: 'child female',
      person: buildPerson({ id: 'child-female', gender: 'female', birthDate: '2018-05-01' }),
      expectedLabel: 'Privacy placeholder: female child',
    },
    {
      label: 'youth male',
      person: buildPerson({ id: 'youth-male', gender: 'male', birthDate: '2010-04-01' }),
      expectedLabel: 'Privacy placeholder: male youth',
    },
    {
      label: 'adult female',
      person: buildPerson({ id: 'adult-female', gender: 'female', birthDate: '1990-01-01' }),
      expectedLabel: 'Privacy placeholder: female adult',
    },
    {
      label: 'senior male',
      person: buildPerson({ id: 'senior-male', gender: 'male', birthDate: '1940-07-01' }),
      expectedLabel: 'Privacy placeholder: male senior',
    },
  ])('replaces the cloud photo with the correct %s archival placeholder', ({ person, expectedLabel }) => {
    renderNode(person, true);

    expect(screen.queryByRole('img', { name: `${person.firstName} ${person.lastName}`.trim() })).not.toBeInTheDocument();
    expect(screen.getByLabelText(expectedLabel)).toBeInTheDocument();
  });

  it('defaults to the adult placeholder when the birth date is missing', () => {
    const person = buildPerson({ id: 'no-birthdate', gender: 'male', birthDate: '' });

    renderNode(person, true);

    expect(screen.getByLabelText('Privacy placeholder: male adult')).toBeInTheDocument();
  });

  it('honors separate birth and death date visibility flags', () => {
    const person = buildPerson({
      isDeceased: true,
      birthDate: '1930-01-01',
      deathDate: '2020-02-02',
    });

    renderNode(person, false, {
      showDates: true,
      showBirthDate: false,
      showDeathDate: true,
    });

    expect(screen.queryByText('(1930 - 2020)')).not.toBeInTheDocument();
    expect(screen.getByText('(d. 2020)')).toBeInTheDocument();
  });
});

