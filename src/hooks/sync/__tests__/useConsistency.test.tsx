import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../../constants';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../types';
import { useConsistency } from '../useConsistency';

const { WorkerMock, workerInstances } = vi.hoisted(() => {
  class WorkerMock {
    onmessage: ((event: MessageEvent) => unknown) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    constructor() {
      workerInstances.push(this);
    }
  }

  const workerInstances: WorkerMock[] = [];

  return { WorkerMock, workerInstances };
});

vi.mock('../../../services/ConsistencyWorker?worker', () => ({
  default: WorkerMock,
}));

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  ...DEFAULT_PERSON_TEMPLATE,
  id: 'person-1',
  firstName: 'Sara',
  lastName: 'Ali',
  ...overrides,
});

describe('useConsistency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    workerInstances.length = 0;
    act(() => {
      useAppStore.setState({
        people: {},
        validationErrors: {},
      });
    });
  });

  it('cancels a pending consistency check when the tree becomes empty', () => {
    renderHook(() => useConsistency());

    act(() => {
      useAppStore.setState({ people: { 'person-1': buildPerson() } });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      useAppStore.setState({ people: {} });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(workerInstances[0].postMessage).not.toHaveBeenCalled();
  });

  it('posts a consistency check for stable non-empty people after debounce', () => {
    renderHook(() => useConsistency());

    act(() => {
      useAppStore.setState({ people: { 'person-1': buildPerson() } });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(workerInstances[0].postMessage).toHaveBeenCalledWith({
      type: 'CHECK',
      people: { 'person-1': buildPerson() },
    });
  });
});
