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
  currentTreeId: null as string | null,
  focusId: 'p1',
  language: 'ar' as 'ar' | 'en',
  setSearchTarget: vi.fn(),
  triggerPulse: vi.fn(),
  people: {} as Record<string, Person>,
  peopleVersion: 1,
  past: [] as Record<string, Person>[],
  future: [] as Record<string, Person>[],
  isHistoryStale: false,
  undo: vi.fn(() => ({ success: true } as { success: boolean; blockedReason?: 'stale_history' })),
}));

const logKindiSuccessMock = vi.hoisted(() => vi.fn());
const logKindiLearningEventMock = vi.hoisted(() => vi.fn());

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
  KINDI_LEARNING_FAILURE_REASONS: {
    UNKNOWN_DIALECT_WORD: 'UNKNOWN_DIALECT_WORD',
    NAME_AMBIGUOUS: 'NAME_AMBIGUOUS',
    FIELD_NOT_RECOGNIZED: 'FIELD_NOT_RECOGNIZED',
    RELATION_NOT_SUPPORTED: 'RELATION_NOT_SUPPORTED',
    LOCAL_SEARCH_FAILED: 'LOCAL_SEARCH_FAILED',
    AI_LOW_CONFIDENCE: 'AI_LOW_CONFIDENCE',
    USER_CANCELLED: 'USER_CANCELLED',
    USER_REJECTED_DRAFT: 'USER_REJECTED_DRAFT',
    SUPPORT_TOPIC_MISSING: 'SUPPORT_TOPIC_MISSING',
    PARSER_PATTERN_MISSING: 'PARSER_PATTERN_MISSING',
    EXECUTION_FAILED: 'EXECUTION_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
  },
  logKindiSuccess: logKindiSuccessMock,
  logKindiLearningEvent: logKindiLearningEventMock,
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
    logKindiLearningEventMock.mockReset();
    treeActionMocks.addChild.mockResolvedValue({ success: true });
    treeActionMocks.addParent.mockResolvedValue({ success: true });
    treeActionMocks.addSpouse.mockResolvedValue({ success: true });
    treeActionMocks.updatePerson.mockResolvedValue({ success: true });
    treeActionMocks.deletePerson.mockResolvedValue({ success: true });
    appState.currentUserRole = 'owner';
    appState.currentTreeId = null;
    appState.focusId = 'p1';
    appState.language = 'ar';
    appState.people = {};
    appState.peopleVersion = 1;
    appState.past = [];
    appState.future = [];
    appState.isHistoryStale = false;
    appState.undo.mockReset();
    appState.undo.mockReturnValue({ success: true });
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
    expect(last?.answerMeta).toMatchObject({
      source: 'local-tree',
      kind: 'search',
      feedbackEnabled: true,
    });
    expect(window.sessionStorage.getItem('jozor:kindi:failure-log')).toBeNull();
  });

  it('delegates person targeting without dispatching a duplicate pulse', () => {
    const lina = person('p1', 'Lina');
    const onFocusPerson = vi.fn();
    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson,
    }));

    act(() => {
      result.current.focusPerson(lina.id);
    });

    expect(onFocusPerson).toHaveBeenCalledWith(lina.id);
    expect(appState.setSearchTarget).toHaveBeenCalledWith(lina.id);
    expect(appState.triggerPulse).not.toHaveBeenCalled();
    expect(result.current.currentContextPerson?.id).toBe(lina.id);
  });

  it('adopts a person selected outside Kindi when the assistant reopens', () => {
    const lina = person('p1', 'Lina');
    const mariam = person('p2', 'Mariam');
    appState.focusId = lina.id;
    const { result, rerender } = renderHook(() => useKindiController({
      people: { [lina.id]: lina, [mariam.id]: mariam },
      onFocusPerson: vi.fn(),
    }));

    act(() => {
      result.current.focusPerson(lina.id);
    });
    expect(result.current.currentContextPerson).toEqual(lina);

    appState.focusId = mariam.id;
    rerender();
    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.currentContextPerson).toEqual(mariam);
  });

  it('starts a clean conversation while keeping the currently focused person as context', async () => {
    const lina = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(lina, 'exact')]);
    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'Lina');
    act(() => {
      result.current.setDraft('unused draft');
      result.current.startNewConversation();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('kindi:welcome');
    expect(result.current.draft).toBe('');
    expect(result.current.currentContextPerson?.id).toBe(lina.id);
  });

  it('resolves a selected-person command against the current context before asking for the new name', async () => {
    const parent = person('p1', 'ليلى');
    appState.focusId = parent.id;
    const { result } = renderHook(() => useKindiController({
      people: { [parent.id]: parent },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'أضف ابن لهذا الشخص');
    expect(result.current.messages.at(-1)?.text).toContain('ما اسم');
    expect(result.current.messages.at(-1)?.confirmation).toBeUndefined();

    await submitAndFlush(result, 'آدم');
    expect(result.current.messages.at(-1)?.confirmation?.plan).toMatchObject({
      type: 'ADD',
      relation: 'child',
      targetPersonId: parent.id,
      name: { firstName: 'آدم' },
    });
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
      reason: 'AI_LOW_CONFIDENCE',
    });
    expect(log[0]).not.toHaveProperty('query');
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
      reason: 'PARSER_PATTERN_MISSING',
    });
    expect(log[0]).not.toHaveProperty('query');
  });

  it('answers app help questions from the local guide without invoking search', async () => {
    const { result } = renderHook(() => useKindiController({
      people: {},
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'كيف أعمل نسخة احتياطية للشجرة؟');

    expect(searchService.search).not.toHaveBeenCalled();
    const last = result.current.messages.at(-1);
    expect(last?.text).toContain('Google Drive');
    expect(last?.text).toContain('النسخ الاحتياطي');
    expect(last?.answerMeta).toMatchObject({
      source: 'help-center',
      kind: 'guide',
      topicId: 'cloud-backup',
      feedbackEnabled: true,
    });
  });

  it('drafts a biography locally from the current record without preparing or applying a change', async () => {
    const ramadan = person('p1', 'رمضان');
    ramadan.birthDate = '1895-03-02';
    ramadan.birthPlace = 'المدينة المنورة';
    ramadan.profession = 'معلّم';
    ramadan.residence = 'مكة المكرمة';
    ramadan.isDeceased = true;
    ramadan.deathDate = '1983-08-01';
    ramadan.email = 'private-biography@example.test';
    ramadan.bio = 'bearer private-biography-token';
    appState.focusId = ramadan.id;

    const { result } = renderHook(() => useKindiController({
      people: { [ramadan.id]: ramadan },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'أنشئ مسودة سيرة لهذا الشخص');

    expect(searchService.search).not.toHaveBeenCalled();
    expect(Object.values(treeActionMocks).every((mock) => mock.mock.calls.length === 0)).toBe(true);
    const last = result.current.messages.at(-1);
    expect(last?.confirmation).toBeUndefined();
    expect(last?.answerMeta).toMatchObject({
      source: 'local-tree',
      kind: 'biography',
      feedbackEnabled: true,
    });
    expect(last?.biographyDraft).toMatchObject({
      isSaved: false,
      text: expect.stringContaining('رمضان Alqarji'),
    });
    expect(JSON.stringify(last?.biographyDraft)).not.toContain(ramadan.email);
    expect(JSON.stringify(last?.biographyDraft)).not.toContain(ramadan.bio);
  });

  it('organizes a person record locally without search, cloud planning, or tree changes', async () => {
    const ramadan = person('record-raw-id-sentinel', 'رمضان');
    ramadan.birthDate = '1895';
    ramadan.bio = 'ملاحظة عائلية موثقة';
    ramadan.birthSource = 'private-storage-path';
    ramadan.sources = [{
      id: 'source-private-id',
      title: 'سجل الأسرة',
      url: 'https://private.supabase.co/source-private-id',
      date: '1950',
      type: 'دفتر',
    }];
    appState.focusId = ramadan.id;

    const { result } = renderHook(() => useKindiController({
      people: { [ramadan.id]: ramadan },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'نظّم ملاحظات ومصادر هذا الشخص');

    expect(searchService.search).not.toHaveBeenCalled();
    expect(Object.values(treeActionMocks).every((mock) => mock.mock.calls.length === 0)).toBe(true);
    const last = result.current.messages.at(-1);
    expect(last?.confirmation).toBeUndefined();
    expect(last?.answerMeta).toMatchObject({
      source: 'local-tree',
      kind: 'record-review',
      feedbackEnabled: true,
    });
    expect(last?.recordReview).toMatchObject({
      isSaved: false,
      sourceSummary: {
        recordedCount: 2,
        displayedCount: 2,
      },
    });
    expect(last?.recordReviewTargetPersonId).toBe(ramadan.id);
    const serialized = JSON.stringify(last?.recordReview);
    expect(serialized).toContain('ملاحظة عائلية موثقة');
    expect(serialized).toContain('سجل الأسرة');
    expect(serialized).not.toContain(ramadan.id);
    expect(serialized).not.toContain('source-private-id');
    expect(serialized).not.toContain('supabase.co');
  });

  it('records privacy-safe feedback once without storing the query or a person name', async () => {
    const { result } = renderHook(() => useKindiController({
      people: {},
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'كيف أعمل نسخة احتياطية للشجرة؟');
    const answer = result.current.messages.at(-1)!;
    logKindiLearningEventMock.mockClear();

    await act(async () => {
      result.current.rateKindiAnswer(answer.id, 'helpful');
      result.current.rateKindiAnswer(answer.id, 'not-helpful');
      await Promise.resolve();
    });

    expect(result.current.messages.find((message) => message.id === answer.id)?.answerMeta?.feedback)
      .toBe('helpful');
    expect(logKindiLearningEventMock).toHaveBeenCalledOnce();
    expect(logKindiLearningEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'answer_feedback_helpful',
      routeKind: 'SUPPORT',
      resultKind: 'guide',
      parserStage: 'support_guide',
      metadata: {
        answerSource: 'help-center',
        answerKind: 'guide',
        topicId: 'cloud-backup',
      },
    }));
    const loggedEvent = logKindiLearningEventMock.mock.calls[0][0];
    expect(loggedEvent).not.toHaveProperty('redactedQuery');
    expect(JSON.stringify(loggedEvent)).not.toContain('نسخة احتياطية');
  });

  it('answers in the interface language even when the question uses the other language', async () => {
    appState.language = 'en';
    const { result } = renderHook(() => useKindiController({
      people: {},
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'كيف أعمل نسخة احتياطية للشجرة؟');

    expect(searchService.search).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1)?.text).toContain('backup');
    expect(result.current.messages.at(-1)?.text).not.toMatch(/[\u0600-\u06ff]/u);
  });

  it('treats how-to action wording as help and never prepares a confirmation', async () => {
    const sami = person('p1', 'سامي');
    const { result } = renderHook(() => useKindiController({
      people: { [sami.id]: sami },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'كيف أضيف شخصا؟');

    expect(searchService.search).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1)?.text).toContain('لإضافة قريب');
    expect(result.current.messages.some((message) => message.confirmation)).toBe(false);
  });

  it('answers capability discovery without invoking search or AI planning', async () => {
    const { result } = renderHook(() => useKindiController({
      people: {},
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'ماذا تستطيع أن تفعل؟');

    expect(searchService.search).not.toHaveBeenCalled();
    expect(result.current.messages.at(-1)?.text).toContain('البحث عن أفراد الشجرة');
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

    expect(treeActionMocks.addChild).toHaveBeenCalledWith('male', undefined, false, parent.id, { firstName: 'علي' });
    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();
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

    expect(treeActionMocks.addChild).toHaveBeenCalledWith('male', undefined, false, parent.id, {
      firstName: 'Adam',
      lastName: 'Alqarji',
      profession: 'Teacher',
      birthPlace: 'Makkah',
      birthDate: '2010',
    });
    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();
  });

  it('blocks executive commands for viewer access before preparing a confirmation', async () => {
    const lina = person('p1', 'Lina');
    appState.currentUserRole = 'viewer';

    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'delete Lina');

    const last = result.current.messages.at(-1);
    expect(last?.text).toBe(KINDI_STRINGS.permissions.readOnly);
    expect(last?.confirmation).toBeUndefined();
    expect(treeActionMocks.deletePerson).not.toHaveBeenCalled();
    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();
  });

  it('prepares and executes an update command through the official tree action', async () => {
    const lina = person('p1', 'Lina');
    appState.language = 'en';
    appState.people = {
      [lina.id]: lina,
    };
    treeActionMocks.updatePerson.mockImplementationOnce(async (_personId, updates) => {
      appState.people = {
        [lina.id]: {
          ...lina,
          ...updates,
        },
      };
      return { success: true };
    });

    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'update birth date for Lina to 1990-01-01');

    const confirmation = result.current.messages.at(-1)?.confirmation;
    expect(confirmation?.kind).toBe('UPDATE');
    expect(confirmation?.title).toBe('Review data update');
    expect(confirmation?.description).toContain('official tree action');
    expect(result.current.messages.at(-1)?.text).toContain('Update person data');
    expect(result.current.messages.at(-1)?.text).not.toMatch(/[\u0600-\u06ff]/u);
    expect(confirmation?.plan).toMatchObject({
      type: 'UPDATE',
      personId: lina.id,
      updates: {
        birthDate: '1990-01-01',
      },
    });

    await act(async () => {
      await result.current.confirm(confirmation!);
    });

    expect(treeActionMocks.updatePerson).toHaveBeenCalledWith(lina.id, {
      birthDate: '1990-01-01',
    });
    expect(treeActionMocks.deletePerson).not.toHaveBeenCalled();
    expect(result.current.messages.find((message) => message.confirmation?.id === confirmation?.id)?.confirmation?.status)
      .toBe('confirmed');
    expect(result.current.messages.at(-1)?.text).toContain('updated successfully');
  });

  it('undoes the latest Kindi change only while its history fingerprint is current', async () => {
    const lina = person('p1', 'Lina');
    appState.language = 'en';
    appState.people = { [lina.id]: lina };
    treeActionMocks.updatePerson.mockImplementationOnce(async (_personId, updates) => {
      appState.past = [{ [lina.id]: lina }];
      appState.peopleVersion = 2;
      appState.people = { [lina.id]: { ...lina, ...updates } };
      return { success: true };
    });

    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson: vi.fn(),
    }));
    await submitAndFlush(result, 'update birth date for Lina to 1990-01-01');
    const confirmation = result.current.messages.at(-1)?.confirmation;

    await act(async () => {
      await result.current.confirm(confirmation!);
    });

    const successMessage = result.current.messages.at(-1);
    expect(successMessage?.undoAction).toMatchObject({
      status: 'available',
      peopleVersion: 2,
      pastCount: 1,
      futureCount: 0,
    });

    // Background sync may re-project the same logical tree and increment the
    // people version without creating a newer undoable history entry.
    appState.peopleVersion = 3;

    act(() => {
      result.current.undoKindiChange(successMessage!.id, successMessage!.undoAction!);
    });

    expect(appState.undo).toHaveBeenCalledOnce();
    expect(result.current.messages.find((message) => message.id === successMessage?.id)?.undoAction?.status)
      .toBe('undone');
    expect(result.current.messages.at(-1)?.text).toBe('Kindi’s latest change was undone.');
  });

  it('expires Kindi undo instead of reverting a newer tree change', async () => {
    const lina = person('p1', 'Lina');
    appState.language = 'en';
    appState.people = { [lina.id]: lina };
    treeActionMocks.updatePerson.mockImplementationOnce(async (_personId, updates) => {
      appState.past = [{ [lina.id]: lina }];
      appState.peopleVersion = 2;
      appState.people = { [lina.id]: { ...lina, ...updates } };
      return { success: true };
    });

    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson: vi.fn(),
    }));
    await submitAndFlush(result, 'update birth date for Lina to 1990-01-01');
    const confirmation = result.current.messages.at(-1)?.confirmation;
    await act(async () => {
      await result.current.confirm(confirmation!);
    });
    const successMessage = result.current.messages.at(-1)!;
    appState.peopleVersion = 3;
    appState.past = [{ [lina.id]: { ...lina, birthDate: '1985' } }];

    act(() => {
      result.current.undoKindiChange(successMessage.id, successMessage.undoAction!);
    });

    expect(appState.undo).not.toHaveBeenCalled();
    expect(result.current.messages.find((message) => message.id === successMessage.id)?.undoAction?.status)
      .toBe('expired');
    expect(result.current.messages.at(-1)?.text).toContain('no longer available');
  });

  it('keeps delete commands behind an explicit confirmation card', async () => {
    const lina = person('p1', 'Lina');
    appState.people = {
      [lina.id]: lina,
    };

    const { result } = renderHook(() => useKindiController({
      people: { [lina.id]: lina },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'delete Lina');

    const confirmation = result.current.messages.at(-1)?.confirmation;
    expect(confirmation?.kind).toBe('DELETE');
    expect(confirmation?.plan).toMatchObject({
      type: 'DELETE',
      personId: lina.id,
    });
    expect(treeActionMocks.deletePerson).not.toHaveBeenCalled();
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

  it('answers a tree data-quality question locally without invoking search', async () => {
    const root = person('private-root-id', 'Sami');
    appState.people = { [root.id]: root };
    appState.focusId = root.id;
    const { result } = renderHook(() => useKindiController({
      people: appState.people,
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'ما مشاكل الشجرة؟');

    const answer = result.current.messages.at(-1);
    expect(answer?.answerMeta).toMatchObject({
      source: 'local-tree',
      kind: 'diagnostic',
      feedbackEnabled: true,
    });
    expect(answer?.text).toContain('اكتمل فحص بيانات الشجرة');
    expect(answer?.diagnosticSummary?.citationCoverage).toBeNull();
    expect(answer?.text).not.toContain(root.id);
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it('prepares a diagnostic field update against opaque in-memory context without mutating', () => {
    const lina = person('private-person-record-id', 'Lina');
    appState.people = { [lina.id]: lina };
    appState.currentTreeId = 'tree-1';

    const { result } = renderHook(() => useKindiController({
      people: appState.people,
      onFocusPerson: vi.fn(),
    }));

    let prepared = false;
    act(() => {
      prepared = result.current.prepareDiagnosticUpdate({
        key: 'occupation',
        text: 'Complete the occupation.',
        targetPersonId: lina.id,
        targetTab: 'about',
        targetSection: 'workBio',
        targetField: 'profession',
      });
    });

    expect(prepared).toBe(true);
    expect(result.current.draft).toBe('حدّث مهنة هذا الشخص إلى ');
    expect(result.current.currentContextPerson).toEqual(lina);
    expect(result.current.draft).not.toContain(lina.id);
    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();
    expect(result.current.messages.some((message) => message.confirmation)).toBe(false);
  });

  it('routes a completed diagnostic draft through confirmation before the official update action', async () => {
    const lina = person('private-guided-record-id', 'Lina');
    appState.people = { [lina.id]: lina };
    appState.currentTreeId = 'tree-1';

    const { result } = renderHook(() => useKindiController({
      people: appState.people,
      onFocusPerson: vi.fn(),
    }));

    act(() => {
      result.current.prepareDiagnosticUpdate({
        key: 'occupation',
        text: 'Complete the occupation.',
        targetPersonId: lina.id,
        targetTab: 'about',
        targetSection: 'workBio',
        targetField: 'profession',
      });
    });
    await submitAndFlush(result, `${result.current.draft}مهندسة`);

    const confirmation = result.current.messages.at(-1)?.confirmation;
    expect(confirmation?.plan).toEqual({
      type: 'UPDATE',
      personId: lina.id,
      updates: { profession: 'مهندسة' },
    });
    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.confirm(confirmation!);
    });
    expect(treeActionMocks.updatePerson).toHaveBeenCalledWith(lina.id, {
      profession: 'مهندسة',
    });
  });

  it('does not expose guided diagnostic updates to a viewer or complex fields', () => {
    const lina = person('private-viewer-record-id', 'Lina');
    appState.people = { [lina.id]: lina };
    appState.currentTreeId = 'tree-1';
    appState.currentUserRole = 'viewer';

    const { result } = renderHook(() => useKindiController({
      people: appState.people,
      onFocusPerson: vi.fn(),
    }));

    expect(result.current.canPrepareDiagnosticUpdate).toBe(false);
    expect(result.current.prepareDiagnosticUpdate({
      key: 'parents',
      text: 'Review parents.',
      targetPersonId: lina.id,
      targetTab: 'links',
      targetSection: 'relationships',
      targetField: 'parents',
    })).toBe(false);
    expect(result.current.draft).toBe('');
    expect(treeActionMocks.updatePerson).not.toHaveBeenCalled();
  });
});
