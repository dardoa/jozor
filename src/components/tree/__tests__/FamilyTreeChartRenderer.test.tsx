
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FamilyTreeChartRenderer, type FamilyTreeChartData } from '../FamilyTreeChartRenderer';
import type { Person, TreeSettings } from '../../../types';

const v3ChartMock = vi.hoisted(() => vi.fn(() => null));

vi.mock('../../charts/V3FamilyGraphChart', () => ({
  V3FamilyGraphChart: v3ChartMock,
}));

vi.mock('../FamilyTreeEmptyStates', () => ({
  FanEmptyState: () => null,
  TreeEmptyState: () => null,
}));

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'root-person',
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

const settings = {
  chartType: 'focus',
  showPhotos: true,
  showFirstName: true,
  showDates: true,
  showMiddleName: true,
  showLastName: true,
  showNickname: true,
  layoutMode: 'vertical',
  isCompact: false,
  theme: 'modern',
  showDeceased: true,
  highlightBranch: false,
  nodeSpacingX: 60,
  nodeSpacingY: 400,
  nodeWidth: 240,
  textSize: 12,
  themeColor: '#10b981',
  boxColorLogic: 'none',
  generationLimit: 6,
} as TreeSettings;

describe('FamilyTreeChartRenderer memoization', () => {
  beforeEach(() => {
    v3ChartMock.mockClear();
  });

  it('does not rerender the V3 chart when only loading state changes after content exists', () => {
    const person = buildPerson();
    const chartData: FamilyTreeChartData = {
      people: { [person.id]: person },
      focusId: person.id,
      settings,
      nodes: [],
      fanArcs: [],
      collapsePoints: [],
    };
    const viewport = { zoomScale: 1 };
    const handlers = {
      onSelect: () => undefined,
      onNodeContextMenu: () => undefined,
      onAddFirstPerson: () => undefined,
      toggleCollapse: () => undefined,
    };
    const t = {
      emptyState: {},
      fanEmpty: {},
      premiumInteractiveCanvas: '',
    };

    const { rerender } = render(
      <svg>
        <FamilyTreeChartRenderer
          rendererMode="tree"
          chartData={chartData}
          viewport={viewport}
          handlers={handlers}
          isLoading={false}
          hasReceivedLayout={true}
          t={t}
        />
      </svg>,
    );

    rerender(
      <svg>
        <FamilyTreeChartRenderer
          rendererMode="tree"
          chartData={chartData}
          viewport={viewport}
          handlers={handlers}
          isLoading={true}
          hasReceivedLayout={true}
          t={t}
        />
      </svg>,
    );

    expect(v3ChartMock).toHaveBeenCalledTimes(1);
  });
});

