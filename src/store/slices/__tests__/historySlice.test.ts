import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../../constants';
import type { Person } from '../../../types';
import { useAppStore } from '../../useAppStore';
import {
  ESTIMATED_REFERENCE_BYTES_PER_PERSON,
  MAX_HISTORY_STEPS,
  MIN_HISTORY_STEPS,
  estimateHistoryReferenceBytes,
  getHistoryStepLimit,
} from '../historySlice';

const buildPeople = (count: number, prefix = 'person'): Record<string, Person> => {
  const people: Record<string, Person> = {};

  for (let index = 0; index < count; index += 1) {
    const id = `${prefix}-${index}`;
    people[id] = {
      ...DEFAULT_PERSON_TEMPLATE,
      id,
      firstName: `${prefix} ${index}`,
    };
  }

  return people;
};

describe('historySlice memory budget', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.setState({
        people: {},
        past: [],
        future: [],
        historyStepLimit: MAX_HISTORY_STEPS,
        historyEstimatedBytes: 0,
      });
    });
  });

  it('keeps the full history depth for small trees', () => {
    const people = buildPeople(20);

    act(() => {
      for (let index = 0; index < 60; index += 1) {
        useAppStore.getState().pushToHistory(people);
      }
    });

    const state = useAppStore.getState();
    expect(state.historyStepLimit).toBe(MAX_HISTORY_STEPS);
    expect(state.past).toHaveLength(MAX_HISTORY_STEPS);
    expect(state.future).toHaveLength(0);
  });

  it('reduces retained steps as tree size grows', () => {
    const people = buildPeople(1_000);
    const expectedLimit = getHistoryStepLimit(1_000);

    act(() => {
      for (let index = 0; index < 50; index += 1) {
        useAppStore.getState().pushToHistory(people);
      }
    });

    const state = useAppStore.getState();
    expect(expectedLimit).toBe(32);
    expect(state.past).toHaveLength(expectedLimit);
    expect(state.historyStepLimit).toBe(expectedLimit);
    expect(state.historyEstimatedBytes).toBe(
      estimateHistoryReferenceBytes(expectedLimit, 1_000),
    );
  });

  it('preserves undo and redo ordering within the shared budget', () => {
    const first = buildPeople(1, 'first');
    const second = buildPeople(1, 'second');
    const third = buildPeople(1, 'third');

    act(() => {
      useAppStore.setState({ people: first });
      useAppStore.getState().pushToHistory(first);
      useAppStore.setState({ people: second });
      useAppStore.getState().pushToHistory(second);
      useAppStore.setState({ people: third });
      useAppStore.getState().undo();
    });

    expect(useAppStore.getState().people).toBe(second);
    expect(useAppStore.getState().future[0]).toBe(third);

    act(() => {
      useAppStore.getState().redo();
    });

    const state = useAppStore.getState();
    expect(state.people).toBe(third);
    expect(state.past[state.past.length - 1]).toBe(second);
    expect(state.past.length + state.future.length).toBeLessThanOrEqual(state.historyStepLimit);
  });

  it('enforces a minimum usable depth for very large trees', () => {
    expect(getHistoryStepLimit(100_000)).toBe(MIN_HISTORY_STEPS);
    expect(estimateHistoryReferenceBytes(5, 100_000)).toBe(
      5 * 100_000 * ESTIMATED_REFERENCE_BYTES_PER_PERSON,
    );
  });

  it('resets history metrics using the current tree size', () => {
    const people = buildPeople(5_000);

    act(() => {
      useAppStore.setState({ people });
      useAppStore.getState().pushToHistory(people);
      useAppStore.getState().clearHistory();
    });

    const state = useAppStore.getState();
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(state.historyEstimatedBytes).toBe(0);
    expect(state.historyStepLimit).toBe(getHistoryStepLimit(5_000));
  });

  it('blocks undo and redo when history is marked stale', () => {
    const first = buildPeople(1, 'first');
    const second = buildPeople(1, 'second');

    act(() => {
      useAppStore.setState({ people: first });
      useAppStore.getState().pushToHistory(first);
      useAppStore.setState({ people: second });
    });

    expect(useAppStore.getState().isHistoryStale).toBe(false);

    // Mark history stale
    act(() => {
      useAppStore.getState().markHistoryStale();
    });
    expect(useAppStore.getState().isHistoryStale).toBe(true);

    // Try undoing while stale
    let undoRes;
    act(() => {
      undoRes = useAppStore.getState().undo();
    });
    expect(undoRes).toEqual({ success: false, blockedReason: 'stale_history' });
    expect(useAppStore.getState().people).toBe(second); // State unchanged

    // Reset stale flag directly
    act(() => {
      useAppStore.setState({ isHistoryStale: false });
    });
    expect(useAppStore.getState().isHistoryStale).toBe(false);

    // Try undoing now (should succeed)
    act(() => {
      undoRes = useAppStore.getState().undo();
    });
    expect(undoRes).toEqual({ success: true });
    expect(useAppStore.getState().people).toBe(first);
  });
});
