import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AddRelativeCommand } from '../AddRelativeCommand';
import { CommandContext } from '../types';
import type { Person } from '../../types';
import { checkPersonSuggestions, describeSmartCheckIssue } from '../../domain/smartChecker';
import { validatePerson } from '../../utils/familyLogic';
import { showToast } from '../../utils/showToast';

vi.mock('../../domain/smartChecker', () => ({
  checkPersonSuggestions: vi.fn(() => []),
  describeSmartCheckIssue: vi.fn(() => 'Mock issue message'),
}));

vi.mock('../../utils/familyLogic', () => ({
  validatePerson: vi.fn((p) => p),
}));

vi.mock('../../utils/showToast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AddRelativeCommand', () => {
  let mockStoreState: any;
  let mockContext: CommandContext;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockStoreState = {
      currentTreeId: 'tree-1',
      focusId: 'person-1',
      people: {
        'person-1': {
          id: 'person-1',
          firstName: 'Salem',
          lastName: 'Al-Dawsari',
          gender: 'male',
          spouses: [],
          parents: [],
          children: [],
        } as unknown as Person,
      },
      addParent: vi.fn((gender, bypassSync, relatedPersonId, targetPersonId) => {
        const newId = 'new-parent-id';
        mockStoreState.people = {
          ...mockStoreState.people,
          [newId]: {
            id: newId,
            firstName: 'New',
            lastName: 'Parent',
            gender,
            spouses: [],
            parents: [],
            children: [targetPersonId],
          } as unknown as Person,
        };
        return { newId };
      }),
      addSpouse: vi.fn((gender, bypassSync, relatedPersonId) => {
        const newId = 'new-spouse-id';
        mockStoreState.people = {
          ...mockStoreState.people,
          [newId]: {
            id: newId,
            firstName: 'New',
            lastName: 'Spouse',
            gender,
            spouses: [mockStoreState.focusId],
            parents: [],
            children: [],
          } as unknown as Person,
        };
        return { newId };
      }),
      addChild: vi.fn((gender, bypassSync, relatedPersonId, targetPersonId) => {
        const newId = 'new-child-id';
        mockStoreState.people = {
          ...mockStoreState.people,
          [newId]: {
            id: newId,
            firstName: 'New',
            lastName: 'Child',
            gender,
            spouses: [],
            parents: [targetPersonId],
            children: [],
          } as unknown as Person,
        };
        return { newId };
      }),
      setPeople: vi.fn(),
      setFocusId: vi.fn(),
      language: 'ar',
    };

    mockContext = {
      getState: vi.fn(() => mockStoreState),
      syncService: {
        pushOperation: vi.fn(async () => true),
      } as any,
      activityService: {
        logAction: vi.fn(),
      } as any,
      storageService: {} as any,
      searchService: {} as any,
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('fails execution if store action returns null', async () => {
    mockStoreState.addParent.mockReturnValue(null);

    const command = new AddRelativeCommand('parent', 'female');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unable to add parent.');
    expect(mockStoreState.addParent).toHaveBeenCalled();
  });

  it('adds spouse successfully with bypassSync', async () => {
    const command = new AddRelativeCommand('spouse', 'female', undefined, true);
    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(mockStoreState.addSpouse).toHaveBeenCalledWith('female', true, undefined);
    expect(mockContext.syncService.pushOperation).not.toHaveBeenCalled();
    expect(mockContext.activityService.logAction).not.toHaveBeenCalled();
  });

  it('applies initial updates and validates the new person object', async () => {
    const initialUpdates = { firstName: 'Mona', lastName: 'Ahmed' };
    const command = new AddRelativeCommand('parent', 'female', undefined, true, 'person-1', initialUpdates);
    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(validatePerson).toHaveBeenCalled();
    expect(mockStoreState.setPeople).toHaveBeenCalledWith(
      expect.objectContaining({
        'new-parent-id': expect.objectContaining({
          firstName: 'Mona',
          lastName: 'Ahmed',
        }),
      }),
      false
    );
  });

  it('adds parent and queues ADD_NODE and spouse ADD_RELATION if parent has spouses', async () => {
    // Modify addParent mock to return a parent with a spouse
    mockStoreState.addParent.mockImplementation((gender, bypass, relatedId, targetId) => {
      const newId = 'new-parent-id';
      mockStoreState.people = {
        ...mockStoreState.people,
        [newId]: {
          id: newId,
          firstName: 'New',
          lastName: 'Parent',
          gender,
          spouses: ['spouse-1'],
          parents: [],
          children: [targetId],
        } as unknown as Person,
      };
      return { newId };
    });

    const command = new AddRelativeCommand('parent', 'female', undefined, false, 'person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.syncService.pushOperation).toHaveBeenNthCalledWith(1, 'tree-1', 'ADD_NODE', {
      person: mockStoreState.people['new-parent-id'],
      relativeId: 'person-1',
      type: 'parent',
    });
    expect(mockContext.syncService.pushOperation).toHaveBeenNthCalledWith(2, 'tree-1', 'ADD_RELATION', {
      focusId: 'new-parent-id',
      existingId: 'spouse-1',
      type: 'spouse',
    });
    expect(mockContext.activityService.logAction).toHaveBeenCalledWith('tree-1', 'ADD_PERSON', {
      personId: 'new-parent-id',
      personName: 'New Parent',
      type: 'parent',
      relativeId: 'person-1',
    });
  });

  it('adds child and queues ADD_NODE and child ADD_RELATION for co-parent if other parent exists', async () => {
    // Modify addChild mock to return a child with multiple parents
    mockStoreState.addChild.mockImplementation((gender, bypass, relatedId, targetId) => {
      const newId = 'new-child-id';
      mockStoreState.people = {
        ...mockStoreState.people,
        [newId]: {
          id: newId,
          firstName: 'New',
          lastName: 'Child',
          gender,
          spouses: [],
          parents: [targetId, 'co-parent-1'],
          children: [],
        } as unknown as Person,
      };
      return { newId };
    });

    const command = new AddRelativeCommand('child', 'male', undefined, false, 'person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(mockContext.syncService.pushOperation).toHaveBeenNthCalledWith(1, 'tree-1', 'ADD_NODE', {
      person: mockStoreState.people['new-child-id'],
      relativeId: 'person-1',
      type: 'child',
    });
    expect(mockContext.syncService.pushOperation).toHaveBeenNthCalledWith(2, 'tree-1', 'ADD_RELATION', {
      focusId: 'co-parent-1',
      existingId: 'new-child-id',
      type: 'child',
    });
  });

  it('rolls back store state if ADD_NODE sync queueing fails', async () => {
    vi.mocked(mockContext.syncService.pushOperation).mockResolvedValue(false);
    const originalPeople = { ...mockStoreState.people };

    const command = new AddRelativeCommand('child', 'male', undefined, false, 'person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('The child was added locally, but could not be queued for sync.');
    expect(mockStoreState.setPeople).toHaveBeenCalledWith(originalPeople, false);
    expect(mockStoreState.setFocusId).toHaveBeenCalledWith('person-1');
  });

  it('rolls back store state if ADD_RELATION sync queueing fails', async () => {
    // Mock parent with a spouse to trigger ADD_RELATION
    mockStoreState.addParent.mockImplementation((gender, bypass, relatedId, targetId) => {
      const newId = 'new-parent-id';
      mockStoreState.people = {
        ...mockStoreState.people,
        [newId]: {
          id: newId,
          firstName: 'New',
          lastName: 'Parent',
          gender,
          spouses: ['spouse-1'],
          parents: [],
          children: [targetId],
        } as unknown as Person,
      };
      return { newId };
    });

    // Mock first push (ADD_NODE) to succeed, and second (ADD_RELATION) to fail
    vi.mocked(mockContext.syncService.pushOperation)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const originalPeople = { ...mockStoreState.people };

    const command = new AddRelativeCommand('parent', 'female', undefined, false, 'person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('The relationship was added locally, but could not be queued for sync.');
    expect(mockStoreState.setPeople).toHaveBeenCalledWith(originalPeople, false);
  });

  it('rolls back store state if sync queueing throws an exception', async () => {
    const errorMsg = 'Connection timed out';
    vi.mocked(mockContext.syncService.pushOperation).mockRejectedValue(new Error(errorMsg));
    const originalPeople = { ...mockStoreState.people };

    const command = new AddRelativeCommand('child', 'male', undefined, false, 'person-1');
    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMsg);
    expect(mockStoreState.setPeople).toHaveBeenCalledWith(originalPeople, false);
  });

  it('triggers toast warnings/errors based on checkPersonSuggestions results', async () => {
    const mockIssues = [
      { code: 'ERR_1', severity: 'error', message: 'Error issue' },
      { code: 'WRN_1', severity: 'warning', message: 'Warning issue' },
      { code: 'INF_1', severity: 'info', message: 'Info issue' },
    ];
    vi.mocked(checkPersonSuggestions).mockReturnValue(mockIssues as any);
    vi.mocked(describeSmartCheckIssue).mockImplementation((issue: any) => issue.message);

    const command = new AddRelativeCommand('spouse', 'female', undefined, true);
    await command.execute(mockContext);

    expect(showToast.error).toHaveBeenCalledWith('Error issue', { id: 'smart-check:ERR_1:new-spouse-id' });
    expect(showToast.warning).toHaveBeenCalledWith('Warning issue', { id: 'smart-check:WRN_1:new-spouse-id' });
    expect(showToast.info).toHaveBeenCalledWith('Info issue', { id: 'smart-check:INF_1:new-spouse-id' });
  });
});
