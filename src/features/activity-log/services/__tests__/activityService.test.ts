import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSupabaseFullMock, getSupabaseWithAuthMock } = vi.hoisted(() => ({
  getSupabaseFullMock: vi.fn(),
  getSupabaseWithAuthMock: vi.fn(),
}));

vi.mock('../../../../services/supabaseClient', () => ({
  getSupabaseFull: getSupabaseFullMock,
  getSupabaseWithAuth: getSupabaseWithAuthMock,
}));

const { logErrorMock, logInfoMock } = vi.hoisted(() => ({
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
}));

vi.mock('../../../../utils/errorLogger', () => ({
  logError: logErrorMock,
  logInfo: logInfoMock,
}));

const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));
vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: {
    getState: mockGetState,
  },
}));

import { activityService } from '../activityService';

describe('activityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({
      user: {
        uid: 'user-1',
        email: 'user@example.com',
        supabaseToken: 'token-1',
      },
    });
  });

  describe('logAction', () => {
    it('returns early if there is no authenticated user', async () => {
      mockGetState.mockReturnValue({ user: null });
      await activityService.logAction('tree-1', 'ADD_PERSON', { name: 'Salem' });
      expect(getSupabaseWithAuthMock).not.toHaveBeenCalled();
    });

    it('returns early if there is no treeId', async () => {
      await activityService.logAction('', 'ADD_PERSON', { name: 'Salem' });
      expect(getSupabaseWithAuthMock).not.toHaveBeenCalled();
    });

    it('logs action successfully to database and calls logInfo', async () => {
      const insertMock = vi.fn(async () => ({ error: null }));
      const fromMock = vi.fn(() => ({ insert: insertMock }));
      getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

      await activityService.logAction('tree-1', 'ADD_PERSON', { name: 'Salem' });

      expect(getSupabaseWithAuthMock).toHaveBeenCalledWith('user-1', 'user@example.com', 'token-1');
      expect(fromMock).toHaveBeenCalledWith('activity_logs');
      expect(insertMock).toHaveBeenCalledWith({
        tree_id: 'tree-1',
        user_id: 'user-1',
        user_email: 'user@example.com',
        action_type: 'ADD_PERSON',
        details: { name: 'Salem' },
      });
      expect(logInfoMock).toHaveBeenCalledWith(
        'ActivityService logAction',
        'Logged activity action.',
        { treeId: 'tree-1', actionType: 'ADD_PERSON' }
      );
      expect(logErrorMock).not.toHaveBeenCalled();
    });

    it('handles database insert error and calls logError', async () => {
      const dbError = { message: 'Duplicate key value violates unique constraint' };
      const insertMock = vi.fn(async () => ({ error: dbError }));
      const fromMock = vi.fn(() => ({ insert: insertMock }));
      getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

      await activityService.logAction('tree-1', 'ADD_PERSON', { name: 'Salem' });

      expect(logErrorMock).toHaveBeenCalledWith(
        'ActivityService logAction',
        dbError,
        {
          category: 'DATABASE',
          severity: 'LOW',
          metadata: { treeId: 'tree-1', actionType: 'ADD_PERSON' },
        }
      );
      expect(logInfoMock).not.toHaveBeenCalled();
    });

    it('catches unexpected exceptions and calls logError', async () => {
      const unexpectedError = new Error('Network timeout');
      getSupabaseWithAuthMock.mockImplementation(() => {
        throw unexpectedError;
      });

      await activityService.logAction('tree-1', 'ADD_PERSON', { name: 'Salem' });

      expect(logErrorMock).toHaveBeenCalledWith(
        'ActivityService logAction',
        unexpectedError,
        {
          category: 'UNEXPECTED',
          severity: 'LOW',
          metadata: { treeId: 'tree-1', actionType: 'ADD_PERSON' },
        }
      );
      expect(logInfoMock).not.toHaveBeenCalled();
    });
  });

  describe('fetchLogs', () => {
    it('returns empty array if there is no authenticated user', async () => {
      mockGetState.mockReturnValue({ user: null });
      const logs = await activityService.fetchLogs('tree-1');
      expect(logs).toEqual([]);
      expect(getSupabaseWithAuthMock).not.toHaveBeenCalled();
    });

    it('returns empty array if there is no treeId', async () => {
      const logs = await activityService.fetchLogs('');
      expect(logs).toEqual([]);
      expect(getSupabaseWithAuthMock).not.toHaveBeenCalled();
    });

    it('fetches logs successfully and respects page, pageSize, and userEmail filters', async () => {
      const mockLogs = [{ id: 'log-1', action_type: 'ADD_PERSON' }];
      const rangeMock = vi.fn(async () => ({ data: mockLogs, error: null }));
      const orderMock = vi.fn(() => ({ range: rangeMock }));
      const eqEmailMock = vi.fn(() => ({ order: orderMock }));
      const eqTreeMock = vi.fn(() => ({ eq: eqEmailMock }));
      const selectMock = vi.fn(() => ({ eq: eqTreeMock }));
      const fromMock = vi.fn(() => ({ select: selectMock }));
      getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

      const logs = await activityService.fetchLogs('tree-1', 2, 10, 'other@example.com');

      expect(getSupabaseWithAuthMock).toHaveBeenCalledWith('user-1', 'user@example.com', 'token-1');
      expect(fromMock).toHaveBeenCalledWith('activity_logs');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqTreeMock).toHaveBeenCalledWith('tree_id', 'tree-1');
      expect(eqEmailMock).toHaveBeenCalledWith('user_email', 'other@example.com');
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(rangeMock).toHaveBeenCalledWith(20, 29); // page 2, pageSize 10 -> range 20 to 29
      expect(logs).toEqual(mockLogs);
      expect(logErrorMock).not.toHaveBeenCalled();
    });

    it('handles database fetch error and returns empty array', async () => {
      const dbError = { message: 'Database connection failed' };
      const rangeMock = vi.fn(async () => ({ data: null, error: dbError }));
      const orderMock = vi.fn(() => ({ range: rangeMock }));
      const eqTreeMock = vi.fn(() => ({ order: orderMock }));
      const selectMock = vi.fn(() => ({ eq: eqTreeMock }));
      const fromMock = vi.fn(() => ({ select: selectMock }));
      getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

      const logs = await activityService.fetchLogs('tree-1', 0, 50);

      expect(logs).toEqual([]);
      expect(logErrorMock).toHaveBeenCalledWith(
        'ActivityService fetchLogs',
        dbError,
        {
          category: 'DATABASE',
          severity: 'LOW',
          metadata: { treeId: 'tree-1', page: 0, pageSize: 50, userEmail: undefined },
        }
      );
    });
  });

  describe('subscribeToLogs', () => {
    it('returns null if there is no authenticated user', () => {
      mockGetState.mockReturnValue({ user: null });
      const subscription = activityService.subscribeToLogs('tree-1', vi.fn());
      expect(subscription).toBeNull();
      expect(getSupabaseFullMock).not.toHaveBeenCalled();
    });

    it('returns null if there is no treeId', () => {
      const subscription = activityService.subscribeToLogs('', vi.fn());
      expect(subscription).toBeNull();
      expect(getSupabaseFullMock).not.toHaveBeenCalled();
    });

    it('creates real-time subscription channel and allows unsubscribing', () => {
      const unsubscribeMock = vi.fn();
      const subscribeMock = vi.fn(() => ({ unsubscribe: unsubscribeMock }));
      type RealtimePayload = { new: unknown };
      type RealtimeCallback = (payload: RealtimePayload) => void;
      const onMock = vi.fn((
        _event: 'postgres_changes',
        _config: Record<string, unknown>,
        _callback: RealtimeCallback
      ) => ({ subscribe: subscribeMock }));
      const channelMock = vi.fn(() => ({ on: onMock, unsubscribe: unsubscribeMock }));
      getSupabaseFullMock.mockReturnValue({ channel: channelMock });

      const callback = vi.fn();
      const subscription = activityService.subscribeToLogs('tree-1', callback);

      expect(getSupabaseFullMock).toHaveBeenCalledWith('user-1', 'user@example.com', 'token-1');
      expect(channelMock).toHaveBeenCalledWith('activity_logs:tree-1');
      expect(onMock).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: 'tree_id=eq.tree-1',
        },
        expect.any(Function)
      );
      expect(subscribeMock).toHaveBeenCalled();

      // Trigger the callback inside the mocked channel listener
      const channelCallback = onMock.mock.calls[0][2];
      channelCallback({ new: { id: 'new-log', action_type: 'UPDATE_PERSON' } });
      expect(callback).toHaveBeenCalledWith({ id: 'new-log', action_type: 'UPDATE_PERSON' });

      // Unsubscribe
      expect(subscription).not.toBeNull();
      subscription!.unsubscribe();
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
