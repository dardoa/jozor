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
  subscriptionTier: 'free' as 'free' | 'pro' | 'family',
  aiCloudQuotaRemaining: 0,
  setAiCloudQuotaRemaining: vi.fn(),
  language: 'ar' as 'ar' | 'en',
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

// Mock the AI service
const mockRequestKindiClassification = vi.hoisted(() => vi.fn());
vi.mock('../services/kindiAIService', () => ({
  requestKindiClassification: mockRequestKindiClassification,
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

describe('useKindiController billing and quota gating', () => {
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.sessionStorage.clear();
    vi.mocked(searchService.updateSearchIndex).mockResolvedValue(undefined);
    vi.mocked(searchService.search).mockReset();
    Object.values(treeActionMocks).forEach((mock) => mock.mockReset());
    logKindiSuccessMock.mockReset();
    logKindiLearningEventMock.mockReset();
    mockRequestKindiClassification.mockReset();

    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    appState.currentUserRole = 'owner';
    appState.focusId = 'p1';
    appState.people = {};
    appState.setSearchTarget.mockReset();
    appState.triggerPulse.mockReset();
    appState.setAiCloudQuotaRemaining.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('intercepts LLM queries for Free tier, shows paywall message, and triggers open-paywall event', async () => {
    appState.subscriptionTier = 'free';
    appState.language = 'ar';
    
    // Trigger AI fallback by returning low confidence
    const weak = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(weak, 'low', 0.41)]);

    const { result } = renderHook(() => useKindiController({
      people: { [weak.id]: weak },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'totally unrelated dialect query');

    const last = result.current.messages.at(-1);
    expect(last?.text).toBe(KINDI_STRINGS.billing.freePaywall.ar);
    
    // Assert event was dispatched
    expect(dispatchEventSpy).toHaveBeenCalled();
    const eventType = dispatchEventSpy.mock.calls[0][0].type;
    expect(eventType).toBe('open-paywall');

    // Confirm that no actual AI classification query was sent to network
    expect(mockRequestKindiClassification).not.toHaveBeenCalled();
  });

  it('intercepts LLM queries for Pro tier when quota is exhausted', async () => {
    appState.subscriptionTier = 'pro';
    appState.aiCloudQuotaRemaining = 0;
    appState.language = 'en';

    const weak = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(weak, 'low', 0.41)]);

    const { result } = renderHook(() => useKindiController({
      people: { [weak.id]: weak },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'totally unrelated dialect query');

    const last = result.current.messages.at(-1);
    expect(last?.text).toBe(KINDI_STRINGS.billing.quotaExhausted.en);
    expect(dispatchEventSpy).toHaveBeenCalled();
    expect(dispatchEventSpy.mock.calls[0][0].type).toBe('open-paywall');
    expect(mockRequestKindiClassification).not.toHaveBeenCalled();
  });

  it('allows Pro tier to query LLM when quota is remaining, and decrements quota on successful plan', async () => {
    appState.subscriptionTier = 'pro';
    appState.aiCloudQuotaRemaining = 15;
    appState.language = 'ar';

    const weak = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(weak, 'low', 0.41)]);
    
    // Mock the classification response
    mockRequestKindiClassification.mockResolvedValueOnce({
      category: 'GREETING',
      confidence: 0.95,
    });

    const { result } = renderHook(() => useKindiController({
      people: { [weak.id]: weak },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'totally unrelated dialect query');

    expect(mockRequestKindiClassification).toHaveBeenCalled();
    expect(appState.setAiCloudQuotaRemaining).toHaveBeenCalledWith(14);
    
    const last = result.current.messages.at(-1);
    // Should proceed to greeting answer
    expect(last?.text).toMatch(/مرحبا|أهلاً|يا أهلاً|تحية طيبة/);
  });

  it('bypasses limits for Family tier and does not decrement quota', async () => {
    appState.subscriptionTier = 'family';
    appState.language = 'ar';

    const weak = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(weak, 'low', 0.41)]);

    mockRequestKindiClassification.mockResolvedValueOnce({
      category: 'GREETING',
      confidence: 0.95,
    });

    const { result } = renderHook(() => useKindiController({
      people: { [weak.id]: weak },
      onFocusPerson: vi.fn(),
    }));

    await submitAndFlush(result, 'totally unrelated dialect query');

    expect(mockRequestKindiClassification).toHaveBeenCalled();
    expect(appState.setAiCloudQuotaRemaining).not.toHaveBeenCalled();
  });
});
