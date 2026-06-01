import { beforeEach, describe, expect, it, vi } from 'vitest';
import { treeMigrationService } from '../treeMigrationService';
import type { Person } from '../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';

const { createTreeMock, importTreeContentMock, showSuccessMock } = vi.hoisted(() => ({
  createTreeMock: vi.fn().mockResolvedValue('cloud-tree-1'),
  importTreeContentMock: vi.fn().mockResolvedValue(undefined),
  showSuccessMock: vi.fn(),
}));

vi.mock('../supabaseTreeMutationService', () => ({
  createTree: createTreeMock,
  importTreeContent: importTreeContentMock,
}));

vi.mock('../../utils/showToast', () => ({
  showToast: {
    success: showSuccessMock,
  },
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
}));

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Local',
  lastName: 'Person',
  parents: [],
  children: [],
  spouses: [],
  ...overrides,
});

describe('treeMigrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTreeMock.mockResolvedValue('cloud-tree-1');
    importTreeContentMock.mockResolvedValue(undefined);
  });

  it('preserves guest tree name and settings when migrating to cloud', async () => {
    const onSuccess = vi.fn();
    const people = {
      'person-1': buildPerson({
        children: ['person-2'],
      }),
      'person-2': buildPerson({
        id: 'person-2',
        firstName: 'Child',
        parents: ['person-1'],
      }),
    };

    await treeMigrationService.migrateLocalTreeToCloud(
      'user-1',
      'user@example.com',
      'token-1',
      'guest-local-tree',
      people,
      onSuccess,
      {
        treeName: 'Guest Draft Tree',
        settings: { layoutMode: 'horizontal' },
      }
    );

    expect(createTreeMock).toHaveBeenCalledWith(
      'user-1',
      'user@example.com',
      'Guest Draft Tree',
      'token-1',
      { layoutMode: 'horizontal' }
    );
    expect(importTreeContentMock).toHaveBeenCalledWith(
      'cloud-tree-1',
      'user-1',
      Object.values(people),
      [
        {
          person_id: 'person-1',
          relative_id: 'person-2',
          type: 'child',
        },
      ],
      'user@example.com',
      'token-1'
    );
    expect(onSuccess).toHaveBeenCalledWith('cloud-tree-1');
    expect(showSuccessMock).toHaveBeenCalled();
  });
});
