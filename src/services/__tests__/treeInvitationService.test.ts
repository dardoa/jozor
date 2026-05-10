import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSupabaseWithAuthMock,
  getSupabaseFullMock,
  logErrorMock,
  logInfoMock,
  logWarnMock,
} = vi.hoisted(() => ({
  getSupabaseWithAuthMock: vi.fn(),
  getSupabaseFullMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  getSupabaseWithAuth: getSupabaseWithAuthMock,
  getSupabaseFull: getSupabaseFullMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: logErrorMock,
  logInfo: logInfoMock,
  logWarn: logWarnMock,
}));

import {
  acceptTreeInvitation,
  acceptTreeInvitationById,
  createTreeInvitation,
  declineTreeInvitation,
  listMyPendingInvitations,
  revokeTreeInvitation,
  subscribeToMyInvitations,
  subscribeToOwnedInvitations,
} from '../treeInvitationService';

type QueryResult<T> = { data: T; error: unknown };

const createQueryBuilder = <T>(result: QueryResult<T>) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: <TReturn, TError = never>(
      resolve?: ((value: QueryResult<T>) => TReturn | PromiseLike<TReturn>) | null,
      reject?: ((reason: unknown) => TError | PromiseLike<TError>) | null
    ) => Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined),
  };
  return builder;
};

