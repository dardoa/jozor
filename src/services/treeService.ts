import { authTokenService } from './authTokenService';
import { getSupabaseFull } from './supabaseClient';

export interface ResolvedTreeContext {
  treeId: string;
  ownerId: string;
  role: 'owner' | 'editor' | 'viewer';
  accessType: 'owner' | 'collaborator';
}

const treeContextCache = new Map<string, ResolvedTreeContext>();

export const clearResolvedTreeContextCache = () => {
  treeContextCache.clear();
};

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

  const cached = treeContextCache.get(normalizedPersonId);
  if (cached) {
    return cached;
  }

  const token = await authTokenService.getPreferredSupabaseToken(supabaseToken);
  const client = getSupabaseFull(undefined, undefined, token || undefined);
  const { data, error } = await client.functions.invoke<ResolvedTreeContext>('resolve-tree-context', {
    body: { personId: normalizedPersonId },
  });

  if (error) {
    throw error;
  }

  if (!data?.treeId) {
    throw new Error('Tree context resolver returned an invalid response.');
  }

  treeContextCache.set(normalizedPersonId, data);
  return data;
};
