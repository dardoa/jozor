import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DeletePersonCommand } from '../DeletePersonCommand';
import { CommandContext } from '../types';
import type { Person } from '../../types';

describe('DeletePersonCommand', () => {
  type MockStoreState = {
    currentTreeId: string;
    focusId: string;
    deletedPersonIds: Set<string>;
    people: Record<string, Person>;
    deletePerson: ReturnType<typeof vi.fn>;
    setPeople: ReturnType<typeof vi.fn>;
    setFocusId: ReturnType<typeof vi.fn>;
  };

  let mockStoreState: MockStoreState;
  let mockContext: CommandContext;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockStoreState = {
      currentTreeId: 'tree-1',
      focusId: 'person-1',
      deletedPersonIds: new Set<string>(),
      people: {
        'person-1': {
          id: 'person-1',
          firstName: 'Salem',
          lastName: 'Al-Dawsari',
        } as unknown as Person,
      },
      deletePerson: vi.fn((id) => {
        if (mockStoreState.people[id]) {
          // Simulate state update
          mockStoreState.people = { ...mockStoreState.people };
          delete mockStoreState.people[id];
        }
      }),
      setPeople: vi.fn(),
      setFocusId: vi.fn(),
    };

    mockContext = {
      getState: vi.fn(() => mockStoreState) as unknown as CommandContext['getState'],
      syncService: {
        pushOperation: vi.fn(async () => true),
      } as unknown as CommandContext['syncService'],
      activityService: {
        logAction: vi.fn(),
      } as unknown as CommandContext['activityService'],
      storageService: {
        deletePerson: vi.fn(async () => {}),
        recordDeletedPersonId: vi.fn(async () => {}),
        removeDeletedPersonId: vi.fn(async () => {}),
      } as unknown as CommandContext['storageService'],
      searchService: {
        updateSearchIndex: vi.fn(),
      } as unknown as CommandContext['searchService'],
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('fails execution if person is not found', async () => {
    const command = new DeletePersonCommand('non-existent');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Person not found.');
    expect(mockStoreState.deletePerson).not.toHaveBeenCalled();
    expect(mockContext.storageService.deletePerson).not.toHaveBeenCalled();
  });

  it('fails execution if store deletePerson throws an error', async () => {
    mockStoreState.deletePerson.mockImplementation(() => {
      throw new Error('Store deletion failed');
    });

    const command = new DeletePersonCommand('person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Store deletion failed');
    expect(mockContext.storageService.deletePerson).not.toHaveBeenCalled();
  });

  it('fails execution if person remains in the store state after deletePerson', async () => {
    // Mock deletePerson to not actually modify the people record (noop)
    mockStoreState.deletePerson.mockImplementation(() => {});

    const command = new DeletePersonCommand('person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Person was not removed from the tree.');
    expect(mockContext.storageService.deletePerson).not.toHaveBeenCalled();
  });

  it('performs storage cleanup and sync queueing on successful execution', async () => {
    const command = new DeletePersonCommand('person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(mockStoreState.deletePerson).toHaveBeenCalledWith('person-1', false, true);
    expect(mockContext.storageService.deletePerson).toHaveBeenCalledWith('person-1');
    expect(mockContext.storageService.recordDeletedPersonId).toHaveBeenCalledWith('tree-1', 'person-1');
    expect(mockContext.syncService.pushOperation).toHaveBeenCalledWith('tree-1', 'DELETE_NODE', { id: 'person-1' });
    expect(mockContext.activityService.logAction).toHaveBeenCalledWith('tree-1', 'DELETE_PERSON', {
      personId: 'person-1',
      personName: 'Salem Al-Dawsari',
    });
  });

  it('bypasses sync when bypassSync is true', async () => {
    const command = new DeletePersonCommand('person-1', true);
    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.syncService.pushOperation).not.toHaveBeenCalled();
    expect(mockContext.activityService.logAction).not.toHaveBeenCalled();
  });

  it('rolls back store state and storage record if storage cleanup throws an error', async () => {
    const storageError = new Error('Disk full');
    vi.mocked(mockContext.storageService.deletePerson).mockRejectedValue(storageError);

    // Track pre-delete state
    const originalPeople = { ...mockStoreState.people };

    const command = new DeletePersonCommand('person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Disk full');

    // Verify rollback actions
    expect(mockStoreState.setPeople).toHaveBeenCalledWith(originalPeople, false);
    expect(mockStoreState.setFocusId).toHaveBeenCalledWith('person-1');
    expect(mockContext.storageService.removeDeletedPersonId).toHaveBeenCalledWith('tree-1', 'person-1');
    expect(mockContext.syncService.pushOperation).not.toHaveBeenCalled();
  });

  it('rolls back store state and storage record if sync queueing returns false', async () => {
    vi.mocked(mockContext.syncService.pushOperation).mockResolvedValue(false);

    // Track pre-delete state
    const originalPeople = { ...mockStoreState.people };

    const command = new DeletePersonCommand('person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('The person was deleted locally, but could not be queued for sync.');

    // Verify rollback actions
    expect(mockStoreState.setPeople).toHaveBeenCalledWith(originalPeople, false);
    expect(mockStoreState.setFocusId).toHaveBeenCalledWith('person-1');
    expect(mockContext.storageService.removeDeletedPersonId).toHaveBeenCalledWith('tree-1', 'person-1');
  });

  it('rolls back store state and storage record if sync queueing throws an error', async () => {
    const syncError = new Error('Network offline');
    vi.mocked(mockContext.syncService.pushOperation).mockRejectedValue(syncError);

    // Track pre-delete state
    const originalPeople = { ...mockStoreState.people };

    const command = new DeletePersonCommand('person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network offline');

    // Verify rollback actions
    expect(mockStoreState.setPeople).toHaveBeenCalledWith(originalPeople, false);
    expect(mockStoreState.setFocusId).toHaveBeenCalledWith('person-1');
    expect(mockContext.storageService.removeDeletedPersonId).toHaveBeenCalledWith('tree-1', 'person-1');
  });
});
