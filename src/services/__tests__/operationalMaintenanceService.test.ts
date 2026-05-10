import { describe, expect, it, vi, beforeEach } from 'vitest';
import { pruneActivityLogs, pruneTreeOperations } from '../operationalMaintenanceService';

const rpcMock = vi.fn();
const getSupabaseWithAuthMock = vi.fn(() => ({
  rpc: rpcMock,
}));

vi.mock('../supabaseClient', () => ({
  getSupabaseWithAuth: (...args: unknown[]) => getSupabaseWithAuthMock(...args),
}));

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
    rpcMock.mockReset();
    getSupabaseWithAuthMock.mockClear();
    localStorage.clear();
  });

  it('returns deleted count for tree operations pruning', async () => {
    rpcMock.mockResolvedValue({ data: 12, error: null });

    const result = await pruneTreeOperations(
      'tree-1',
      { uid: 'user-1', email: 'owner@example.com', supabaseToken: 'token' },
      500
    );

    expect(rpcMock).toHaveBeenCalledWith('prune_tree_operations', {
      p_tree_id: 'tree-1',
      p_keep_latest: 500,
    });
    expect(result).toBe(12);
  });

  it('returns deleted count for activity log pruning', async () => {
    rpcMock.mockResolvedValue({ data: 7, error: null });

    const result = await pruneActivityLogs(
      'tree-2',
      { uid: 'user-2', email: 'owner@example.com', supabaseToken: 'token' },
      30
    );

    expect(rpcMock).toHaveBeenCalledWith('prune_activity_logs', {
      p_tree_id: 'tree-2',
      p_keep_days: 30,
    });
    expect(result).toBe(7);
  });

  it('throws a user-facing error when pruning fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('db exploded') });

    await expect(
      pruneTreeOperations('tree-3', {
        uid: 'user-3',
        email: 'owner@example.com',
      })
    ).rejects.toThrow('Failed to prune old sync operations.');
  });

  it('falls back to the stored Supabase token when the caller does not provide one', async () => {
    localStorage.setItem('jozor_supabase_token', 'stored-token');
    rpcMock.mockResolvedValue({ data: 2, error: null });

    await pruneActivityLogs('tree-4', {
      uid: 'user-4',
      email: 'owner@example.com',
    });

    expect(getSupabaseWithAuthMock).toHaveBeenCalledWith(
      'user-4',
      'owner@example.com',
      'stored-token'
    );
  });
});
