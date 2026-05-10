import { getSupabaseFull, getSupabaseWithAuth } from './supabaseClient';
import { logError, logInfo, logWarn } from '../utils/errorLogger';

export interface TreeInvitation {
  id: string;
  tree_id: string;
  invited_email: string;
  invited_uid?: string | null;
  role: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'declined' | 'expired';
  invited_by: string;
  accepted_by?: string | null;
  created_at: string;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
}

const getClient = (uid: string, email: string, token?: string) =>
  getSupabaseWithAuth(uid, email, token);

export const listTreeInvitations = async (
  treeId: string,
  ownerUid: string,
  ownerEmail: string,
  token?: string
): Promise<TreeInvitation[]> => {
  try {
    const client = getClient(ownerUid, ownerEmail, token);
    const { data, error } = await client
      .from('tree_invitations')
      .select('*')
      .eq('tree_id', treeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const invitations = (data ?? []) as TreeInvitation[];
    logInfo('TreeInvitationService listTreeInvitations', 'Loaded tree invitations.', {
      treeId,
      ownerUid,
      invitationCount: invitations.length,
    });
    return invitations;
  } catch (error) {
    logError('TreeInvitationService listTreeInvitations', error, {
      category: 'DATABASE',
      severity: 'LOW',
      metadata: { treeId, ownerUid }
    });
    throw error;
  }
};

export const createTreeInvitation = async (
  treeId: string,
  invitedEmail: string,
  role: 'editor' | 'viewer',
  ownerUid: string,
  ownerEmail: string,
  token?: string
): Promise<{ invitationId: string; inviteToken: string }> => {
  const normalizedEmail = invitedEmail.trim().toLowerCase();

  try {
    const client = getClient(ownerUid, ownerEmail, token);
    const { data, error } = await client.rpc('create_tree_invitation', {
      p_tree_id: treeId,
      p_invited_email: normalizedEmail,
      p_role: role,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const result = {
      invitationId: row?.invitation_id as string,
      inviteToken: row?.invite_token as string,
    };

    logInfo('TreeInvitationService createTreeInvitation', 'Created tree invitation.', {
      treeId,
      ownerUid,
      invitedEmail: normalizedEmail,
      role,
      invitationId: result.invitationId,
    });

    return result;
  } catch (error) {
    logError('TreeInvitationService createTreeInvitation', error, {
      category: 'DATABASE',
      severity: 'LOW',
      metadata: { treeId, ownerUid, invitedEmail: normalizedEmail, role }
    });
    throw error;
  }
};

export const revokeTreeInvitation = async (
  invitationId: string,
  ownerUid: string,
  ownerEmail: string,
  token?: string
): Promise<boolean> => {
  try {
    const client = getClient(ownerUid, ownerEmail, token);
    const { data, error } = await client.rpc('revoke_tree_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) throw error;
    const revoked = Boolean(data);
    logInfo('TreeInvitationService revokeTreeInvitation', 'Updated invitation revoke status.', {
      invitationId,
      ownerUid,
      revoked,
    });
    return revoked;
  } catch (error) {
    logError('TreeInvitationService revokeTreeInvitation', error, {
      category: 'DATABASE',
      severity: 'LOW',
      metadata: { invitationId, ownerUid }
    });
    throw error;
  }
};

export const listMyPendingInvitations = async (
  uid: string,
  email: string,
  token?: string
): Promise<TreeInvitation[]> => {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const client = getClient(uid, email, token);
    const { data, error } = await client
      .from('tree_invitations')
      .select('*')
      .eq('status', 'pending')
      .or(`invited_uid.eq.${uid},invited_email.eq.${normalizedEmail}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const invitations = (data ?? []) as TreeInvitation[];
    logInfo('TreeInvitationService listMyPendingInvitations', 'Loaded pending invitations.', {
      uid,
      invitationCount: invitations.length,
    });
    return invitations;
  } catch (error) {
    logError('TreeInvitationService listMyPendingInvitations', error, {
      category: 'DATABASE',
      severity: 'LOW',
      metadata: { uid, normalizedEmail }
    });
    throw error;
  }
};

export const acceptTreeInvitation = async (
  inviteToken: string,
  uid: string,
  email: string,
  token?: string
): Promise<{ treeId: string; role: 'editor' | 'viewer'; invitationId: string }> => {
  try {
    const client = getClient(uid, email, token);
    const { data, error } = await client.rpc('accept_tree_invitation', {
      p_invite_token: inviteToken,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const result = {
      treeId: row?.tree_id as string,
      role: row?.role as 'editor' | 'viewer',
      invitationId: row?.invitation_id as string,
    };
    logInfo('TreeInvitationService acceptTreeInvitation', 'Accepted tree invitation by token.', {
      uid,
      invitationId: result.invitationId,
      treeId: result.treeId,
      role: result.role,
    });
    return result;
  } catch (error) {
    logError('TreeInvitationService acceptTreeInvitation', error, {
      category: 'DATABASE',
      severity: 'LOW',
      metadata: { uid, inviteToken }
    });
    throw error;
  }
};

export const acceptTreeInvitationById = async (
  invitationId: string,
  uid: string,
  email: string,
  token?: string
): Promise<{ treeId: string; role: 'editor' | 'viewer'; invitationId: string }> => {
  try {
    const client = getClient(uid, email, token);
    const { data, error } = await client.rpc('accept_tree_invitation_by_id', {
      p_invitation_id: invitationId,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const result = {
      treeId: (row?.tree_id ?? row?.out_tree_id) as string,
      role: (row?.role ?? row?.out_role) as 'editor' | 'viewer',
      invitationId: (row?.invitation_id ?? row?.out_invitation_id) as string,
    };
    logInfo('TreeInvitationService acceptTreeInvitationById', 'Accepted tree invitation by id.', {
      uid,
      invitationId: result.invitationId,
      treeId: result.treeId,
      role: result.role,
    });
    return result;
  } catch (error) {
    logError('TreeInvitationService acceptTreeInvitationById', error, {
      category: 'DATABASE',
      severity: 'LOW',
      metadata: { uid, invitationId }
    });
    throw error;
  }
};

export const declineTreeInvitation = async (
  invitationId: string,
  uid: string,
  email: string,
  token?: string
): Promise<boolean> => {
  try {
    const client = getClient(uid, email, token);
    const { data, error } = await client.rpc('decline_tree_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) throw error;
    const declined = Boolean(data);
    logInfo('TreeInvitationService declineTreeInvitation', 'Updated invitation decline status.', {
      uid,
      invitationId,
      declined,
    });
    return declined;
  } catch (error) {
    logError('TreeInvitationService declineTreeInvitation', error, {
      category: 'DATABASE',
      severity: 'LOW',
      metadata: { uid, invitationId }
    });
    throw error;
  }
};

export const subscribeToMyInvitations = (
  uid: string,
  email: string,
  token: string | undefined,
  onInvitationEvent: (payload: TreeInvitation) => void
) => {
  const normalizedEmail = email.trim().toLowerCase();
  let channel: { unsubscribe: () => void } | null = null;
  let closed = false;

  const client = getSupabaseFull(uid, email, token);
  if (!closed) {
    channel = client
      .channel(`tree_invitations:user:${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tree_invitations',
        },
        (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as TreeInvitation | undefined;
          if (!row) return;

          const isTargetedUser =
            (row.invited_uid && row.invited_uid === uid) ||
            row.invited_email?.toLowerCase() === normalizedEmail;

          if (isTargetedUser) {
            logInfo('TreeInvitationService subscribeToMyInvitations', 'Delivered invitation realtime event.', {
              uid,
              invitationId: row.id,
              invitationStatus: row.status,
              eventType: payload.eventType,
            });
            onInvitationEvent(row);
            return;
          }

          logInfo('TreeInvitationService subscribeToMyInvitations', 'Ignored invitation realtime event for another user.', {
            uid,
            invitationId: row.id,
            invitationStatus: row.status,
            eventType: payload.eventType,
            invitedUid: row.invited_uid,
            invitedEmail: row.invited_email,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logInfo('TreeInvitationService subscribeToMyInvitations', 'Subscribed to invitation realtime channel.', {
            uid,
          });
          return;
        }

        if (status === 'CHANNEL_ERROR') {
          logError('TreeInvitationService subscribeToMyInvitations', new Error('Realtime invitation channel failed'), {
            category: 'SYNC',
            severity: 'LOW',
            showToast: false,
            metadata: { uid }
          });
          return;
        }

        if (status === 'CLOSED') {
          logInfo('TreeInvitationService subscribeToMyInvitations', 'Invitation realtime channel closed.', {
            uid,
            status,
          });
          return;
        }

        logWarn('TreeInvitationService subscribeToMyInvitations', 'Invitation realtime channel changed status.', {
          category: 'SYNC',
          metadata: { uid, status }
        });
      });
  }

  return {
    unsubscribe: () => {
      closed = true;
      channel?.unsubscribe();
    },
  };
};

export const subscribeToOwnedInvitations = (
  uid: string,
  email: string,
  token: string | undefined,
  onInvitationEvent: (payload: TreeInvitation) => void
) => {
  let channel: { unsubscribe: () => void } | null = null;
  let closed = false;

  const client = getSupabaseFull(uid, email, token);
  if (!closed) {
    channel = client
      .channel(`tree_invitations:owner:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tree_invitations',
          filter: `invited_by=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as TreeInvitation | undefined;
          if (row) {
            logInfo('TreeInvitationService subscribeToOwnedInvitations', 'Delivered owned invitation realtime event.', {
              uid,
              invitationId: row.id,
              invitationStatus: row.status,
              eventType: payload.eventType,
            });
            onInvitationEvent(row);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logInfo('TreeInvitationService subscribeToOwnedInvitations', 'Subscribed to owned invitation realtime channel.', {
            uid,
          });
          return;
        }

        if (status === 'CHANNEL_ERROR') {
          logError('TreeInvitationService subscribeToOwnedInvitations', new Error('Realtime owned invitation channel failed'), {
            category: 'SYNC',
            severity: 'LOW',
            showToast: false,
            metadata: { uid }
          });
          return;
        }

        if (status === 'CLOSED') {
          logInfo('TreeInvitationService subscribeToOwnedInvitations', 'Owned invitation realtime channel closed.', {
            uid,
            status,
          });
          return;
        }

        logWarn('TreeInvitationService subscribeToOwnedInvitations', 'Owned invitation realtime channel changed status.', {
          category: 'SYNC',
          metadata: { uid, status }
        });
      });
  }

  return {
    unsubscribe: () => {
      closed = true;
      channel?.unsubscribe();
    },
  };
};
