import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUuid = vi.hoisted(() => vi.fn());
const mockCreateTree = vi.hoisted(() => vi.fn());
const mockImportTreeContent = vi.hoisted(() => vi.fn());
const mockImportFromGEDCOMWithReport = vi.hoisted(() => vi.fn());
const mockImportJozorArchiveDataForCloud = vi.hoisted(() => vi.fn());
const mockDeleteWholeTree = vi.hoisted(() => vi.fn());
const mockUploadPersonMediaBlob = vi.hoisted(() => vi.fn());
const mockDeletePersonMediaAsset = vi.hoisted(() => vi.fn());
const mockDeferCleanup = vi.hoisted(() => vi.fn());

vi.mock('uuid', () => ({
  v4: () => mockUuid(),
}));

vi.mock('../../../../services/supabaseTreeMutationService', () => ({
  createTree: (...args: unknown[]) => mockCreateTree(...args),
  importTreeContent: (...args: unknown[]) => mockImportTreeContent(...args),
  deleteWholeTree: (...args: unknown[]) => mockDeleteWholeTree(...args),
}));

vi.mock('../../../../utils/archiveLogic', () => ({
  importJozorArchiveDataForCloud: (...args: unknown[]) => mockImportJozorArchiveDataForCloud(...args),
}));

vi.mock('../../../../services/supabaseStorageService', () => ({
  SupabaseStorageService: {
    uploadPersonMediaBlob: (...args: unknown[]) => mockUploadPersonMediaBlob(...args),
    deletePersonMediaAsset: (...args: unknown[]) => mockDeletePersonMediaAsset(...args),
  },
}));

vi.mock('../../../../services/personMediaCleanupQueue', () => ({
  deferPersonMediaObjectCleanup: (...args: unknown[]) => mockDeferCleanup(...args),
}));

vi.mock('../../../../utils/gedcomLogic', () => ({
  importFromGEDCOMWithReport: (...args: unknown[]) => mockImportFromGEDCOMWithReport(...args),
}));

