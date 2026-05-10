// @ts-nocheck
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLastActiveTreeId,
  getLastActiveTreeId,
  setLastActiveTreeId,
} from '../authInitSideEffects';

describe('authInitSideEffects', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('owns last active tree persistence for auth init flows', () => {
    expect(getLastActiveTreeId()).toBeNull();

    setLastActiveTreeId('tree-1');
    expect(getLastActiveTreeId()).toBe('tree-1');
    expect(localStorage.getItem('lastActiveTreeId')).toBe('tree-1');

    clearLastActiveTreeId();
    expect(getLastActiveTreeId()).toBeNull();
    expect(localStorage.getItem('lastActiveTreeId')).toBeNull();
  });
});


