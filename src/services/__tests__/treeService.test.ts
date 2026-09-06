
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();
const tokenMock = vi.fn();

vi.mock('../supabaseClient', () => ({
  getSupabaseFull: vi.fn(() => ({
    functions: {
      invoke: invokeMock,
    },
  })),
}));
vi.mock('../authTokenService', () => ({
  authTokenService: { getPreferredSupabaseToken: (...args: unknown[]) => tokenMock(...args) },
}));

const loadModule = async () => import('../treeService');

describe('treeService.resolveTreeByPerson', () => {
  const context = {
    treeId: '11111111-1111-4111-8111-111111111111',
    ownerId: '22222222-2222-4222-8222-222222222222',
    role: 'owner', accessType: 'owner',
  };
  beforeEach(() => {
    vi.resetAllMocks();
    tokenMock.mockImplementation(async token => token ?? 'session-token');
  });

  it('resolves each request again so a same-token role downgrade is not cached', async () => {
    invokeMock.mockResolvedValueOnce({ data: context, error: null })
      .mockResolvedValueOnce({ data: { ...context, role: 'viewer', accessType: 'collaborator' }, error: null });

    const { resolveTreeByPerson } = await loadModule();

    const first = await resolveTreeByPerson('person-1');
    const second = await resolveTreeByPerson('person-1');

    expect(first).toEqual(context);
    expect(second.role).toBe('viewer');
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenCalledWith('resolve-tree-context', {
      body: { personId: 'person-1' },
    });
  });

  it('does not reuse the previous account resolution after switching accounts', async () => {
    invokeMock.mockResolvedValueOnce({ data: context, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('No access') });
    const { resolveTreeByPerson } = await loadModule();
    await resolveTreeByPerson('person-1', 'account-a-token');
    await expect(resolveTreeByPerson('person-1', 'account-b-token')).rejects.toThrow('No access');
    const { getSupabaseFull } = await import('../supabaseClient');
    expect(getSupabaseFull).toHaveBeenLastCalledWith(undefined, undefined, 'account-b-token');
  });

  it.each([
    null, [], {}, { ...context, treeId: 'invalid' }, { ...context, ownerId: null },
    { ...context, role: 'admin' }, { ...context, accessType: 'collaborator' },
    { ...context, role: 'editor', accessType: 'owner' },
  ])('rejects malformed or inconsistent context %j', async data => {
    invokeMock.mockResolvedValue({ data, error: null });
    const { resolveTreeByPerson } = await loadModule();
    await expect(resolveTreeByPerson('person-1')).rejects.toThrow('invalid response');
  });

  it('rejects missing identity or authentication before invoking the function', async () => {
    const { resolveTreeByPerson } = await loadModule();
    await expect(resolveTreeByPerson('   ')).rejects.toThrow('personId is required');
    tokenMock.mockResolvedValue(null);
    await expect(resolveTreeByPerson('person-1')).rejects.toThrow('Authentication is required');
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