vi.mock('../../../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
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
    mockImportTreeContent.mockResolvedValue(undefined);
    mockDeleteWholeTree.mockResolvedValue(undefined);
    mockDeletePersonMediaAsset.mockResolvedValue(undefined);
    mockDeferCleanup.mockResolvedValue(undefined);
  });

  it('imports GEDCOM files as a new cloud tree with remapped people', async () => {
    mockImportFromGEDCOMWithReport.mockReturnValue({
      people: peopleMap,
      report: {
        peopleCount: 2,
        familyCount: 0,
        unsupportedDateValues: [],
        unnamedPeopleCount: 0,
        integrityIssues: [],
        structuralIssueCount: 0,
        timelineIssueCount: 0,
        duplicateIssueCount: 0,
        isSafe: true,
        warnings: [],
      },
    });
    const file = {
      name: 'family.ged',
      text: vi.fn().mockResolvedValue('0 HEAD'),
    } as unknown as File;

    const treeId = await importTreeFromFileItem('owner_1', 'owner@example.com', file, 'token_1');

    expect(treeId).toBe('tree_new');
    expect(mockImportFromGEDCOMWithReport).toHaveBeenCalledWith('0 HEAD');
    expect(mockCreateTree).toHaveBeenCalledWith(
      'owner_1',
      'owner@example.com',
      expect.stringMatching(/^Imported Tree /),
      'token_1',
      undefined
    );
    expect(mockImportTreeContent).toHaveBeenCalledWith(
      'tree_new',
      'owner_1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'new_parent', children: ['new_child'] }),
        expect.objectContaining({ id: 'new_child', parents: ['new_parent'] }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({ person_id: 'new_parent', relative_id: 'new_child', type: 'child' }),
      ]),
      'owner@example.com',
      'token_1'
    );
  });

  it('imports Jozor archive files as a new cloud tree with remapped people', async () => {
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: peopleMap,
      settings: { treeSettings: { chartType: 'radial' } },
      mediaByPersonId: {},
      warnings: [],
      mediaComplete: true,
    });
    const file = { name: 'family.jozor' } as unknown as File;

    const treeId = await importTreeFromFileItem('owner_1', 'owner@example.com', file, 'token_1');

    expect(treeId).toBe('tree_new');
    expect(mockImportJozorArchiveDataForCloud).toHaveBeenCalledWith(file);
    expect(mockCreateTree).toHaveBeenCalledWith(
      'owner_1',
      'owner@example.com',
      expect.stringMatching(/^Imported Tree /),
      'token_1',
      { treeSettings: { chartType: 'radial' } }
    );
    expect(mockImportTreeContent).toHaveBeenCalledWith(
      'tree_new',
      'owner_1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'new_parent' }),
        expect.objectContaining({ id: 'new_child' }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({ person_id: 'new_parent', relative_id: 'new_child', type: 'child' }),
      ]),
      'owner@example.com',
      'token_1'
    );
  });

  it('uploads archive images privately and imports only typed references', async () => {
    const profileBlob = new Blob(['profile'], { type: 'image/png' });
    const galleryBlob = new Blob(['gallery'], { type: 'image/png' });
    const profileAsset = {
      schemaVersion: 1, provider: 'supabase-private', bucket: 'person-media',
      assetId: 'asset-profile', kind: 'profile-photo',
      objectPath: 'tree_new/profile-photo/asset-profile.png', mimeType: 'image/png',
      byteLength: 7, version: 1, createdAt: '2026-09-05T00:00:00Z',
    };
    const galleryAsset = {
      ...profileAsset, assetId: 'asset-gallery', kind: 'gallery-photo',
      objectPath: 'tree_new/gallery-photo/asset-gallery.png',
    };
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: peopleMap,
      settings: undefined,
      mediaByPersonId: { old_parent: { avatar: profileBlob, gallery: [galleryBlob] } },
      warnings: [],
      mediaComplete: true,
    });
    mockUploadPersonMediaBlob
      .mockResolvedValueOnce(profileAsset)
      .mockResolvedValueOnce(galleryAsset);
    const file = { name: 'family.jozor' } as File;

    await expect(importTreeFromFileItem('owner_1', 'owner@example.com', file, 'token_1'))
      .resolves.toBe('tree_new');

    expect(mockUploadPersonMediaBlob).toHaveBeenCalledWith(expect.objectContaining({
      treeId: 'tree_new', personId: 'new_parent', blob: profileBlob,
      kind: 'profile-photo', uid: 'owner_1', token: 'token_1',
    }));
    expect(mockImportTreeContent).toHaveBeenCalledWith(
      'tree_new', 'owner_1',
      expect.arrayContaining([expect.objectContaining({
        id: 'new_parent', photoAsset: profileAsset,
        gallery: [expect.objectContaining({ asset: galleryAsset })],
      })]),
      expect.any(Array), 'owner@example.com', 'token_1'
    );
    const serializedCall = JSON.stringify(mockImportTreeContent.mock.calls[0]);
    expect(serializedCall).not.toContain('blob:');
    expect(mockDeleteWholeTree).not.toHaveBeenCalled();
  });

  it('waits for all archive uploads and rolls successful objects back when one fails', async () => {
    const uploadedAsset = {
      schemaVersion: 1, provider: 'supabase-private', bucket: 'person-media',
      assetId: 'asset-profile', kind: 'profile-photo',
      objectPath: 'tree_new/profile-photo/asset-profile.png', mimeType: 'image/png',
      byteLength: 7, version: 1, createdAt: '2026-09-05T00:00:00Z',
    };
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: peopleMap,
      mediaByPersonId: {
        old_parent: { avatar: new Blob(['one']), gallery: [new Blob(['two'])] },
      },
      warnings: [],
      mediaComplete: true,
    });
    mockUploadPersonMediaBlob
      .mockResolvedValueOnce(uploadedAsset)
      .mockRejectedValueOnce(new Error('storage full'));

    await expect(importTreeFromFileItem(
      'owner_1', 'owner@example.com', { name: 'family.jozor' } as File, 'token_1'
    )).rejects.toThrow('storage full');

    expect(mockDeletePersonMediaAsset).toHaveBeenCalledWith(
      uploadedAsset, 'owner_1', 'owner@example.com', 'token_1'
    );
    expect(mockDeleteWholeTree).toHaveBeenCalledWith(
      'tree_new', 'owner_1', 'owner@example.com', 'token_1'
    );
    expect(mockImportTreeContent).not.toHaveBeenCalled();
  });

  it('retains the tree when failed media cleanup is queued for a later retry', async () => {
    const uploadedAsset = {
      schemaVersion: 1, provider: 'supabase-private', bucket: 'person-media',
      assetId: 'asset-profile', kind: 'profile-photo',
      objectPath: 'tree_new/profile-photo/asset-profile.png', mimeType: 'image/png',
      byteLength: 7, version: 1, createdAt: '2026-09-05T00:00:00Z',
    };
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: peopleMap,
      mediaByPersonId: { old_parent: { avatar: new Blob(['one']), gallery: [] } },
      warnings: [],
      mediaComplete: true,
    });
    mockUploadPersonMediaBlob.mockResolvedValue(uploadedAsset);
    mockImportTreeContent.mockRejectedValue(new Error('database rejected import'));
    mockDeletePersonMediaAsset.mockRejectedValue(new Error('offline'));

    await expect(importTreeFromFileItem(
      'owner_1', 'owner@example.com', { name: 'family.jozor' } as File, 'token_1'
    )).rejects.toThrow('database rejected import');

    expect(mockDeferCleanup).toHaveBeenCalledWith(
      { treeId: 'tree_new', userId: 'owner_1', token: 'token_1' },
      expect.objectContaining({ assetId: 'asset-profile' })
    );
    expect(mockDeleteWholeTree).not.toHaveBeenCalled();
  });

  it('does not create a cloud tree from an archive with incomplete image media', async () => {
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: peopleMap, mediaByPersonId: {}, mediaComplete: false,
      warnings: ['Missing media file in archive.'],
    });

    await expect(importTreeFromFileItem(
      'owner_1', 'owner@example.com', { name: 'family.jozor' } as File, 'token_1'
    )).rejects.toThrow('Archive media is incomplete');
    expect(mockCreateTree).not.toHaveBeenCalled();
    expect(mockImportTreeContent).not.toHaveBeenCalled();
  });

  it('rejects dangling archive relationships before creating cloud resources', async () => {
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: {
        old_parent: { ...peopleMap.old_parent, children: ['missing-child'] },
      },
      mediaByPersonId: {},
      warnings: [],
      mediaComplete: true,
    });

    await expect(importTreeFromFileItem(
      'owner_1', 'owner@example.com', { name: 'family.jozor' } as File, 'token_1'
    )).rejects.toThrow('relationships reference a person');

    expect(mockCreateTree).not.toHaveBeenCalled();
    expect(mockUploadPersonMediaBlob).not.toHaveBeenCalled();
  });

  it('rejects archive media mapped to an unknown person before creating the tree', async () => {
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: peopleMap,
      mediaByPersonId: {
        missing_person: { avatar: new Blob(['image']), gallery: [] },
      },
      warnings: [],
      mediaComplete: true,
    });

    await expect(importTreeFromFileItem(
      'owner_1', 'owner@example.com', { name: 'family.jozor' } as File, 'token_1'
    )).rejects.toThrow('media references a person');

    expect(mockCreateTree).not.toHaveBeenCalled();
    expect(mockUploadPersonMediaBlob).not.toHaveBeenCalled();
  });

  it('preserves the import failure when deferred cleanup persistence also fails', async () => {
    const uploadedAsset = {
      schemaVersion: 1, provider: 'supabase-private', bucket: 'person-media',
      assetId: 'asset-profile', kind: 'profile-photo',
      objectPath: 'tree_new/profile-photo/asset-profile.png', mimeType: 'image/png',
      byteLength: 7, version: 1, createdAt: '2026-09-05T00:00:00Z',
    };
    mockImportJozorArchiveDataForCloud.mockResolvedValue({
      people: peopleMap,
      mediaByPersonId: { old_parent: { avatar: new Blob(['one']), gallery: [] } },
      warnings: [],
      mediaComplete: true,
    });
    mockUploadPersonMediaBlob.mockResolvedValue(uploadedAsset);
    mockImportTreeContent.mockRejectedValue(new Error('database rejected import'));
    mockDeletePersonMediaAsset.mockRejectedValue(new Error('offline'));
    mockDeferCleanup.mockRejectedValue(new Error('queue unavailable'));

    await expect(importTreeFromFileItem(
      'owner_1', 'owner@example.com', { name: 'family.jozor' } as File, 'token_1'
    )).rejects.toThrow('database rejected import');

    expect(mockDeferCleanup).toHaveBeenCalledOnce();
    expect(mockDeleteWholeTree).not.toHaveBeenCalled();
  });
});
