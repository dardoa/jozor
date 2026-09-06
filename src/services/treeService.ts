import { authTokenService } from './authTokenService';
import { getSupabaseFull } from './supabaseClient';
import { isUuid } from '../utils/isUuid';

export interface ResolvedTreeContext {
  treeId: string;
  ownerId: string;
  role: 'owner' | 'editor' | 'viewer';
  accessType: 'owner' | 'collaborator';
}

/**
 * Resolves which tree owns a person id so cold-loaded person routes can
 * hydrate the correct tree before the main app shell renders.
 */
export const resolveTreeByPerson = async (
  personId: string,
  supabaseToken?: string | null
): Promise<ResolvedTreeContext> => {
  const normalizedPersonId = personId.trim();
  if (!normalizedPersonId) {
    throw new Error('A personId is required to resolve tree context.');
  }

  const token = await authTokenService.getPreferredSupabaseToken(supabaseToken);
  if (!token) throw new Error('Authentication is required to resolve tree context.');
  const client = getSupabaseFull(undefined, undefined, token);
  // Roles can change without a token refresh; do not cache authorization results.
  const { data, error } = await client.functions.invoke<unknown>('resolve-tree-context', {
    body: { personId: normalizedPersonId },
  });

  if (error) {
    throw error;
  }

  if (
    !data || typeof data !== 'object' || Array.isArray(data)
    || !('treeId' in data) || typeof data.treeId !== 'string' || !isUuid(data.treeId)
    || !('ownerId' in data) || typeof data.ownerId !== 'string' || !isUuid(data.ownerId)
    || !('role' in data) || !('accessType' in data)
    || !((data.role === 'owner' && data.accessType === 'owner')
      || ((data.role === 'editor' || data.role === 'viewer') && data.accessType === 'collaborator'))
  ) {
    throw new Error('Tree context resolver returned an invalid response.');
  }

  return { treeId: data.treeId, ownerId: data.ownerId, role: data.role, accessType: data.accessType };
};
