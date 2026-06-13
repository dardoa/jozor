import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyOperationToMap } from '../syncUtils';
import { applyDeltaOperationToFamily } from '../../domain/FamilyDomainReducer';
import type { Person } from '../../types';
import type { DeltaOperation } from '../../services/sync/SyncTypes';

vi.mock('../../domain/FamilyDomainReducer', () => ({
  applyDeltaOperationToFamily: vi.fn(),
}));

describe('applyOperationToMap', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return the updated map when applyDeltaOperationToFamily succeeds', () => {
    const mockPeople = { 'person-1': { id: 'person-1', firstName: 'Salem' } as Person };
    const mockOp = {
      type: 'UPDATE_PROP',
      tree_id: 'tree-1',
      user_id: 'user-1',
      payload: { id: 'person-1', updates: { firstName: 'Salem Updated' } },
    } satisfies DeltaOperation;
    const mockUpdatedPeople = {
      'person-1': { id: 'person-1', firstName: 'Salem Updated' } as Person,
    };

    vi.mocked(applyDeltaOperationToFamily).mockReturnValue(mockUpdatedPeople);

    const result = applyOperationToMap(mockPeople, mockOp);

    expect(applyDeltaOperationToFamily).toHaveBeenCalledWith(mockPeople, mockOp);
    expect(result).toBe(mockUpdatedPeople);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should catch exceptions, log to console.error, and return null when applyDeltaOperationToFamily throws', () => {
    const mockPeople = { 'person-1': { id: 'person-1', firstName: 'Salem' } as Person };
    const mockOp = {
      type: 'UPDATE_PROP',
      tree_id: 'tree-1',
      user_id: 'user-1',
      payload: {},
    } satisfies DeltaOperation;
    const mockError = new Error('Invalid operation type');

    vi.mocked(applyDeltaOperationToFamily).mockImplementation(() => {
      throw mockError;
    });

    const result = applyOperationToMap(mockPeople, mockOp);

    expect(applyDeltaOperationToFamily).toHaveBeenCalledWith(mockPeople, mockOp);
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith('[SyncUtils] Failed to apply operation:', mockError);
  });
});
