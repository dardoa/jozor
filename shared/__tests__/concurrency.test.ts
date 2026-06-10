import { describe, expect, it } from 'vitest';
import { createLimit } from '../concurrency';

describe('createLimit concurrency helper', () => {
  it('rejects 0, negative, fractional, or NaN concurrency limits', () => {
    expect(() => createLimit(0)).toThrow('Concurrency must be a positive integer >= 1');
    expect(() => createLimit(-1)).toThrow('Concurrency must be a positive integer >= 1');
    expect(() => createLimit(2.5)).toThrow('Concurrency must be a positive integer >= 1');
    expect(() => createLimit(NaN)).toThrow('Concurrency must be a positive integer >= 1');
  });

  it('limits concurrency to the specified ceiling', async () => {
    const limit = createLimit(2);
    let active = 0;
    let maxActive = 0;

    const task = async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
    };

    await Promise.all([limit(task), limit(task), limit(task), limit(task), limit(task)]);

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('continues executing subsequent queued tasks even if a task fails', async () => {
    const limit = createLimit(1);
    const results: string[] = [];

    const successTask = async (name: string) => {
      results.push(name);
    };

    const failTask = async () => {
      throw new Error('Task failed');
    };

    const p1 = limit(() => successTask('first'));
    const p2 = limit(failTask);
    const p3 = limit(() => successTask('third'));

    await expect(p1).resolves.toBeUndefined();
    await expect(p2).rejects.toThrow('Task failed');
    await expect(p3).resolves.toBeUndefined();

    expect(results).toEqual(['first', 'third']);
  });

  it('resolves promises and returns results in the expected order', async () => {
    const limit = createLimit(2);
    const results: number[] = [];

    const task = async (id: number, delay: number) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      results.push(id);
      return id;
    };

    // Task 1 (starts immediately) takes 20ms
    // Task 2 (starts immediately) takes 5ms
    // Task 3 (queued, runs when Task 2 finishes) takes 5ms
    const p1 = limit(() => task(1, 20));
    const p2 = limit(() => task(2, 5));
    const p3 = limit(() => task(3, 5));

    const all = await Promise.all([p1, p2, p3]);

    // Task 2 should finish first, then Task 3, then Task 1
    expect(results).toEqual([2, 3, 1]);
    // The resolved array should match call order
    expect(all).toEqual([1, 2, 3]);
  });

  it('handles tasks throwing synchronous errors safely without leaking queue capacity', async () => {
    const limit = createLimit(1);

    const syncErrorTask = () => {
      throw new Error('sync failure');
    };

    const successTask = async () => {
      return 'ok';
    };

    const p1 = limit(syncErrorTask);
    const p2 = limit(successTask);

    await expect(p1).rejects.toThrow('sync failure');
    await expect(p2).resolves.toBe('ok');
  });
});
