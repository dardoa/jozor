import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Person, TreeNode, TreeSettings } from '../../../../types';
import { NodeContainer } from '../NodeContainer';

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      unnamedPerson: 'Unnamed person',
    },
  }),
}));

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  title: '',
  firstName: 'Salem',
  middleName: '',
  lastName: 'Alharbi',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '1948-01-01',
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
  photoUrl: '',
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

const settings: TreeSettings = {
  showPhotos: true,
  showFirstName: true,
  showDates: true,
  showBirthDate: true,
  showMarriageDate: true,
  showDeathDate: true,
  showBirthPlace: true,
  showMarriagePlace: true,
  showBurialPlace: true,
  showResidence: true,
  showMiddleName: true,
  showLastName: true,
  showNickname: true,
  layoutMode: 'vertical',
  isCompact: false,
  chartType: 'focus',
  theme: 'modern',
  lineStyle: 'step',
  lineThickness: 2,
  showDeceased: true,
  showGender: true,
  showOccupation: true,
  showSuffix: true,
  highlightBranch: false,
  nodeSpacingX: 240,
  nodeSpacingY: 180,
  nodeWidth: 180,
  textSize: 12,
  themeColor: '#2563eb',
  boxColorLogic: 'none',
  generationLimit: 8,
  privacyMode: false,
};

const renderNode = (zoomScale: number, useLightweightLOD = false) => {
  const person = buildPerson();
  const node: TreeNode = {
    id: 'person:person-1',
    x: 120,
    y: 160,
    data: person,
    type: 'focus',
  };

  return render(
    <svg>
      <NodeContainer
        node={node}
        index={0}
        isFocused={false}
        isHighlighted={false}
        onSelect={vi.fn()}
        onNodeContextMenu={vi.fn()}
        settings={settings}
        zoomScale={zoomScale}
        nodeWidth={180}
        nodeHeight={220}
        useLightweightLOD={useLightweightLOD}
      />
    </svg>,
  );
};

describe('NodeContainer LOD rendering', () => {
  it('uses lightweight pure SVG rendering at far zoom levels', () => {
    const { container } = renderNode(0.1, true);

    expect(container.querySelector('foreignObject')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="tree-node"] rect')).toBeInTheDocument();
  });

  it('keeps the full card at far zoom unless lightweight LOD is explicitly enabled', () => {
    const { container } = renderNode(0.1);

    expect(container.querySelector('foreignObject')).toBeInTheDocument();
  });

  it('uses the full foreignObject card at close zoom levels', () => {
    const { container } = renderNode(1);

    expect(container.querySelector('foreignObject')).toBeInTheDocument();
  });
});
