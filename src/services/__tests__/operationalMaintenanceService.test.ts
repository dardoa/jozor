
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { pruneActivityLogs, pruneTreeOperations } from '../operationalMaintenanceService';

const { fetchMock } = vi.hoisted(() => {
  const fetchMock = vi.fn();
  return { fetchMock };
});

vi.mock('../../utils/errorLogger', () => ({
  getUserFacingErrorInfo: vi.fn((error: unknown, fallbackMessage?: string) => ({
    category: 'DATABASE',
    message: fallbackMessage ?? (error instanceof Error ? error.message : 'fallback'),
    retryable: true,
  })),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

describe('operationalMaintenanceService', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  it('returns deleted count for tree operations pruning', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ deletedCount: 12 }), { status: 200 }));

    const result = await pruneTreeOperations(
      'tree-1',
      { uid: 'user-1', email: 'owner@example.com', supabaseToken: 'token' },
      500
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/maintenance', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        treeId: 'tree-1',
        mode: 'operations',
        keepLatest: 500,
      }),
    });
    expect(result).toBe(12);
  });

  it('returns deleted count for activity log pruning', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ deletedCount: 7 }), { status: 200 }));

    const result = await pruneActivityLogs(
      'tree-2',
      { uid: 'user-2', email: 'owner@example.com', supabaseToken: 'token' },
      30
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/maintenance', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        treeId: 'tree-2',
        mode: 'activity',
        keepDays: 30,
      }),
    });
    expect(result).toBe(7);
  });

  it('throws a user-facing error when pruning fails', async () => {
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ error: { message: 'Database temporarily unavailable.' } }),
      { status: 500 }
    ));

    await expect(
      pruneTreeOperations('tree-3', {
        uid: 'user-3',
        email: 'owner@example.com',
      })
    ).rejects.toThrow('Failed to prune old sync operations.');
  });

  it('falls back to the stored Supabase token when the caller does not provide one', async () => {
    localStorage.setItem('jozor_supabase_token', 'stored-token');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ deletedCount: 2 }), { status: 200 }));

    await pruneActivityLogs('tree-4', {
      uid: 'user-4',
      email: 'owner@example.com',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/maintenance', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer stored-token',
      }),
    }));
  });
});

