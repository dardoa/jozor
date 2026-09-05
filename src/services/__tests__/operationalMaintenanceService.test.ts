
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  migrateLegacyPersonMedia,
  pruneActivityLogs,
  pruneTreeOperations,
} from '../operationalMaintenanceService';

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

  it('runs private person media migration batches to completion and aggregates their counts', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        scannedCount: 10,
        migratedCount: 2,
        cleanedCount: 2,
        blockedCount: 0,
        externalCount: 1,
        failedCount: 0,
        nextOffset: 10,
        complete: false,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        scannedCount: 3,
        migratedCount: 1,
        cleanedCount: 2,
        blockedCount: 1,
        externalCount: 0,
        failedCount: 1,
        nextOffset: 13,
        complete: true,
      }), { status: 200 }));

    const result = await migrateLegacyPersonMedia('tree-5', {
      uid: 'user-5',
      email: 'owner@example.com',
      supabaseToken: 'token',
    });

    expect(result).toEqual({
      scannedCount: 13,
      migratedCount: 3,
      cleanedCount: 4,
      blockedCount: 1,
      externalCount: 1,
      failedCount: 1,
      complete: true,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/person-media-migration', expect.objectContaining({
      body: JSON.stringify({ treeId: 'tree-5', offset: 0, limit: 10 }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/person-media-migration', expect.objectContaining({
      body: JSON.stringify({ treeId: 'tree-5', offset: 10, limit: 10 }),
    }));
  });

  it('fails closed on a malformed or non-advancing person media migration response', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      scannedCount: 10,
      migratedCount: 0,
      cleanedCount: 0,
      blockedCount: 0,
      externalCount: 0,
      failedCount: 0,
      nextOffset: 0,
      complete: false,
    }), { status: 200 }));

    await expect(migrateLegacyPersonMedia('tree-6', {
      uid: 'user-6',
      email: 'owner@example.com',
      supabaseToken: 'token',
    })).rejects.toThrow('Person media migration failed.');
  });
});

