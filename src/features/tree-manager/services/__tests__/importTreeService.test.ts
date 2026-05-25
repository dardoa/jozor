import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUuid = vi.hoisted(() => vi.fn());
const mockCreateTree = vi.hoisted(() => vi.fn());
const mockBulkUpsertPeople = vi.hoisted(() => vi.fn());
const mockBulkInsertRelationships = vi.hoisted(() => vi.fn());
const mockImportFromGEDCOM = vi.hoisted(() => vi.fn());
const mockImportFromJozorArchive = vi.hoisted(() => vi.fn());

vi.mock('uuid', () => ({
  v4: () => mockUuid(),
}));

vi.mock('../../../../services/supabaseTreeMutationService', () => ({
  createTree: (...args: unknown[]) => mockCreateTree(...args),
  bulkUpsertPeople: (...args: unknown[]) => mockBulkUpsertPeople(...args),
  bulkInsertRelationships: (...args: unknown[]) => mockBulkInsertRelationships(...args),
}));

vi.mock('../../../../utils/archiveLogic', () => ({
  importFromJozorArchive: (...args: unknown[]) => mockImportFromJozorArchive(...args),
}));

vi.mock('../../../../utils/gedcomLogic', () => ({
  importFromGEDCOM: (...args: unknown[]) => mockImportFromGEDCOM(...args),
}));

vi.mock('../../../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { importTreeFromFileItem } from '../importTreeService';

const peopleMap = {
  old_parent: {
    id: 'old_parent',
    firstName: 'Parent',
    lastName: 'One',
    gender: 'male',
    parents: [],
    children: ['old_child'],
    spouses: [],
  },
  old_child: {
    id: 'old_child',
    firstName: 'Child',
    lastName: 'One',
    gender: 'female',
    parents: ['old_parent'],
    children: [],
    spouses: [],
  },
};

describe('importTreeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUuid.mockReset();
    mockUuid.mockReturnValueOnce('new_parent').mockReturnValueOnce('new_child');
    mockCreateTree.mockResolvedValue('tree_new');
    mockBulkUpsertPeople.mockResolvedValue(undefined);
    mockBulkInsertRelationships.mockResolvedValue(undefined);
  });

  it('imports GEDCOM files as a new cloud tree with remapped people', async () => {
    mockImportFromGEDCOM.mockReturnValue(peopleMap);
    const file = {
      name: 'family.ged',
      text: vi.fn().mockResolvedValue('0 HEAD'),
    } as unknown as File;

    const treeId = await importTreeFromFileItem('owner_1', 'owner@example.com', file, 'token_1');

    expect(treeId).toBe('tree_new');
    expect(mockImportFromGEDCOM).toHaveBeenCalledWith('0 HEAD');
    expect(mockCreateTree).toHaveBeenCalledWith(
      'owner_1',
      'owner@example.com',
      expect.stringMatching(/^Imported Tree /),
      'token_1'
    );
    expect(mockBulkUpsertPeople).toHaveBeenCalledWith(
      'tree_new',
      'owner_1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'new_parent', children: ['new_child'] }),
        expect.objectContaining({ id: 'new_child', parents: ['new_parent'] }),
      ]),
      'owner@example.com',
      'token_1'
    );
  });

  it('imports Jozor archive files as a new cloud tree with remapped people', async () => {
    mockImportFromJozorArchive.mockResolvedValue(peopleMap);
    const file = { name: 'family.jozor' } as unknown as File;

    const treeId = await importTreeFromFileItem('owner_1', 'owner@example.com', file, 'token_1');

    expect(treeId).toBe('tree_new');
    expect(mockImportFromJozorArchive).toHaveBeenCalledWith(file);
    expect(mockBulkUpsertPeople).toHaveBeenCalledWith(
      'tree_new',
      'owner_1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'new_parent' }),
        expect.objectContaining({ id: 'new_child' }),
      ]),
      'owner@example.com',
      'token_1'
    );
  });
});
