import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '../../types';

const dbMock = vi.hoisted(() => {
  return {
    people: {
      put: vi.fn(),
      bulkPut: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    relationships: {
      where: vi.fn().mockImplementation(() => ({
        equals: vi.fn().mockImplementation(() => ({
          delete: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    },
    sources: {
      where: vi.fn().mockImplementation(() => ({
        equals: vi.fn().mockImplementation(() => ({
          delete: vi.fn().mockResolvedValue(undefined),
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
    },
    citations: {
      where: vi.fn().mockImplementation(() => ({
        equals: vi.fn().mockImplementation(() => ({
          delete: vi.fn().mockResolvedValue(undefined),
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
    },
    person_tombstones: {
      where: vi.fn().mockImplementation(() => ({
        equals: vi.fn().mockImplementation(() => ({
          delete: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    },
    pending_operations: {
      where: vi.fn().mockImplementation(() => ({
        equals: vi.fn().mockImplementation(() => ({
          delete: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    },
    settings: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ key: 'currentTreeId', value: 'tree-1' }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    transaction: vi.fn(async (_mode: string, _table: unknown, callback: () => Promise<void>) => {
      await callback();
    }),
  };
});

vi.mock('../../utils/db', () => ({
  db: dbMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { storageService } from '../storageService';

describe('storageService Privacy Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageService.setRole(null); // Reset role
  });

  it('allows write operations when role is not viewer', async () => {
    storageService.setRole('owner');
    
    await storageService.savePerson({ id: 'p-1' } as Person);
    expect(dbMock.people.put).toHaveBeenCalled();
  });

  it('blocks all write operations when role is viewer', async () => {
    storageService.setRole('viewer');
    
    await storageService.savePerson({ id: 'p-1' } as Person);
    await storageService.savePeople([{ id: 'p-2' }] as Person[]);
    await storageService.deletePerson('p-1');
    await storageService.saveFullTree({ 'p-1': { id: 'p-1' } as Person });

    expect(dbMock.people.bulkPut).not.toHaveBeenCalled();
    expect(dbMock.people.delete).not.toHaveBeenCalled();
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('allows write operations again after viewer role is reset', async () => {
    storageService.setRole('viewer');
    await storageService.savePerson({ id: 'p-1' } as Person);
    expect(dbMock.people.put).not.toHaveBeenCalled();

    storageService.setRole(null);
    await storageService.savePerson({ id: 'p-1' } as Person);
    expect(dbMock.people.put).toHaveBeenCalledTimes(1);
  });

  describe('clearActiveTreeCache', () => {
    it('purges people table and currentTreeId setting if cached tree ID matches target treeId', async () => {
      dbMock.settings.get.mockResolvedValueOnce({ key: 'currentTreeId', value: 'tree-1' });

      await storageService.clearActiveTreeCache('tree-1');

      expect(dbMock.people.clear).toHaveBeenCalled();
      expect(dbMock.settings.delete).toHaveBeenCalledWith('currentTreeId');
      expect(dbMock.relationships.where).toHaveBeenCalledWith('treeId');
      expect(dbMock.sources.where).toHaveBeenCalledWith('treeId');
      expect(dbMock.citations.where).toHaveBeenCalledWith('treeId');
      expect(dbMock.person_tombstones.where).toHaveBeenCalledWith('tree_id');
      expect(dbMock.pending_operations.where).toHaveBeenCalledWith('tree_id');
    });

    it('does not purge people table if cached tree ID does not match target treeId', async () => {
      dbMock.settings.get.mockResolvedValueOnce({ key: 'currentTreeId', value: 'tree-2' });

      await storageService.clearActiveTreeCache('tree-1');

      expect(dbMock.people.clear).not.toHaveBeenCalled();
      expect(dbMock.settings.delete).not.toHaveBeenCalledWith('currentTreeId');
      // Scoped deletions should still be called
      expect(dbMock.relationships.where).toHaveBeenCalledWith('treeId');
    });

    it('purges people table conservatively if cached tree ID is missing', async () => {
      dbMock.settings.get.mockResolvedValueOnce(null);

      await storageService.clearActiveTreeCache('tree-1');

      expect(dbMock.people.clear).toHaveBeenCalled();
      expect(dbMock.settings.delete).toHaveBeenCalledWith('currentTreeId');
    });
  });
});
