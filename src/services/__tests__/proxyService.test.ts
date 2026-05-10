import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchTreeMock } = vi.hoisted(() => ({
  fetchTreeMock: vi.fn(),
}));

vi.mock('../supabaseTreeReadService', () => ({
  fetchTree: fetchTreeMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  getUserFacingErrorInfo: (error: unknown, fallback: string) => ({
    message: typeof error === 'string' && error.trim() ? error : fallback,
  }),
}));

import { loadSharedFile, saveSharedFile } from '../proxyService';

describe('proxyService.loadSharedFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns the tree name alongside people for database-backed shared trees', async () => {
    const tokenPayload = btoa(JSON.stringify({ sub: 'user-1', email: 'viewer@example.com' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const token = `header.${tokenPayload}.signature`;

    localStorage.setItem('jozor_supabase_token', token);
    fetchTreeMock.mockResolvedValue({
      people: { root: { id: 'root', firstName: 'Root' } },
      focusId: 'root',
      settings: {},
      ownerId: 'owner-1',
      lastVersion: 5,
      name: 'Shared Cedar',
    });

    const result = await loadSharedFile('tree-1', true);

    expect(fetchTreeMock).toHaveBeenCalledWith(
      'tree-1',
      'user-1',
      'viewer@example.com',
      token
    );
    expect(result).toEqual({
      people: { root: { id: 'root', firstName: 'Root' } },
      treeName: 'Shared Cedar',
    });
  });

  it('prefers the explicit Supabase token over the stored token for database-backed trees', async () => {
    const storedPayload = btoa(JSON.stringify({ sub: 'stored-user', email: 'stored@example.com' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const explicitPayload = btoa(JSON.stringify({ sub: 'live-user', email: 'live@example.com' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const storedToken = `header.${storedPayload}.signature`;
    const explicitToken = `header.${explicitPayload}.signature`;

    localStorage.setItem('jozor_supabase_token', storedToken);
    fetchTreeMock.mockResolvedValue({
      people: {},
      focusId: undefined,
      settings: {},
      ownerId: 'owner-1',
      lastVersion: 1,
      name: 'Live Walnut',
    });

    const result = await loadSharedFile('tree-9', true, explicitToken);

    expect(fetchTreeMock).toHaveBeenCalledWith(
      'tree-9',
      'live-user',
      'live@example.com',
      explicitToken
    );
    expect(result.treeName).toBe('Live Walnut');
  });

  it('fails early for legacy Google Drive shared links without calling the proxy', async () => {
    const fetchMock = vi.mocked(fetch);

    await expect(loadSharedFile('file-7', false, 'explicit-token-123')).rejects.toThrow(
      'Legacy Google Drive shared links are no longer supported.'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not require a token before blocking a legacy shared tree', async () => {
    await expect(loadSharedFile('file-9', false)).rejects.toThrow(
      'Legacy Google Drive shared links are no longer supported.'
    );
  });

  it('does not call the proxy for disabled legacy not-found scenarios', async () => {
    const fetchMock = vi.mocked(fetch);

    await expect(loadSharedFile('file-404', false, 'token-404')).rejects.toThrow(
      'Legacy Google Drive shared links are no longer supported.'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the proxy for disabled legacy permission scenarios', async () => {
    const fetchMock = vi.mocked(fetch);

    await expect(loadSharedFile('file-403', false, 'token-403')).rejects.toThrow(
      'Legacy Google Drive shared links are no longer supported.'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the proxy for disabled legacy expired-session scenarios', async () => {
    const fetchMock = vi.mocked(fetch);

    await expect(loadSharedFile('file-401', false, 'token-401')).rejects.toThrow(
      'Legacy Google Drive shared links are no longer supported.'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails early when no token is available for a database-backed shared tree', async () => {
    await expect(loadSharedFile('tree-10', true)).rejects.toThrow(
      'Please sign in to view this shared tree.'
    );
  });

  it('fails early when the database-backed shared tree token is missing identity fields', async () => {
    const malformedPayload = btoa(JSON.stringify({ foo: 'bar' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const malformedToken = `header.${malformedPayload}.signature`;

    await expect(loadSharedFile('tree-11', true, malformedToken)).rejects.toThrow(
      'Your session is missing required identity information.'
    );
  });

  it('uses the explicit token when saving shared tree content through the proxy', async () => {
    const fetchMock = vi.mocked(fetch);
    const explicitToken = 'explicit-save-token';
    const content = {
      root: { id: 'root', firstName: 'Saver' },
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await saveSharedFile('tree-5', content as never, explicitToken);

    expect(fetchMock).toHaveBeenCalledWith('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${explicitToken}`,
      },
      body: JSON.stringify({ treeId: 'tree-5', content }),
    });
  });

  it('surfaces a permission error when saving a shared tree is forbidden', async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'forbidden' }),
    } as Response);

    await expect(
      saveSharedFile('tree-5', { root: { id: 'root', firstName: 'Saver' } } as never, 'token-1')
    ).rejects.toThrow('You do not have permission to update this shared tree.');
  });

  it('falls back to the stored token when saving shared tree content without an explicit token', async () => {
    const fetchMock = vi.mocked(fetch);
    localStorage.setItem('jozor_supabase_token', 'stored-save-token');

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await saveSharedFile('tree-6', { root: { id: 'root', firstName: 'Stored' } } as never);

    expect(fetchMock).toHaveBeenCalledWith('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer stored-save-token',
      },
      body: JSON.stringify({
        treeId: 'tree-6',
        content: { root: { id: 'root', firstName: 'Stored' } },
      }),
    });
  });

  it('fails early when no token is available for saving shared tree content', async () => {
    await expect(
      saveSharedFile('tree-7', { root: { id: 'root', firstName: 'Anon' } } as never)
    ).rejects.toThrow('Authentication required');
  });

  it('maps expired-session errors when saving a shared tree through the proxy', async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'expired' }),
    } as Response);

    await expect(
      saveSharedFile('tree-9', { root: { id: 'root', firstName: 'Expired' } } as never, 'token-9')
    ).rejects.toThrow('Your session has expired. Please sign in again.');
  });
});
