import { logError, logWarn } from '../utils/errorLogger';
import { getTreeClient } from './supabaseTreeClient';
import type { SharedTreeSummary, TreeAccessRole } from './supabaseTreeTypes';

const buildCollaboratorIdentityFilter = (uid: string, normalizedEmail: string): string => {
  if (uid && normalizedEmail) {
    return `collaborator_uid.eq.${uid},email.eq.${normalizedEmail}`;
  }
  if (uid) {
    return `collaborator_uid.eq.${uid}`;
  }
  return `email.eq.${normalizedEmail}`;
};

export const fetchSharedTrees = async (uid: string, userEmail: string, token?: string): Promise<SharedTreeSummary[]> => {
  if (!uid && !userEmail) return [];

  try {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const client = getTreeClient(uid, normalizedEmail, token);
    const { data: collaboratorRows, error: collaboratorError } = await client
      .from('tree_collaborators')
      .select('tree_id, role, collaborator_uid, email')
      .or(buildCollaboratorIdentityFilter(uid, normalizedEmail));

    if (collaboratorError) {
      logWarn('SupabaseTreeAccessService fetchSharedTrees', 'tree_collaborators query failed.', {
        category: 'NETWORK',
        metadata: { message: collaboratorError.message },
      });
      return [];
    }

    const collaboratorEntries = (collaboratorRows ?? []).filter((row: { tree_id: string; role: 'editor' | 'viewer' }) => !!row.tree_id);
    if (collaboratorEntries.length === 0) return [];

    const treeIds = collaboratorEntries.map((row: { tree_id: string }) => row.tree_id);
    if (treeIds.length === 0) return [];

    const { data: trees, error: treeError } = await client
      .from('trees')
      .select('id, owner_id, name, created_at, updated_at')
      .in('id', treeIds);

    if (treeError) {
      logWarn('SupabaseTreeAccessService fetchSharedTrees', 'trees join query failed.', {
        category: 'NETWORK',
        metadata: { message: treeError.message },
      });
      return [];
    }

    const nonOwnedTrees = (trees ?? []).filter((tree: { owner_id: string }) => tree.owner_id !== uid);
    if (nonOwnedTrees.length === 0) return [];

    return nonOwnedTrees.map((tree: { id: string; name: string; created_at: string; updated_at?: string }) => {
      const collab = collaboratorEntries.find((entry: { tree_id: string; role: 'editor' | 'viewer' }) => entry.tree_id === tree.id);
      return {
        id: tree.id,
        name: tree.name,
        isPublic: false,
        createdAt: tree.created_at,
        updatedAt: tree.updated_at || tree.created_at,
        role: collab?.role || 'viewer',
      };
    });
  } catch (e) {
    logError('SupabaseTreeAccessService fetchSharedTrees', e, { category: 'NETWORK', severity: 'MEDIUM' });
    return [];
  }
};

export const fetchTreeAccessRole = async (
  treeId: string,
  uid: string,
  userEmail: string,
  token?: string
): Promise<TreeAccessRole> => {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const client = getTreeClient(uid, normalizedEmail, token);

  const { data: tree, error: treeError } = await client
    .from('trees')
    .select('owner_id')
    .eq('id', treeId)
    .single();

  if (treeError) throw treeError;
  if (tree.owner_id === uid) return 'owner';

  const { data: collaborator, error: collabError } = await client
    .from('tree_collaborators')
    .select('role, collaborator_uid, email')
    .eq('tree_id', treeId)
    .or(buildCollaboratorIdentityFilter(uid, normalizedEmail))
    .maybeSingle();

  if (collabError) throw collabError;
  if (collaborator?.role === 'editor' || collaborator?.role === 'viewer') {
    return collaborator.role;
  }

  return null;
};

export const claimCollaboratorMemberships = async (
  uid: string,
  userEmail: string,
  token?: string
): Promise<number> => {
  if (!uid || !userEmail) return 0;

  performance.mark('diagnostic-4-memberships-fetch-start');
  const client = getTreeClient(uid, userEmail.trim().toLowerCase(), token);
  const { data, error } = await client.rpc('claim_collaborator_memberships');
  performance.mark('diagnostic-4-memberships-fetch-end');
  performance.measure('Diagnostic Checkpoint 4: Memberships Claim', 'diagnostic-4-memberships-fetch-start', 'diagnostic-4-memberships-fetch-end');

  if (error) {
    logError('SupabaseTreeAccessService claimCollaboratorMemberships', error, {
      category: 'DATABASE',
      severity: 'LOW',
      showToast: false,
      metadata: { uid },
    });
    return 0;
  }

  return typeof data === 'number' ? data : 0;
};
