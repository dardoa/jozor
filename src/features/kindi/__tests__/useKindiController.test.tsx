import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../types';
import type { SearchResult } from '../../../services/searchService';
import { searchService } from '../../../services/searchService';
import { KINDI_STRINGS } from '../logic/kindiLocales';
import { useKindiController } from '../hooks/useKindiController';

const treeActionMocks = vi.hoisted(() => ({
  addChild: vi.fn(),
  addParent: vi.fn(),
  addSpouse: vi.fn(),
  updatePerson: vi.fn(),
  deletePerson: vi.fn(),
}));

const appState = vi.hoisted(() => ({
  currentUserRole: 'owner',
  focusId: 'p1',
  setSearchTarget: vi.fn(),
  triggerPulse: vi.fn(),
  people: {} as Record<string, Person>,
}));

const logKindiSuccessMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/tree/useTreeActions', () => ({
  useTreeActions: () => treeActionMocks,
}));

vi.mock('../../../store/useAppStore', () => {
  const useAppStore = (selector: (store: typeof appState) => unknown) => selector(appState);
  useAppStore.getState = () => appState;

  return { useAppStore };
});

vi.mock('../../../services/searchService', () => ({
  searchService: {
    updateSearchIndex: vi.fn(),
    search: vi.fn(),
  },
}));

vi.mock('../services/kindiLearningService', () => ({
  logKindiSuccess: logKindiSuccessMock,
}));

const person = (id: string, firstName: string): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Alqarji',
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

const searchResult = (
  target: Person,
  confidence: SearchResult['confidence'],
  fuseScore?: number
): SearchResult => ({
  person: target,
  matchType: confidence === 'exact' ? 'exact' : 'fuzzy',
  confidence,
  fuseScore,
  score: confidence === 'low' ? 40 : confidence === 'medium' ? 75 : 95,
  reason: confidence === 'exact' ? 'full-name' : 'fuse',
});

const submitAndFlush = async (
  result: { current: ReturnType<typeof useKindiController> },
  query: string
) => {
  await act(async () => {
    const pending = result.current.submit(query);
    await vi.advanceTimersByTimeAsync(1100);
    await pending;
  });
};

