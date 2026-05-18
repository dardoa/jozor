import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { searchService, type SearchResult } from '../../../services/searchService';
import type { Person } from '../../../types';
import { useKindiSearchFlow } from '../hooks/useKindiSearchFlow';

vi.mock('../../../services/searchService', () => ({
  searchService: {
    search: vi.fn(),
  },
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

const runFlow = async (
  result: { current: ReturnType<typeof useKindiSearchFlow> },
  query: string
) => {
  let response: Awaited<ReturnType<ReturnType<typeof useKindiSearchFlow>['runSearchFlow']>>;
  await act(async () => {
    const pending = result.current.runSearchFlow(query);
    await vi.advanceTimersByTimeAsync(1100);
    response = await pending;
  });
  return response!;
};

describe('useKindiSearchFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.sessionStorage.clear();
    vi.mocked(searchService.search).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('returns strong person results for reliable matches', async () => {
    const lina = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(lina, 'exact')]);
    const { result } = renderHook(() => useKindiSearchFlow());

    const response = await runFlow(result, 'Lina');

    expect(response.kind).toBe('reliable');
    expect('peopleResults' in response ? response.peopleResults : []).toEqual([{
      person: lina,
      matchLevel: 'strong',
      score: 95,
    }]);
    expect(window.sessionStorage.getItem('jozor:kindi:failure-log')).toBeNull();
  });

  it('returns medium person results for nearby matches', async () => {
    const candidate = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(candidate, 'medium', 0.25)]);
    const { result } = renderHook(() => useKindiSearchFlow());

    const response = await runFlow(result, 'Lyna');

    expect(response.kind).toBe('nearby');
    expect('peopleResults' in response ? response.peopleResults[0].matchLevel : undefined).toBe('medium');
  });

  it('hides low-confidence matches and logs them locally', async () => {
    const weak = person('p1', 'Lina');
    vi.mocked(searchService.search).mockResolvedValue([searchResult(weak, 'low', 0.41)]);
    const { result } = renderHook(() => useKindiSearchFlow());

    const response = await runFlow(result, 'unrelated');

    expect(response.kind).toBe('low_confidence');
    const log = JSON.parse(window.sessionStorage.getItem('jozor:kindi:failure-log') || '[]');
    expect(log[0]).toMatchObject({
      reason: 'low_confidence',
      query: 'unrelated',
    });
  });
});
