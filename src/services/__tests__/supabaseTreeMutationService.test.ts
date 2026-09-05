import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '../../types';

const { getTreeClientMock } = vi.hoisted(() => ({
  getTreeClientMock: vi.fn(),
}));

vi.mock('../supabaseTreeClient', () => ({
  getTreeClient: getTreeClientMock,
}));

vi.mock('../../features/activity-log/service', () => ({
  activityService: {
    logAction: vi.fn(),
  },
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
}));

import { createTreeWithRootAtomic, importTreeContent } from '../supabaseTreeMutationService';

describe('createTreeWithRootAtomic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the create_tree_with_root RPC and sends only the root fields the RPC accepts', async () => {
    const rpcMock = vi.fn(async () => ({ data: 'tree-1', error: null }));
    getTreeClientMock.mockReturnValue({ rpc: rpcMock });

    const rootPerson = {
      id: 'person-1',
      firstName: 'Sara',
      lastName: 'Haddad',
      gender: 'female',
      birthDate: '1990-01-01',
      bio: 'Should not be sent to this RPC contract.',
    } as Person;

    const result = await createTreeWithRootAtomic(
      'owner-1',
      'owner@example.com',
      'Family tree',
      rootPerson,
      'token-1'
    );

    expect(result).toBe('tree-1');
    expect(getTreeClientMock).toHaveBeenCalledWith('owner-1', 'owner@example.com', 'token-1');
    expect(rpcMock).toHaveBeenCalledWith('create_tree_with_root', {
      p_owner_id: 'owner-1',
      p_tree_name: 'Family tree',
      p_root_person_data: {
        id: 'person-1',
        first_name: 'Sara',
        last_name: 'Haddad',
        gender: 'female',
      },
    });
  });

  it('passes optional default settings to the create_tree_with_root RPC', async () => {
    const rpcMock = vi.fn(async () => ({ data: 'tree-1', error: null }));
    getTreeClientMock.mockReturnValue({ rpc: rpcMock });

    await createTreeWithRootAtomic(
      'owner-1',
      'owner@example.com',
      'Family tree',
      { id: 'person-1', firstName: 'Sara', lastName: 'Haddad', gender: 'female' } as Person,
      'token-1',
      { chartType: 'radial', showPhotos: false }
    );

    expect(rpcMock).toHaveBeenCalledWith('create_tree_with_root', expect.objectContaining({
      p_settings: { chartType: 'radial', showPhotos: false },
    }));
  });

  it('throws when create_tree_with_root rejects the request', async () => {
    const rpcError = new Error('access denied');
    const rpcMock = vi.fn(async () => ({ data: null, error: rpcError }));
    getTreeClientMock.mockReturnValue({ rpc: rpcMock });

    await expect(
      createTreeWithRootAtomic(
        'owner-1',
        'owner@example.com',
        'Family tree',
        { id: 'person-1', firstName: 'Sara', lastName: 'Haddad', gender: 'female' } as Person
      )
    ).rejects.toThrow('access denied');
  });

  it('imports typed media in custom fields while stripping transport media from metadata', async () => {
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    getTreeClientMock.mockReturnValue({ rpc: rpcMock });
    const photoAsset = {
      schemaVersion: 1 as const,
      provider: 'supabase-private' as const,
      bucket: 'person-media' as const,
      assetId: '123e4567-e89b-42d3-a456-426614174000',
      kind: 'profile-photo' as const,
      objectPath: 'tree-1/profile-photo/123e4567-e89b-42d3-a456-426614174000.png',
      mimeType: 'image/png' as const,
      byteLength: 8,
      version: 1,
      createdAt: '2026-09-05T00:00:00.000Z',
    };
    const person = {
      id: 'person-1', firstName: 'Sara', lastName: 'Haddad', gender: 'female',
      parents: [], children: [], spouses: [], gallery: [], voiceNotes: [],
      photoAsset,
      customFields: { retainedImportField: 'yes', photoAsset: { malicious: true } },
      metadata: { safe: 'yes', photoPath: 'must-not-persist', gallery: ['must-not-persist'] },
    } as unknown as Person;

    await importTreeContent('tree-1', 'owner-1', [person], [], 'owner@example.test', 'token-1');

    const [, rpcPayload] = rpcMock.mock.calls[0] as unknown as [
      string,
      { p_people: Array<{ customFields: Record<string, unknown>; metadata: Record<string, unknown> }> },
    ];
    const payload = rpcPayload.p_people[0];
    expect(payload.customFields).toMatchObject({ retainedImportField: 'yes', photoAsset, gallery: [] });
    expect(payload.metadata).toEqual({ safe: 'yes' });
    expect(JSON.stringify(payload.metadata)).not.toContain('must-not-persist');
  });
});