describe('treeInvitationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates invitations through create_tree_invitation rpc', async () => {
    const rpcMock = vi.fn(async () => ({
      data: [{ invitation_id: 'inv-1', invite_token: 'token-1' }],
      error: null,
    }));

    getSupabaseWithAuthMock.mockReturnValue({ rpc: rpcMock });

    const result = await createTreeInvitation(
      'tree-1',
      'invitee@example.com',
      'editor',
      'owner-1',
      'owner@example.com',
      'token'
    );

    expect(result).toEqual({ invitationId: 'inv-1', inviteToken: 'token-1' });
    expect(rpcMock).toHaveBeenCalledWith('create_tree_invitation', {
      p_tree_id: 'tree-1',
      p_invited_email: 'invitee@example.com',
      p_role: 'editor',
    });
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService createTreeInvitation',
      'Created tree invitation.',
      expect.objectContaining({
        treeId: 'tree-1',
        ownerUid: 'owner-1',
        invitedEmail: 'invitee@example.com',
        role: 'editor',
        invitationId: 'inv-1',
      })
    );
  });

  it('accepts invitations through accept_tree_invitation rpc', async () => {
    const rpcMock = vi.fn(async () => ({
      data: [{ tree_id: 'tree-1', role: 'viewer', invitation_id: 'inv-1' }],
      error: null,
    }));

    getSupabaseWithAuthMock.mockReturnValue({ rpc: rpcMock });

    const result = await acceptTreeInvitation('token-1', 'user-1', 'user@example.com', 'supabase-token');

    expect(result).toEqual({ treeId: 'tree-1', role: 'viewer', invitationId: 'inv-1' });
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService acceptTreeInvitation',
      'Accepted tree invitation by token.',
      expect.objectContaining({
        uid: 'user-1',
        invitationId: 'inv-1',
        treeId: 'tree-1',
        role: 'viewer',
      })
    );
  });

  it('accepts invitations by id and supports rpc out_* response fields', async () => {
    const rpcMock = vi.fn(async () => ({
      data: [{ out_tree_id: 'tree-1', out_role: 'editor', out_invitation_id: 'inv-2' }],
      error: null,
    }));

    getSupabaseWithAuthMock.mockReturnValue({ rpc: rpcMock });

    const result = await acceptTreeInvitationById('inv-2', 'user-2', 'user@example.com', 'supabase-token');

    expect(result).toEqual({ treeId: 'tree-1', role: 'editor', invitationId: 'inv-2' });
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService acceptTreeInvitationById',
      'Accepted tree invitation by id.',
      expect.objectContaining({
        uid: 'user-2',
        invitationId: 'inv-2',
        treeId: 'tree-1',
        role: 'editor',
      })
    );
  });

  it('revokes invitations through revoke_tree_invitation rpc', async () => {
    const rpcMock = vi.fn(async () => ({ data: true, error: null }));

    getSupabaseWithAuthMock.mockReturnValue({ rpc: rpcMock });

    const result = await revokeTreeInvitation('inv-1', 'owner-1', 'owner@example.com', 'token');

    expect(result).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('revoke_tree_invitation', {
      p_invitation_id: 'inv-1',
    });
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService revokeTreeInvitation',
      'Updated invitation revoke status.',
      expect.objectContaining({
        invitationId: 'inv-1',
        ownerUid: 'owner-1',
        revoked: true,
      })
    );
  });

  it('lists pending invitations for the current user by uid/email', async () => {
    const fromMock = vi.fn(() =>
      createQueryBuilder({
        data: [
          {
            id: 'inv-1',
            tree_id: 'tree-1',
            invited_email: 'user@example.com',
            invited_uid: null,
            role: 'viewer',
            status: 'pending',
            invited_by: 'owner-1',
            created_at: '2026-03-27T00:00:00Z',
            expires_at: '2026-04-03T00:00:00Z',
          },
        ],
        error: null,
      })
    );

    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const result = await listMyPendingInvitations('user-1', 'user@example.com', 'token');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('inv-1');
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService listMyPendingInvitations',
      'Loaded pending invitations.',
      expect.objectContaining({
        uid: 'user-1',
        invitationCount: 1,
      })
    );
  });

  it('declines invitations through decline_tree_invitation rpc', async () => {
    const rpcMock = vi.fn(async () => ({ data: true, error: null }));

    getSupabaseWithAuthMock.mockReturnValue({ rpc: rpcMock });

    const result = await declineTreeInvitation('inv-3', 'user-3', 'user@example.com', 'token');

    expect(result).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('decline_tree_invitation', {
      p_invitation_id: 'inv-3',
    });
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService declineTreeInvitation',
      'Updated invitation decline status.',
      expect.objectContaining({
        uid: 'user-3',
        invitationId: 'inv-3',
        declined: true,
      })
    );
  });

  it('logs invitation creation failures with contextual metadata', async () => {
    const rpcError = new Error('rpc failed');
    const rpcMock = vi.fn(async () => ({
      data: null,
      error: rpcError,
    }));

    getSupabaseWithAuthMock.mockReturnValue({ rpc: rpcMock });

    await expect(
      createTreeInvitation(
        'tree-2',
        'invitee@example.com',
        'viewer',
        'owner-2',
        'owner@example.com',
        'token'
      )
    ).rejects.toThrow('rpc failed');

    expect(logErrorMock).toHaveBeenCalledWith(
      'TreeInvitationService createTreeInvitation',
      rpcError,
      expect.objectContaining({
        category: 'DATABASE',
        severity: 'LOW',
        metadata: expect.objectContaining({
          treeId: 'tree-2',
          ownerUid: 'owner-2',
          invitedEmail: 'invitee@example.com',
          role: 'viewer',
        }),
      })
    );
  });

  it('logs delivered and ignored realtime invitation events for the current user', async () => {
    let onChange: ((payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new?: Record<string, unknown>;
      old?: Record<string, unknown>;
    }) => void) | undefined;
    let onStatus: ((status: string) => void) | undefined;

    const subscribeMock = vi.fn((callback: (status: string) => void) => {
      onStatus = callback;
      return { unsubscribe: vi.fn() };
    });

    const channelMock = {
      on: vi.fn((_event, _filter, callback) => {
        onChange = callback;
        return channelMock;
      }),
      subscribe: subscribeMock,
    };

    getSupabaseFullMock.mockReturnValue({
      channel: vi.fn(() => channelMock),
    });

    const callback = vi.fn();
    subscribeToMyInvitations('user-1', 'user@example.com', 'token', callback);
    await vi.waitFor(() => expect(getSupabaseFullMock).toHaveBeenCalled());

    onStatus?.('SUBSCRIBED');
    onChange?.({
      eventType: 'INSERT',
      new: {
        id: 'inv-1',
        invited_uid: 'user-1',
        invited_email: 'other@example.com',
        status: 'pending',
      },
    });
    onChange?.({
      eventType: 'INSERT',
      new: {
        id: 'inv-2',
        invited_uid: 'user-2',
        invited_email: 'other@example.com',
        status: 'pending',
      },
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService subscribeToMyInvitations',
      'Subscribed to invitation realtime channel.',
      expect.objectContaining({ uid: 'user-1' })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService subscribeToMyInvitations',
      'Delivered invitation realtime event.',
      expect.objectContaining({
        uid: 'user-1',
        invitationId: 'inv-1',
        invitationStatus: 'pending',
        eventType: 'INSERT',
      })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService subscribeToMyInvitations',
      'Ignored invitation realtime event for another user.',
      expect.objectContaining({
        uid: 'user-1',
        invitationId: 'inv-2',
        invitationStatus: 'pending',
        eventType: 'INSERT',
      })
    );
  });

  it('logs owned invitation realtime lifecycle statuses', async () => {
    let onChange: ((payload: {
      eventType: 'UPDATE';
      new?: Record<string, unknown>;
    }) => void) | undefined;
    let onStatus: ((status: string) => void) | undefined;

    const subscribeMock = vi.fn((callback: (status: string) => void) => {
      onStatus = callback;
      return { unsubscribe: vi.fn() };
    });

    const channelMock = {
      on: vi.fn((_event, _filter, callback) => {
        onChange = callback;
        return channelMock;
      }),
      subscribe: subscribeMock,
    };

    getSupabaseFullMock.mockReturnValue({
      channel: vi.fn(() => channelMock),
    });

    const callback = vi.fn();
    subscribeToOwnedInvitations('owner-1', 'owner@example.com', 'token', callback);
    await vi.waitFor(() => expect(getSupabaseFullMock).toHaveBeenCalled());

    onStatus?.('SUBSCRIBED');
    onStatus?.('TIMED_OUT');
    onChange?.({
      eventType: 'UPDATE',
      new: {
        id: 'inv-3',
        status: 'declined',
      },
    });
    onStatus?.('CHANNEL_ERROR');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService subscribeToOwnedInvitations',
      'Subscribed to owned invitation realtime channel.',
      expect.objectContaining({ uid: 'owner-1' })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      'TreeInvitationService subscribeToOwnedInvitations',
      'Delivered owned invitation realtime event.',
      expect.objectContaining({
        uid: 'owner-1',
        invitationId: 'inv-3',
        invitationStatus: 'declined',
        eventType: 'UPDATE',
      })
    );
    expect(logWarnMock).toHaveBeenCalledWith(
      'TreeInvitationService subscribeToOwnedInvitations',
      'Owned invitation realtime channel changed status.',
      expect.objectContaining({
        category: 'SYNC',
        metadata: expect.objectContaining({
          uid: 'owner-1',
          status: 'TIMED_OUT',
        }),
      })
    );
    expect(logErrorMock).toHaveBeenCalledWith(
      'TreeInvitationService subscribeToOwnedInvitations',
      expect.any(Error),
      expect.objectContaining({
        category: 'SYNC',
        severity: 'LOW',
        metadata: expect.objectContaining({ uid: 'owner-1' }),
      })
    );
  });
});
