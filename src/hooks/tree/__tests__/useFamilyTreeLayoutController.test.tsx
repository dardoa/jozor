
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../../constants';
import { useAppStore } from '../../../store/useAppStore';
import type { Person, TreeSettings } from '../../../types';
import { useFamilyTreeLayoutController } from '../useFamilyTreeLayoutController';

class WorkerMock {
  onmessage: ((event: MessageEvent) => unknown) | null = null;
  postMessage() {}
  terminate() {}
}

global.Worker = WorkerMock as any;

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'root-person',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Salem',
  lastName: 'Alharbi',
  ...overrides,
});

const settings: TreeSettings = {
  layoutMode: 'vertical',
  chartType: 'focus',
  enableForcePhysics: false,
  enableTimeOffset: false,
  theme: 'modern',
  showPhotos: true,
  showFirstName: true,
  showDates: true,
  showBirthDate: true,
  showMarriageDate: false,
  showDeathDate: true,
  showBirthPlace: false,
  showMarriagePlace: false,
  showBurialPlace: false,
  showResidence: false,
  showMiddleName: false,
  showLastName: true,
  showNickname: false,
  isCompact: false,
  showDeceased: true,
  highlightBranch: true,
  highlightedBranchRootId: undefined,
  nodeSpacingX: 60,
  nodeSpacingY: 400,
  nodeWidth: 240,
  textSize: 12,
  themeColor: '#10b981',
  boxColorLogic: 'gender',
  generationLimit: 6,
} as TreeSettings;

const setPeopleInStore = (people: Record<string, Person>) => {
  act(() => {
    useAppStore.setState((state) => ({
      people,
      peopleVersion: state.peopleVersion + 1,
    }));
  });
};

