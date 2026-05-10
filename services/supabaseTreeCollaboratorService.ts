import { getTreeClient } from './supabaseTreeClient';
import type { Collaborator } from './supabaseTreeTypes';

export const getTreeCollaborators = async (
  treeId: string,
  ownerId: string,
  ownerEmail: string,
  token?: string
): Promise<Collaborator[]> => {
  const client = getTreeClient(ownerId, ownerEmail, token);
  const { data, error } = await client
    .from('tree_collaborators')
    .select('*')
    .eq('tree_id', treeId)
    .order('invited_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const inviteCollaborator = async (
  treeId: string,
  email: string,
  role: 'editor' | 'viewer',
  ownerId: string,
  ownerEmail: string,
  token?: string
): Promise<void> => {
  const client = getTreeClient(ownerId, ownerEmail, token);
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await client
    .from('tree_collaborators')
    .insert({ tree_id: treeId, email: normalizedEmail, role, invited_by: ownerId });
  if (error) {
    if (error.code === '23505') throw new Error('This collaborator has already been invited to this tree.');
    throw error;
  }
};

export const updateCollaboratorRole = async (
  treeId: string,
  email: string,
  newRole: 'editor' | 'viewer',
  ownerId: string,
  ownerEmail: string,
  token?: string,
  collaboratorId?: string
): Promise<void> => {
  const client = getTreeClient(ownerId, ownerEmail, token);
  const normalizedEmail = email.trim().toLowerCase();
  let query = client.from('tree_collaborators').update({ role: newRole }).eq('tree_id', treeId);
  query = collaboratorId ? query.eq('id', collaboratorId) : query.eq('email', normalizedEmail);
  const { error } = await query;
  if (error) throw error;
};

export const revokeCollaboratorAccess = async (
  treeId: string,
  email: string,
  ownerId: string,
  ownerEmail: string,
  token?: string,
  collaboratorId?: string
): Promise<void> => {
  const client = getTreeClient(ownerId, ownerEmail, token);
  const normalizedEmail = email.trim().toLowerCase();
  let query = client.from('tree_collaborators').delete().eq('tree_id', treeId);
  query = collaboratorId ? query.eq('id', collaboratorId) : query.eq('email', normalizedEmail);
  const { error } = await query;
  if (error) throw error;
};
