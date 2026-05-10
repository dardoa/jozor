import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import { useAppStore } from '../../store/useAppStore';
import type { Person, TreeSettings } from '../../types';
import { useFamilyTreeLayoutController } from '../useFamilyTreeLayoutController';

class WorkerMock {
  onmessage: ((event: MessageEvent) => unknown) | null = null;
  postMessage() {}
  terminate() {}
}

global.Worker = WorkerMock as typeof Worker;

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'root-person',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Salem',
  lastName: 'Alharbi',
  ...overrides,
});

const settings: TreeSettings = {
  layoutMode: 'vertical',
  chartType: 'descendant',
  showMinimap: false,
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
});
