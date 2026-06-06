import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeltaDebouncedUpdateQueue } from '../DeltaDebouncedUpdateQueue';

describe('DeltaDebouncedUpdateQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce and flush updates in queue', async () => {
    const pushOperation = vi.fn().mockResolvedValue(true);
    const addSyncingNode = vi.fn();
    const queue = new DeltaDebouncedUpdateQueue(pushOperation, addSyncingNode, 100);

    await queue.enqueue('tree-1', 'person-1', { firstName: 'John' });
    expect(addSyncingNode).toHaveBeenCalledWith('person-1');
    expect(pushOperation).not.toHaveBeenCalled();

    // Advance time partly
    vi.advanceTimersByTime(50);
    expect(pushOperation).not.toHaveBeenCalled();

    // Advance time fully
    vi.advanceTimersByTime(50);
    // Flushes asynchronously, resolve timers/promises
    await vi.runAllTimersAsync();

    expect(pushOperation).toHaveBeenCalledTimes(1);
    expect(pushOperation).toHaveBeenCalledWith('tree-1', 'UPDATE_PROP', {
      id: 'person-1',
      updates: { firstName: 'John' },
    });
  });

  it('should merge consecutive updates for the same person', async () => {
    const pushOperation = vi.fn().mockResolvedValue(true);
    const addSyncingNode = vi.fn();
    const queue = new DeltaDebouncedUpdateQueue(pushOperation, addSyncingNode, 100);

    await queue.enqueue('tree-1', 'person-1', { firstName: 'John' });
    await queue.enqueue('tree-1', 'person-1', { lastName: 'Doe' });

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(pushOperation).toHaveBeenCalledTimes(1);
    expect(pushOperation).toHaveBeenCalledWith('tree-1', 'UPDATE_PROP', {
      id: 'person-1',
      updates: { firstName: 'John', lastName: 'Doe' },
    });
  });

  it('should push multiple different people in the same flush', async () => {
    const pushOperation = vi.fn().mockResolvedValue(true);
    const addSyncingNode = vi.fn();
    const queue = new DeltaDebouncedUpdateQueue(pushOperation, addSyncingNode, 100);

    await queue.enqueue('tree-1', 'person-1', { firstName: 'John' });
    await queue.enqueue('tree-1', 'person-2', { firstName: 'Jane' });

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(pushOperation).toHaveBeenCalledTimes(2);
    expect(pushOperation).toHaveBeenCalledWith('tree-1', 'UPDATE_PROP', {
      id: 'person-1',
      updates: { firstName: 'John' },
    });
    expect(pushOperation).toHaveBeenCalledWith('tree-1', 'UPDATE_PROP', {
      id: 'person-2',
      updates: { firstName: 'Jane' },
    });
  });

  it('should push all operations even if one fails when parallelized', async () => {
    // Mock pushOperation to fail for person-1 but succeed for person-2
    const pushOperation = vi.fn().mockImplementation(async (_treeId, _type, payload) => {
      if (payload.id === 'person-1') {
        throw new Error('Push failed for person-1');
      }
      return true;
    });
    const addSyncingNode = vi.fn();
    const queue = new DeltaDebouncedUpdateQueue(pushOperation, addSyncingNode, 100);

    await queue.enqueue('tree-1', 'person-1', { firstName: 'John' });
    await queue.enqueue('tree-1', 'person-2', { firstName: 'Jane' });

    // Call flush directly to catch the promise rejection (it will cancel the pending timeout)
    await expect(queue.flush()).rejects.toThrow('Push failed for person-1');

    // Both operations should have been initiated despite the failure of the first (if parallelized)
    // For the sequential version, this assertion will fail because it stops at person-1.
    expect(pushOperation).toHaveBeenCalledTimes(2);
    expect(pushOperation).toHaveBeenCalledWith('tree-1', 'UPDATE_PROP', {
      id: 'person-1',
      updates: { firstName: 'John' },
    });
    expect(pushOperation).toHaveBeenCalledWith('tree-1', 'UPDATE_PROP', {
      id: 'person-2',
      updates: { firstName: 'Jane' },
    });
  });
});


