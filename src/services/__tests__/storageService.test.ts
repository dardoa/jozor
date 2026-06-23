import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '../../types';

const dbMock = vi.hoisted(() => {
  const people = {
    clear: vi.fn(),
    bulkPut: vi.fn(),
    count: vi.fn(),
    toCollection: vi.fn(),
    bulkDelete: vi.fn(),
  };

  const relationships = {
    clear: vi.fn(),
    bulkPut: vi.fn(),
    delete: vi.fn(),
    where: vi.fn().mockImplementation(() => ({
      equals: vi.fn().mockImplementation(() => ({
        delete: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  };

  const sources = {
    clear: vi.fn(),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    delete: vi.fn(),
    where: vi.fn().mockImplementation(() => ({
      equals: vi.fn().mockImplementation(() => ({
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    })),
  };

  const citations = {
    clear: vi.fn(),
    bulkPut: vi.fn(),
    bulkDelete: vi.fn(),
    delete: vi.fn(),
    where: vi.fn().mockImplementation(() => ({
      equals: vi.fn().mockImplementation(() => ({
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    })),
  };

  return {
    people,
    relationships,
    sources,
    citations,
    transaction: vi.fn(async (_mode: string, _table: unknown, callback: () => Promise<void>) => {
      await callback();
    }),
  };
});

const logErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../../utils/db', () => ({
  db: dbMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
  logInfo: vi.fn(),
}));

import { storageService } from '../storageService';

const makePerson = (id: string): Person => ({
  id,
  title: '',
  firstName: id,
  middleName: '',
  lastName: 'Person',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
});

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.people.clear.mockResolvedValue(undefined);
    dbMock.people.bulkPut.mockResolvedValue(undefined);
    dbMock.people.count.mockResolvedValue(0);
    dbMock.people.toCollection.mockReturnValue({
      primaryKeys: vi.fn().mockResolvedValue([]),
    });
    dbMock.people.bulkDelete.mockResolvedValue(undefined);
    dbMock.relationships.clear.mockResolvedValue(undefined);
    dbMock.relationships.bulkPut.mockResolvedValue(undefined);
    dbMock.sources.clear.mockResolvedValue(undefined);
    dbMock.sources.bulkPut.mockResolvedValue(undefined);
    dbMock.sources.bulkDelete.mockResolvedValue(undefined);
    dbMock.citations.clear.mockResolvedValue(undefined);
    dbMock.citations.bulkPut.mockResolvedValue(undefined);
    dbMock.citations.bulkDelete.mockResolvedValue(undefined);
  });

  it('saves the full tree and orphan cleanup in one IndexedDB transaction', async () => {
    const person = makePerson('person-1');
    dbMock.people.count.mockResolvedValue(2);
    dbMock.people.toCollection.mockReturnValue({
      primaryKeys: vi.fn().mockResolvedValue(['person-1', 'deleted-person']),
    });

    await storageService.saveFullTree({ 'person-1': person });

    expect(dbMock.transaction).toHaveBeenCalledWith('rw', [dbMock.people, dbMock.relationships, dbMock.sources, dbMock.citations], expect.any(Function));
    expect(dbMock.people.bulkPut).toHaveBeenCalledWith([person]);
    expect(dbMock.people.bulkDelete).toHaveBeenCalledWith(['deleted-person']);
  });

  it('clears local people inside the transaction when the full tree is empty', async () => {
    await storageService.saveFullTree({}, 'tree-1');

    expect(dbMock.transaction).toHaveBeenCalledWith('rw', [dbMock.people, dbMock.relationships, dbMock.sources, dbMock.citations], expect.any(Function));
    expect(dbMock.people.clear).toHaveBeenCalled();
    expect(dbMock.relationships.where).toHaveBeenCalledWith('treeId');
    expect(dbMock.people.bulkPut).not.toHaveBeenCalled();
  });

  it('preserves non-derived sources and citations during full-tree saves', async () => {
    const person = { ...makePerson('person-1'), birthSource: 'Birth Register' };
    const manualSource = {
      id: 'manual-source',
      treeId: 'tree-1',
      type: 'BOOK' as const,
      title: 'Family Archive',
      normalizedKey: 'tree-1:BOOK:family archive',
      origin: 'USER_CREATED',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const manualCitation = {
      id: 'manual-citation',
      treeId: 'tree-1',
      sourceId: 'manual-source',
      targetType: 'PERSON' as const,
      targetId: 'person-1',
      targetField: 'person.profile.sources',
      origin: 'USER_CREATED',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    dbMock.sources.where.mockImplementation(() => ({
      equals: vi.fn().mockImplementation(() => ({
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([manualSource]),
      })),
    }));
    dbMock.citations.where.mockImplementation(() => ({
      equals: vi.fn().mockImplementation(() => ({
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([manualCitation]),
      })),
    }));

    await storageService.saveFullTree({ 'person-1': person }, 'tree-1');

    expect(dbMock.sources.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([manualSource]));
    expect(dbMock.citations.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([manualCitation]));
  });
});
