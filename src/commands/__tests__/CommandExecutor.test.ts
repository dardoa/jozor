import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CommandExecutor } from '../CommandExecutor';
import { useAppStore } from '../../store/useAppStore';
import { localTreePersistenceService } from '../../services/localTreePersistenceService';
import { searchService } from '../../services/searchService';
import { TreeCommand } from '../types';
import type { Person } from '../../types';

// Mock dependencies
vi.mock('../../store/useAppStore', () => {
  const mockState = {
    people: {
      'person-1': { id: 'person-1', firstName: 'Original' } as unknown as Person,
    },
  };
  const mockGetState = vi.fn(() => mockState);
  const useAppStoreMock = {
    getState: mockGetState,
    setState: (fn: Partial<typeof mockState> | ((state: typeof mockState) => Partial<typeof mockState>)) => {
      const next = typeof fn === 'function' ? fn(mockState) : fn;
      Object.assign(mockState, next);
    },
  };
  return {
    useAppStore: useAppStoreMock,
  };
});

vi.mock('../../services/localTreePersistenceService', () => ({
  localTreePersistenceService: {
    saveChangedPeople: vi.fn(),
  },
}));

vi.mock('../../services/searchService', () => ({
  searchService: {
    updateSearchIndex: vi.fn(),
  },
}));

describe('CommandExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    const state = useAppStore.getState();
    state.people = {
      'person-1': { id: 'person-1', firstName: 'Original' } as unknown as Person,
    };
  });

  it('runs command.execute successfully and triggers side effects', async () => {
    const mockCommand: TreeCommand = {
      execute: vi.fn((_context) => {
        // Mutate store state as commands normally do
        const state = useAppStore.getState();
        state.people = {
          'person-1': { id: 'person-1', firstName: 'Mutated' } as unknown as Person, // Changed reference
          'person-2': { id: 'person-2', firstName: 'New Person' } as unknown as Person, // New
        };
        return { success: true };
      }),
    };

    const result = await CommandExecutor.execute(mockCommand);

    expect(result.success).toBe(true);
    expect(mockCommand.execute).toHaveBeenCalled();

    // Verify side effects
    expect(localTreePersistenceService.saveChangedPeople).toHaveBeenCalledWith([
      { id: 'person-1', firstName: 'Mutated' },
      { id: 'person-2', firstName: 'New Person' },
    ]);
    expect(searchService.updateSearchIndex).toHaveBeenCalledWith([
      { id: 'person-1', firstName: 'Mutated' },
      { id: 'person-2', firstName: 'New Person' },
    ]);
  });

  it('handles execution failures gracefully and returns failure result', async () => {
    const mockFailCommand: TreeCommand = {
      execute: vi.fn(() => {
        return { success: false, error: 'Command validation failed.' };
      }),
    };

    const result = await CommandExecutor.execute(mockFailCommand);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Command validation failed.');
    expect(localTreePersistenceService.saveChangedPeople).not.toHaveBeenCalled();
    expect(searchService.updateSearchIndex).not.toHaveBeenCalled();
  });

  it('catches thrown exceptions and logs execution errors', async () => {
    const errorCommand: TreeCommand = {
      execute: vi.fn(() => {
        throw new Error('Database exception');
      }),
    };

    const result = await CommandExecutor.execute(errorCommand);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database exception');
    expect(localTreePersistenceService.saveChangedPeople).not.toHaveBeenCalled();
    expect(searchService.updateSearchIndex).not.toHaveBeenCalled();
  });
});
