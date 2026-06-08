import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useThrottledCallback } from '../useDebounce';

describe('useThrottledCallback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the first call immediately and preserves the latest trailing call', () => {
    vi.useFakeTimers();
    const calls: number[] = [];

    const { result } = renderHook(() =>
      useThrottledCallback((value: number) => {
        calls.push(value);
      }, 100),
    );

    act(() => {
      result.current(1);
    });
    expect(calls).toEqual([1]);

    act(() => {
      result.current(2);
      result.current(3);
      vi.advanceTimersByTime(99);
    });
    expect(calls).toEqual([1]);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(calls).toEqual([1, 3]);
  });

  it('flushes immediately and cancels a pending trailing call', () => {
    vi.useFakeTimers();
    const calls: number[] = [];

    const { result } = renderHook(() =>
      useThrottledCallback((value: number) => {
        calls.push(value);
      }, 100),
    );

    act(() => {
      result.current(1);
      result.current(2);
      result.current.flush(4);
      vi.advanceTimersByTime(100);
    });

    expect(calls).toEqual([1, 4]);
  });

  it('cancels pending trailing work', () => {
    vi.useFakeTimers();
    const calls: number[] = [];

    const { result } = renderHook(() =>
      useThrottledCallback((value: number) => {
        calls.push(value);
      }, 100),
    );

    act(() => {
      result.current(1);
      result.current(2);
      result.current.cancel();
      vi.advanceTimersByTime(100);
    });

    expect(calls).toEqual([1]);
  });
});
