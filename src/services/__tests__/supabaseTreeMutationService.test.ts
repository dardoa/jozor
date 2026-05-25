import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '../../types';

const { getTreeClientMock } = vi.hoisted(() => ({
  getTreeClientMock: vi.fn(),
}));

vi.mock('../supabaseTreeClient', () => ({
  getTreeClient: getTreeClientMock,
}));

vi.mock('../../features/activity-log', () => ({
  activityService: {
    logAction: vi.fn(),
  },
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
}));

import { createTreeWithRootAtomic } from '../supabaseTreeMutationService';

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
});