describe('useFamilyTreeLayoutController highlightedPath stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('reuses the highlightedPath Set when the computed branch ids are unchanged', () => {
    const root = buildPerson({ id: 'root-person', children: ['child-person'] });
    const child = buildPerson({ id: 'child-person', parents: ['root-person'], firstName: 'Child' });
    setPeopleInStore({ [root.id]: root, [child.id]: child });

    const { result, rerender } = renderHook(
      ({ focusId, treeSettings }) => useFamilyTreeLayoutController({
        people: useAppStore.getState().people,
        focusId,
        settings: treeSettings,
      }),
      { initialProps: { focusId: root.id, treeSettings: settings } },
    );

    const initialPath = result.current.highlightedPath;

    setPeopleInStore({
      [root.id]: { ...root, firstName: 'Renamed Root', photoUrl: 'https://example.com/root.jpg' },
      [child.id]: child,
    });
    rerender({ focusId: root.id, treeSettings: settings });

    expect(result.current.highlightedPath).toBe(initialPath);
    expect(result.current.highlightedPath ? Array.from(result.current.highlightedPath).sort() : []).toEqual([
      'child-person',
      'root-person',
    ]);
  });

  it('returns a new highlightedPath Set when branch membership changes', () => {
    const root = buildPerson({ id: 'root-person', children: ['child-person'] });
    const child = buildPerson({ id: 'child-person', parents: ['root-person'], firstName: 'Child' });
    const grandchild = buildPerson({ id: 'grandchild-person', parents: ['child-person'], firstName: 'Grandchild' });
    setPeopleInStore({ [root.id]: root, [child.id]: child });

    const { result, rerender } = renderHook(
      ({ focusId, treeSettings }) => useFamilyTreeLayoutController({
        people: useAppStore.getState().people,
        focusId,
        settings: treeSettings,
      }),
      { initialProps: { focusId: root.id, treeSettings: settings } },
    );

    const initialPath = result.current.highlightedPath;

    setPeopleInStore({
      [root.id]: root,
      [child.id]: { ...child, children: [grandchild.id] },
      [grandchild.id]: grandchild,
    });
    rerender({ focusId: root.id, treeSettings: settings });

    expect(result.current.highlightedPath).not.toBe(initialPath);
    expect(result.current.highlightedPath?.has(grandchild.id)).toBe(true);
  });

  it('includes direct ancestors without including ancestor siblings', () => {
    const grandparent = buildPerson({ id: 'grandparent-person', children: ['parent-person', 'uncle-person'] });
    const parent = buildPerson({ id: 'parent-person', parents: ['grandparent-person'], children: ['root-person'] });
    const uncle = buildPerson({ id: 'uncle-person', parents: ['grandparent-person'], firstName: 'Uncle' });
    const root = buildPerson({ id: 'root-person', parents: ['parent-person'], children: ['child-person'] });
    const child = buildPerson({ id: 'child-person', parents: ['root-person'], firstName: 'Child' });

    setPeopleInStore({
      [grandparent.id]: grandparent,
      [parent.id]: parent,
      [uncle.id]: uncle,
      [root.id]: root,
      [child.id]: child,
    });

    const { result } = renderHook(
      ({ focusId, treeSettings }) => useFamilyTreeLayoutController({
        people: useAppStore.getState().people,
        focusId,
        settings: treeSettings,
      }),
      { initialProps: { focusId: root.id, treeSettings: settings } },
    );

    expect(result.current.highlightedPath ? Array.from(result.current.highlightedPath).sort() : []).toEqual([
      'child-person',
      'grandparent-person',
      'parent-person',
      'root-person',
    ]);
  });

  it('follows the paternal ancestor line above the selected person', () => {
    const paternalGreatGrandfather = buildPerson({ id: 'paternal-great-grandfather', gender: 'male' });
    const paternalGreatGrandmother = buildPerson({ id: 'paternal-great-grandmother', gender: 'female' });
    const paternalGrandfather = buildPerson({
      id: 'paternal-grandfather',
      gender: 'male',
      parents: ['paternal-great-grandfather', 'paternal-great-grandmother'],
    });
    const paternalGrandmother = buildPerson({ id: 'paternal-grandmother', gender: 'female' });
    const maternalGrandfather = buildPerson({ id: 'maternal-grandfather', gender: 'male' });
    const maternalGrandmother = buildPerson({ id: 'maternal-grandmother', gender: 'female' });
    const father = buildPerson({
      id: 'father-person',
      gender: 'male',
      parents: ['paternal-grandfather', 'paternal-grandmother'],
    });
    const mother = buildPerson({
      id: 'mother-person',
      gender: 'female',
      parents: ['maternal-grandfather', 'maternal-grandmother'],
    });
    const root = buildPerson({
      id: 'root-person',
      gender: 'male',
      parents: ['father-person', 'mother-person'],
      children: ['child-person'],
      spouses: ['spouse-person'],
    });
    const spouse = buildPerson({ id: 'spouse-person', gender: 'female', parents: ['spouse-parent-person'] });
    const spouseParent = buildPerson({ id: 'spouse-parent-person', gender: 'male' });
    const child = buildPerson({ id: 'child-person', parents: ['root-person', 'spouse-person'], firstName: 'Child' });

    setPeopleInStore({
      [paternalGreatGrandfather.id]: paternalGreatGrandfather,
      [paternalGreatGrandmother.id]: paternalGreatGrandmother,
      [paternalGrandfather.id]: paternalGrandfather,
      [paternalGrandmother.id]: paternalGrandmother,
      [maternalGrandfather.id]: maternalGrandfather,
      [maternalGrandmother.id]: maternalGrandmother,
      [father.id]: father,
      [mother.id]: mother,
      [root.id]: root,
      [spouse.id]: spouse,
      [spouseParent.id]: spouseParent,
      [child.id]: child,
    });

    const { result } = renderHook(
      ({ focusId, treeSettings }) => useFamilyTreeLayoutController({
        people: useAppStore.getState().people,
        focusId,
        settings: treeSettings,
      }),
      { initialProps: { focusId: root.id, treeSettings: settings } },
    );

    expect(result.current.highlightedPath ? Array.from(result.current.highlightedPath).sort() : []).toEqual([
      'child-person',
      'father-person',
      'mother-person',
      'paternal-grandfather',
      'paternal-grandmother',
      'paternal-great-grandfather',
      'paternal-great-grandmother',
      'root-person',
      'spouse-person',
    ]);
  });

  it('highlights spouses without traversing into the spouse unrelated side', () => {
    const root = buildPerson({ id: 'root-person', spouses: ['spouse-person'], children: ['child-person'] });
    const spouse = buildPerson({
      id: 'spouse-person',
      parents: ['spouse-parent-person'],
      spouses: ['root-person', 'other-partner-person'],
      children: ['child-person', 'spouse-side-child-person'],
      firstName: 'Spouse',
    });
    const child = buildPerson({ id: 'child-person', parents: ['root-person', 'spouse-person'], firstName: 'Child' });
    const spouseParent = buildPerson({ id: 'spouse-parent-person', children: ['spouse-person'], firstName: 'SpouseParent' });
    const otherPartner = buildPerson({ id: 'other-partner-person', spouses: ['spouse-person'], firstName: 'OtherPartner' });
    const spouseSideChild = buildPerson({ id: 'spouse-side-child-person', parents: ['spouse-person', 'other-partner-person'], firstName: 'SideChild' });

    setPeopleInStore({
      [root.id]: root,
      [spouse.id]: spouse,
      [child.id]: child,
      [spouseParent.id]: spouseParent,
      [otherPartner.id]: otherPartner,
      [spouseSideChild.id]: spouseSideChild,
    });

    const { result } = renderHook(
      ({ focusId, treeSettings }) => useFamilyTreeLayoutController({
        people: useAppStore.getState().people,
        focusId,
        settings: treeSettings,
      }),
      { initialProps: { focusId: root.id, treeSettings: settings } },
    );

    expect(result.current.highlightedPath ? Array.from(result.current.highlightedPath).sort() : []).toEqual([
      'child-person',
      'root-person',
      'spouse-person',
    ]);
  });
});