describe('useKindiController confidence handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.sessionStorage.clear();
    vi.mocked(searchService.updateSearchIndex).mockResolvedValue(undefined);
    vi.mocked(searchService.search).mockReset();
    Object.values(treeActionMocks).forEach((mock) => mock.mockReset());
    logKindiSuccessMock.mockReset();
    treeActionMocks.addChild.mockResolvedValue({ success: true });
    treeActionMocks.addParent.mockResolvedValue({ success: true });
    treeActionMocks.addSpouse.mockResolvedValue({ success: true });
    treeActionMocks.updatePerson.mockResolvedValue({ success: true });
    treeActionMocks.deletePerson.mockResolvedValue({ success: true });
    appState.currentUserRole = 'owner';
    appState.focusId = 'p1';
    appState.people = {};
    appState.setSearchTarget.mockReset();
    appState.triggerPulse.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('shows reliable results directly without logging a failure', async () => {
    const lina = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(lina, 'exact')]);

    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'Lina');

    const last = result.current.messages.at(-1);
    expect(last?.peopleResults).toEqual([{
      person: lina,
      matchLevel: 'strong',
      score: 95,
    }]);
    expect(window.sessionStorage.getItem('jozor:kindi:failure-log')).toBeNull();
  });

  it('asks the user to choose when search confidence is medium', async () => {
    const candidate = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(candidate, 'medium', 0.25)]);

    const { result } = renderHook(() => useKindiController({
      people: { [candidate.id]: candidate },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'Lyna');

    const last = result.current.messages.at(-1);
    expect(last?.peopleResults).toEqual([{
      person: candidate,
      matchLevel: 'medium',
      score: 75,
    }]);
  });

  it('does not show weak matches and logs low confidence locally', async () => {
    const weak = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(weak, 'low', 0.41)]);

    const { result } = renderHook(() => useKindiController({
      people: { [weak.id]: weak },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'totally unrelated name');

    const last = result.current.messages.at(-1);
    expect(last?.peopleResults).toBeUndefined();
    expect(last?.people).toBeUndefined();

    const log = JSON.parse(window.sessionStorage.getItem('jozor:kindi:failure-log') || '[]');
    expect(log[0]).toMatchObject({
      reason: 'low_confidence',
      query: 'totally unrelated name',
    });
  });

  it('logs unknown out-of-scope messages without invoking search', async () => {
    const { result } = renderHook(() => useKindiController({
      people: {},
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'weather in Riyadh');

    expect(searchService.search).not.toHaveBeenCalled();
    const log = JSON.parse(window.sessionStorage.getItem('jozor:kindi:failure-log') || '[]');
    expect(log[0]).toMatchObject({
      reason: 'UNKNOWN',
      query: 'weather in Riyadh',
    });
  });

  it('blocks new input while a disambiguation card is pending', async () => {
    const firstMohammed = person('m1', 'محمد');
    const secondMohammed = person('m2', 'محمد');

    const { result } = renderHook(() => useKindiController({
      people: {
        [firstMohammed.id]: firstMohammed,
        [secondMohammed.id]: secondMohammed,
      },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'أضف ابن لمحمد');

    const disambiguationMessage = result.current.messages.at(-1);
    expect(disambiguationMessage?.disambiguation?.status).toBe('pending');
    expect(disambiguationMessage?.people?.map((item) => item.id)).toEqual(['m1', 'm2']);

    await submitAndFlush(result, 'ابحث عن لينا');

    expect(searchService.search).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1)?.text).toBe(KINDI_STRINGS.flow.pendingDecision);
  });

  it('uses the selected ambiguous target before preparing the final add confirmation', async () => {
    const firstMohammed = person('m1', 'محمد');
    const secondMohammed = person('m2', 'محمد');

    const { result } = renderHook(() => useKindiController({
      people: {
        [firstMohammed.id]: firstMohammed,
        [secondMohammed.id]: secondMohammed,
      },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'أضف ابن لمحمد اسمه علي');

    const disambiguationMessage = result.current.messages.at(-1);
    expect(disambiguationMessage?.disambiguation?.status).toBe('pending');

    act(() => {
      result.current.chooseDisambiguation(disambiguationMessage!.id, 'm2');
    });

    const confirmation = result.current.messages.at(-1)?.confirmation;
    expect(confirmation?.plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      gender: 'male',
      targetPersonId: 'm2',
      name: { firstName: 'علي' },
    });
    expect(disambiguationMessage?.disambiguation?.status).toBe('pending');
    expect(result.current.messages.find((message) => message.id === disambiguationMessage?.id)?.disambiguation?.status)
      .toBe('resolved');
  });

  it('executes a confirmed Kindi add through tree actions and applies the provided name', async () => {
    const parent = person('m1', 'محمد');
    const addedChild = { ...person('new-child', 'علي'), gender: 'male' as const };
    appState.focusId = parent.id;
    appState.people = {
      [parent.id]: parent,
    };

    const { result } = renderHook(() => useKindiController({
      people: {
        [parent.id]: parent,
      },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'أضف ابن لمحمد اسمه علي');

    const confirmation = result.current.messages.at(-1)?.confirmation;
    expect(confirmation).toBeDefined();
    treeActionMocks.addChild.mockImplementationOnce(async () => {
      appState.people = {
        [parent.id]: parent,
        [addedChild.id]: addedChild,
      };
      appState.focusId = addedChild.id;
      return { success: true };
    });

    await act(async () => {
      await result.current.confirm(confirmation!);
    });

    expect(treeActionMocks.addChild).toHaveBeenCalledWith('male', undefined, false, parent.id);
    expect(treeActionMocks.updatePerson).toHaveBeenCalledWith(addedChild.id, { firstName: 'علي' });
    expect(result.current.messages.find((message) => message.confirmation?.id === confirmation?.id)?.confirmation?.status)
      .toBe('confirmed');
  });

  it('applies initial profile details to the newly created Kindi person', async () => {
    const parent = person('m1', 'Mahmoud');
    const addedChild = { ...person('new-child', ''), gender: 'male' as const };
    appState.focusId = parent.id;
    appState.people = {
      [parent.id]: parent,
    };
    treeActionMocks.addChild.mockImplementationOnce(async () => {
      appState.people = {
        [parent.id]: parent,
        [addedChild.id]: addedChild,
      };
      return { success: true };
    });

    const { result } = renderHook(() => useKindiController({
      people: {
        [parent.id]: parent,
      },
      onFocusPerson: vi.fn(),
    }));

    await act(async () => {
      await result.current.confirm({
        id: 'confirm-initial-details',
        title: 'Confirm add',
        description: 'Add child',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        kind: 'ACTION',
        status: 'pending',
        relatedPeople: [parent],
        plan: {
          type: 'ADD',
          relation: 'child',
          gender: 'male',
          targetPersonId: parent.id,
          name: { firstName: 'Adam', lastName: 'Alqarji' },
          initialUpdates: {
            profession: 'Teacher',
            birthPlace: 'Makkah',
            birthDate: '2010',
          },
        },
      });
    });

    expect(treeActionMocks.addChild).toHaveBeenCalledWith('male', undefined, false, parent.id);
    expect(treeActionMocks.updatePerson).toHaveBeenCalledWith(addedChild.id, {
      firstName: 'Adam',
      lastName: 'Alqarji',
      profession: 'Teacher',
      birthPlace: 'Makkah',
      birthDate: '2010',
    });
  });

  it('does not log AI learning traces when a confirmation card is cancelled', () => {
    const parent = person('m1', 'Mohammed');

    const { result } = renderHook(() => useKindiController({
      people: {
        [parent.id]: parent,
      },
      onFocusPerson: vi.fn(),
    }));

    act(() => {
      result.current.cancel({
        id: 'confirm-1',
        title: 'Confirm add',
        description: 'Add a son',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        kind: 'ACTION',
        status: 'pending',
        relatedPeople: [parent],
        plan: {
          type: 'ADD',
          relation: 'child',
          gender: 'male',
          targetPersonId: parent.id,
          name: { firstName: 'Khaled' },
        },
        learningTrace: {
          redactedQuery: 'add son for [NAME_1] named [NAME_2]',
          aiDraft: {
            intent: 'ADD',
            relation: 'son',
            targetMention: '[NAME_1]',
            newPersonName: '[NAME_2]',
            confidence: 0.93,
          },
          confidence: 0.93,
          localLexiconVersion: 'test-lexicon',
        },
      });
    });

    expect(logKindiSuccessMock).not.toHaveBeenCalled();
  });
});
