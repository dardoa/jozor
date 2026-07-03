import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../../store/useAppStore';
import type { LocationData } from '../../../../types/tree';
import { getSupabaseWithAuth } from '../../../../services/supabaseClient';
import { usePlaceSuggestions } from '../usePlaceSuggestions';

interface CacheRow {
  place_name: string;
  resolved_name: string | null;
  status: string;
}

interface CacheQueryResult {
  data: CacheRow[] | null;
  error: null | Error;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const limitMock = vi.hoisted(() => vi.fn<() => Promise<CacheQueryResult>>());

vi.mock('../../../../services/authTokenService', () => ({
  authTokenService: {
    getStoredSupabaseTokenOrUndefined: vi.fn(() => 'token-1'),
  },
}));

vi.mock('../../../../services/supabaseClient', () => ({
  getSupabaseWithAuth: vi.fn(() => {
    const query = {
      select: vi.fn(() => query),
      ilike: vi.fn(() => query),
      eq: vi.fn(() => query),
      limit: limitMock,
    };
    return {
      from: vi.fn(() => query),
    };
  }),
}));

const setLocations = (locations: Record<string, LocationData>) => {
  useAppStore.setState({ locations });
};

describe('usePlaceSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setLocations({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps newer remote suggestions when an older request resolves late', async () => {
    const firstRequest = createDeferred<CacheQueryResult>();
    const secondRequest = createDeferred<CacheQueryResult>();
    limitMock.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise);

    const { result, rerender } = renderHook(({ query }) => usePlaceSuggestions(query), {
      initialProps: { query: 'ri' },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({ query: 'am' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await act(async () => {
      secondRequest.resolve({
        data: [{ place_name: 'amsterdam', resolved_name: 'Amsterdam, Netherlands', status: 'resolved' }],
        error: null,
      });
      await secondRequest.promise;
    });

    expect(result.current.suggestions).toEqual([
      { displayName: 'Amsterdam, Netherlands', source: 'global' },
    ]);

    await act(async () => {
      firstRequest.resolve({
        data: [{ place_name: 'riyadh', resolved_name: 'Riyadh, Saudi Arabia', status: 'resolved' }],
        error: null,
      });
      await firstRequest.promise;
    });

    expect(result.current.suggestions).toEqual([
      { displayName: 'Amsterdam, Netherlands', source: 'global' },
    ]);
    expect(getSupabaseWithAuth).toHaveBeenCalledTimes(2);
  });

  it('clears pending remote lookup when unmounted before debounce fires', () => {
    const { unmount } = renderHook(() => usePlaceSuggestions('ca'));

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(limitMock).not.toHaveBeenCalled();
  });

  it('returns local suggestions immediately', () => {
    setLocations({
      Riyadh: {
        lat: 24.7136,
        lng: 46.6753,
        resolvedName: 'Riyadh, Saudi Arabia',
        status: 'resolved',
      },
    });

    const { result } = renderHook(() => usePlaceSuggestions('riy'));

    expect(result.current.suggestions).toEqual([
      { displayName: 'Riyadh, Saudi Arabia', source: 'local' },
    ]);
  });
});
