import { supabase, getSupabaseWithAuth } from './supabaseClient';
import type { Person, FullState } from '../types';
import { formatDateForPostgres } from '../utils/dateUtils';
import { logError } from '../utils/errorLogger';

export interface TreeSummary {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
}

/**
 * Fetches all trees owned by a specific user (Firebase uid) from Supabase.
 * @param ownerId - The unique ID of the user.
 * @returns A promise that resolves to an array of tree summaries.
 */
/**
 * Fetches the user profile from the user_profiles table.
 * @param uid - The user's Firebase UID.
 * @param email - The user's email.
 */
export const fetchUserProfile = async (uid: string, email: string, token?: string): Promise<{ metadata: Record<string, unknown> } | null> => {
  const client = getSupabaseWithAuth(uid, email || '', token);
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    logError('SupabaseTreeService fetchUserProfile', error, { showToast: false });
    return null;
  }
  return data;
};

/**
 * Updates the user profile in Supabase.
 */
export const updateUserProfile = async (
  uid: string,
  email: string,
  updates: { displayName?: string; photoURL?: string; metadata?: Record<string, unknown> },
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(uid, email, token);

  const { error } = await client
    .from('user_profiles')
    .update({
      ...(updates.displayName && { display_name: updates.displayName }),
      ...(updates.photoURL && { photo_url: updates.photoURL }),
      ...(updates.metadata && { metadata: updates.metadata }),
    })
    .eq('id', uid);

  if (error) {
    logError('SupabaseTreeService updateUserProfile', error, { showToast: true, toastMessage: 'Failed to update profile.' });
    throw error;
  }
};

/**
 * Performs a full cascade delete for a user account.
 * Deletes all owned trees and the user profile.
 */
export const deleteUserAccount = async (uid: string, email?: string, token?: string): Promise<void> => {
  // Use user-specific client to ensure RLS allows deleting their own records.
  const client = getSupabaseWithAuth(uid, email || '', token);

  // 1. Delete all trees owned by the user
  const { error: treeError } = await client
    .from('trees')
    .delete()
    .eq('owner_id', uid);

  if (treeError) {
    console.error('Error deleting user trees:', treeError);
    throw treeError;
  }

  // 2. Delete user profile
  const { error: profileError } = await client
    .from('user_profiles')
    .delete()
    .eq('id', uid);

  if (profileError) {
    console.error('Error deleting user profile:', profileError);
    throw profileError;
  }

  // Note: Firebase account deletion is handled separately in the UI/Auth service if possible,
  // but here we focus on the Supabase data cleanup.
};

export const fetchTreesForUser = async (ownerId: string, userEmail: string, token?: string): Promise<TreeSummary[]> => {
  const client = getSupabaseWithAuth(ownerId, userEmail, token);
  const { data, error } = await client
    .from('trees')
    .select('id, name, is_public, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    isPublic: row.is_public as boolean,
    createdAt: row.created_at as string,
  }));
};

export interface SharedTreeSummary extends TreeSummary {
  role: 'editor' | 'viewer';
  driveFileId?: string;
}

/**
 * Fetches all trees shared with a specific user email.
 * @param userEmail - The email of the current user.
 * @returns A promise that resolves to an array of shared tree summaries.
 */
export const fetchSharedTrees = async (uid: string, userEmail: string, token?: string): Promise<SharedTreeSummary[]> => {
  if (!userEmail || !uid) return [];

  try {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const client = getSupabaseWithAuth(uid, normalizedEmail, token);
    // Fetch ALL shares that RLS allows (both owned and shared with me)
    interface TreeShareRow {
      tree_id: string;
      owner_uid: string;
      collaborators: { email: string; role?: string }[] | null;
      drive_file_id?: string;
    }

    const { data: sharesData, error: shareError } = await client
      .from('tree_shares')
      .select('tree_id, collaborators, drive_file_id, owner_uid');

    const shares = sharesData as TreeShareRow[] | null;

    if (shareError) {
      console.warn('fetchSharedTrees (tree_shares query) failed:', shareError.message);
      return [];
    }

    if (!shares || shares.length === 0) return [];

    // Filter for trees where I am a collaborator (not the owner) 
    // AND my email is in the collaborators list (just as a double-check)
    const collaborativeShares = shares.filter((s) => {
      const isOwner = s.owner_uid === uid;
      const isCollaborator = Array.isArray(s.collaborators) && s.collaborators.some(
        (c) => c.email.toLowerCase() === normalizedEmail
      );
      return !isOwner && isCollaborator;
    });

    if (collaborativeShares.length === 0) return [];

    const treeIds = collaborativeShares.map((s) => s.tree_id).filter(Boolean);
    if (treeIds.length === 0) return [];

    const { data: trees, error: treeError } = await client
      .from('trees')
      .select('id, name, created_at')
      .in('id', treeIds);

    if (treeError) {
      console.warn('fetchSharedTrees (trees join query) failed:', treeError.message);
      return [];
    }

    return (trees ?? []).map((tree: { id: string; name: string; created_at: string }) => {
      const share = collaborativeShares.find((s) => s.tree_id === tree.id);
      const collab = share?.collaborators?.find(
        (c) => c.email.toLowerCase() === normalizedEmail
      );

      return {
        id: tree.id,
        name: tree.name,
        isPublic: false,
        createdAt: tree.created_at,
        role: (collab?.role || 'viewer') as 'editor' | 'viewer',
        driveFileId: share?.drive_file_id,
      };
    });
  } catch (e) {
    console.error('fetchSharedTrees: Unexpected error', e);
    return [];
  }
};

/**
 * Creates a new tree for the given owner in the database.
 * @param ownerId - The unique ID of the user who owns the tree.
 * @param name - The name of the new tree.
 * @returns A promise that resolves to the newly created tree's ID.
 */
export const createTree = async (ownerId: string, userEmail: string, name: string, token?: string): Promise<string> => {
  const client = getSupabaseWithAuth(ownerId, userEmail, token);
  const { data, error } = await client
    .from('trees')
    .insert({ owner_id: ownerId, name })
    .select('id')
    .single();

  if (error) throw error;
  return data!.id as string;
};

/**
 * Renames an existing tree.
 * @param treeId - The ID of the tree to rename.
 * @param name - The new name for the tree.
 */
export const renameTree = async (treeId: string, ownerId: string, userEmail: string, name: string, token?: string): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .update({ name })
    .eq('id', treeId);

  if (error) throw error;
};

/**
 * Updates the root person (focus_id) of an existing tree.
 * @param treeId - The ID of the tree to update.
 * @param newRootId - The ID of the new root person.
 */
export const updateTreeRoot = async (treeId: string, newRootId: string, ownerId: string, userEmail: string, token?: string): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .update({ focus_id: newRootId })
    .eq('id', treeId);

  if (error) throw error;
};


/**
 * Updates the settings for a specific tree.
 * @param treeId - The ID of the tree to update.
 * @param settings - The new JSON settings object.
 */
export const updateTreeSettings = async (
  treeId: string,
  ownerId: string,
  userEmail: string,
  settings: Record<string, unknown>,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .update({ settings })
    .eq('id', treeId);

  if (error) {
    console.error('updateTreeSettings error:', error);
    throw error;
  }
};


/**
 * Deletes an entire tree and all its data.
 * Assumes database cascades delete people and relationships.
 * @param treeId - The ID of the tree to delete.
 */
export const deleteWholeTree = async (treeId: string, ownerId: string, userEmail: string, token?: string): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .delete()
    .eq('id', treeId);

  if (error) throw error;
};

/**
 * Fetches the full data for a specific tree, including its people and relationships.
 * Maps the database rows into the application's FullState shape.
 * @param treeId - The unique ID of the tree.
 * @param ownerId - The ID of the owner to verify ownership.
 * @returns A promise that resolves to an object containing the people map and focusId.
 */
export const fetchTree = async (
  treeId: string,
  ownerId: string,
  userEmail: string,
  token?: string
): Promise<Pick<FullState, 'people' | 'focusId' | 'settings'> & { ownerId: string; lastVersion: number }> => {
  const client = getSupabaseWithAuth(ownerId, userEmail, token);
  // Fetch tree metadata by ID
  const { data: tree, error: treeError } = await client
    .from('trees')
    .select('*')
    .eq('id', treeId)
    .single();

  if (treeError) throw treeError;

  // Fetch Snapshot (People & Relationships) AND Operations Log
  const [
    { data: peopleRows, error: peopleError },
    { data: relRows, error: relError },
    { data: opsRows, error: opsError }
  ] = await Promise.all([
    client.from('people').select('*').eq('tree_id', treeId),
    client.from('relationships').select('*').eq('tree_id', treeId),
    client.from('tree_operations').select('*').eq('tree_id', treeId).order('version_seq', { ascending: true })
  ]);

  if (peopleError) throw peopleError;
  if (relError) throw relError;
  if (opsError) console.warn('Failed to fetch operations log:', opsError);

  let peopleMap: Record<string, Person> = {};

  // Initialize base Person objects from people rows
  (peopleRows ?? []).forEach((row: Record<string, unknown>) => {
    const id = row.id as string;
    peopleMap[id] = {
      id,
      title: '',
      firstName: (row.first_name as string) ?? '',
      middleName: (row.middle_name as string) ?? '',
      lastName: (row.last_name as string) ?? '',
      birthName: (row.birth_name as string) ?? '',
      nickName: (row.nick_name as string) ?? '',
      suffix: (row.suffix as string) ?? '',
      gender: (row.gender as string ?? 'male') as Person['gender'],
      birthDate: (row.birth_date as string) ?? '',
      birthPlace: (row.birth_place as string) ?? '',
      birthSource: '',
      deathDate: (row.death_date as string) ?? '',
      deathPlace: (row.death_place as string) ?? '',
      deathSource: '',
      isDeceased: !!row.death_date,
      profession: (row.profession as string) ?? '',
      company: (row.company as string) ?? '',
      interests: (row.interests as string) ?? '',
      bio: (row.bio as string) ?? '',
      photoUrl: (row.photo_url as string | undefined) ?? undefined,
      gallery: [],
      voiceNotes: [],
      sources: [],
      events: [],
      email: (row.email as string) ?? '',
      website: (row.website as string) ?? '',
      blog: (row.blog as string) ?? '',
      address: (row.address as string) ?? '',
      parents: [],
      spouses: [],
      children: [],
      burialPlace: '',
      residence: '',
      partnerDetails: undefined,
    };
  });

  // Build relationships into parents/children/spouses arrays
  (relRows ?? []).forEach((rel: Record<string, unknown>) => {
    const personId = rel.person_id as string;
    const relativeId = rel.relative_id as string;
    const type = rel.type as 'parent' | 'spouse' | 'child';

    if (!peopleMap[personId] || !peopleMap[relativeId]) return;

    if (type === 'parent') {
      if (!peopleMap[personId].parents.includes(relativeId)) {
        peopleMap[personId].parents.push(relativeId);
      }
      if (!peopleMap[relativeId].children.includes(personId)) {
        peopleMap[relativeId].children.push(personId);
      }
    } else if (type === 'child') {
      if (!peopleMap[personId].children.includes(relativeId)) {
        peopleMap[personId].children.push(relativeId);
      }
      if (!peopleMap[relativeId].parents.includes(personId)) {
        peopleMap[relativeId].parents.push(personId);
      }
    } else if (type === 'spouse') {
      if (!peopleMap[personId].spouses.includes(relativeId)) {
        peopleMap[personId].spouses.push(relativeId);
      }
      if (!peopleMap[relativeId].spouses.includes(personId)) {
        peopleMap[relativeId].spouses.push(personId);
      }
    }
  });

  // REPLAY: Apply operations on top of the snapshot
  // This ensures that even if Dual Write failed (due to RLS/Race/Etc), the Client state is correct.
  if (opsRows && opsRows.length > 0) {
    const { applyOperationToMap } = await import('../utils/syncUtils');
    console.log(`[SupabaseTreeService] Replaying ${opsRows.length} operations to validate snapshot...`);
    opsRows.forEach((op: any) => {
      const updatedMap = applyOperationToMap(peopleMap, op);
      if (updatedMap) {
        peopleMap = updatedMap;
      } else {
        console.warn(`[SupabaseTreeService] Failed to replay operation version_seq: ${op.version_seq}. Payload might be corrupt.`);
      }
    });
  }

  const focusId = tree.focus_id || Object.keys(peopleMap)[0] || undefined;
  let lastVersion = 0;
  if (opsRows && opsRows.length > 0) {
    lastVersion = Math.max(...opsRows.map((op: any) => op.version_seq || 0));
  }

  return { people: peopleMap, focusId, settings: tree.settings || {}, ownerId: tree.owner_id, lastVersion };
};

/**
 * Atomically creates a new person and establishes a relationship with an existing person.
 * This utilizes a Supabase RPC call to ensure atomicity.
 * @param treeId - The ID of the tree.
 * @param ownerId - The ID of the owner.
 * @param person - The new person object to create.
 * @param relativeId - The ID of the existing person to link to.
 * @param type - The relationship type.
 */
export const createPersonAndRelationshipAtomic = async (
  treeId: string,
  ownerId: string,
  person: Person,
  relativeId: string,
  type: 'parent' | 'child' | 'spouse',
  email?: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, email || '', token);
  const personData = {
    id: person.id,
    first_name: person.firstName,
    last_name: person.lastName,
    gender: person.gender,
    birth_date: formatDateForPostgres(person.birthDate),
    death_date: formatDateForPostgres(person.deathDate),
    bio: person.bio || null,
    photo_url: person.photoUrl || null,
    middle_name: person.middleName || null,
    nick_name: person.nickName || null,
    birth_name: person.birthName || null,
    suffix: person.suffix || null,
    birth_place: person.birthPlace || null,
    death_place: person.deathPlace || null,
    profession: person.profession || null,
    company: person.company || null,
    interests: person.interests || null,
    email: person.email || null,
    website: person.website || null,
    blog: person.blog || null,
    address: person.address || null,
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isTreeUUID = uuidRegex.test(treeId);
  const isRelUUID = uuidRegex.test(relativeId);

  if (!isTreeUUID || !isRelUUID) {
    console.warn('Skipping atomic sync: One of the IDs is not a valid UUID (likely a local/demo tree).');
    return;
  }

  const { error } = await client.rpc('create_person_and_relationship', {
    p_tree_id: treeId,
    p_owner_id: ownerId,
    p_person_data: personData,
    p_rel_person_id: relativeId,
    p_rel_type: type,
  });

  if (error) {
    console.error('RPC Error (create_person_and_relationship):', error);
    throw error;
  }
};

/**
 * Upserts a single person into the database for a given tree.
 * @param treeId - The ID of the tree the person belongs to.
 * @param ownerId - The ID of the tree owner.
 * @param person - The person object to save.
 */
export const savePerson = async (
  treeId: string,
  ownerId: string,
  person: Person,
  email?: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, email || '', token);
  const payload = {
    id: person.id,
    tree_id: treeId,
    first_name: person.firstName,
    last_name: person.lastName,
    gender: person.gender,
    birth_date: formatDateForPostgres(person.birthDate),
    death_date: formatDateForPostgres(person.deathDate),
    bio: person.bio || null,
    photo_url: person.photoUrl || null,
    middle_name: person.middleName || null,
    nick_name: person.nickName || null,
    birth_name: person.birthName || null,
    suffix: person.suffix || null,
    birth_place: person.birthPlace || null,
    death_place: person.deathPlace || null,
    profession: person.profession || null,
    company: person.company || null,
    interests: person.interests || null,
    email: person.email || null,
    website: person.website || null,
    blog: person.blog || null,
    address: person.address || null,
  };

  const { error: upsertError } = await client
    .from('people')
    .upsert(payload, { onConflict: 'id' });

  if (upsertError) {
    console.error('savePerson Failed:', JSON.stringify(upsertError, null, 2));
    throw upsertError;
  }
};

/**
 * Deletes a person by their ID within a specific tree.
 * @param treeId - The ID of the tree.
 * @param _ownerId - The ID of the owner (internal app verification).
 * @param personId - The ID of the person to delete.
 */
export const deletePerson = async (
  treeId: string,
  ownerId: string,
  personId: string,
  email?: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, email || '', token);
  const { error } = await client
    .from('people')
    .delete()
    .eq('id', personId)
    .eq('tree_id', treeId);

  if (error) throw error;
};

/**
 * Persists a relationship between two people in the database.
 * @param treeId - The ID of the tree.
 * @param _ownerId - The ID of the owner.
 * @param personId - The ID of the main person.
 * @param relativeId - The ID of the relative.
 * @param type - The type of relationship.
 */
export const saveRelationship = async (
  treeId: string,
  ownerId: string,
  personId: string,
  relativeId: string,
  type: 'parent' | 'child' | 'spouse',
  email?: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, email || '', token);
  const payload = {
    tree_id: treeId,
    person_id: personId,
    relative_id: relativeId,
    type,
  };

  const { error } = await client.from('relationships').insert(payload);
  if (error) {
    console.error('saveRelationship Failed:', JSON.stringify(error, null, 2));
    throw error;
  }
};

/**
 * Deletes a specific relationship row between two people in the database.
 * @param treeId - The ID of the tree.
 * @param _ownerId - The ID of the owner.
 * @param personId - The ID of the main person.
 * @param relativeId - The ID of the relative.
 * @param type - The type of relationship to delete.
 */
export const deleteRelationship = async (
  treeId: string,
  ownerId: string,
  personId: string,
  relativeId: string,
  type: 'parent' | 'child' | 'spouse',
  email?: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, email || '', token);
  const { error } = await client
    .from('relationships')
    .delete()
    .eq('tree_id', treeId)
    .eq('person_id', personId)
    .eq('relative_id', relativeId)
    .eq('type', type);

  if (error) throw error;
};

/**
 * Bulk upserts multiple people into the database.
 * Used for importing trees.
 * @param treeId - The ID of the tree.
 * @param ownerId - The ID of the owner.
 * @param people - Array of people to upsert.
 */
export const bulkUpsertPeople = async (
  treeId: string,
  ownerId: string,
  people: Person[],
  email?: string,
  token?: string
): Promise<void> => {
  if (people.length === 0) return;
  const client = getSupabaseWithAuth(ownerId, email || '', token);
  // ... rest of mapping
  const payload = people.map((person) => ({
    // ... payload fields (already mostly correct in view)
    id: person.id,
    tree_id: treeId,
    first_name: person.firstName,
    last_name: person.lastName,
    gender: person.gender,
    birth_date: formatDateForPostgres(person.birthDate),
    death_date: formatDateForPostgres(person.deathDate),
    bio: person.bio || null,
    photo_url: person.photoUrl || null,
    middle_name: person.middleName || null,
    nick_name: person.nickName || null,
    birth_name: person.birthName || null,
    suffix: person.suffix || null,
    birth_place: person.birthPlace || null,
    death_place: person.deathPlace || null,
    profession: person.profession || null,
    company: person.company || null,
    interests: person.interests || null,
    email: person.email || null,
    website: person.website || null,
    blog: person.blog || null,
    address: person.address || null,
  }));

  const { data, error } = await client
    .from('people')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('bulkUpsertPeople (Upsert) Failed:', error);
    console.error('Error Details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
};

/**
 * Bulk inserts relationships.
 * @param relationships - Array of relationship objects { tree_id, person_id, relative_id, type }
 */
export const bulkInsertRelationships = async (
  relationships: {
    tree_id: string;
    person_id: string;
    relative_id: string;
    type: 'parent' | 'child' | 'spouse';
  }[],
  ownerId: string,
  email?: string,
  token?: string
): Promise<void> => {
  if (relationships.length === 0) return;
  const client = getSupabaseWithAuth(ownerId, email || '', token);

  const { error } = await client.from('relationships').insert(relationships);
  if (error) {
    console.error('bulkInsertRelationships Failed:', error);
    console.error('Error Details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
};

// ==========================================
// Collaborator Management
// ==========================================

export interface Collaborator {
  id: string;
  tree_id: string;
  email: string;
  role: 'editor' | 'viewer';
  invited_by: string;
  invited_at: string;
}

/**
 * Fetches all collaborators for a specific tree.
 * @param treeId - The ID of the tree.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 * @returns A promise that resolves to an array of collaborators.
 */
export const getTreeCollaborators = async (
  treeId: string,
  ownerId: string,
  ownerEmail: string,
  token?: string
): Promise<Collaborator[]> => {
  const client = getSupabaseWithAuth(ownerId, ownerEmail, token);
  const { data, error } = await client
    .from('tree_collaborators')
    .select('*')
    .eq('tree_id', treeId)
    .order('invited_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Invites a new collaborator to a tree.
 * @param treeId - The ID of the tree.
 * @param email - The email of the person to invite.
 * @param role - The role to assign ('editor' or 'viewer').
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 */
export const inviteCollaborator = async (
  treeId: string,
  email: string,
  role: 'editor' | 'viewer',
  ownerId: string,
  ownerEmail: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, ownerEmail, token);
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await client
    .from('tree_collaborators')
    .insert({
      tree_id: treeId,
      email: normalizedEmail,
      role,
      invited_by: ownerId
    });

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('This collaborator has already been invited to this tree.');
    }
    throw error;
  }
};

/**
 * Updates a collaborator's role.
 * @param treeId - The ID of the tree.
 * @param email - The email of the collaborator.
 * @param newRole - The new role to assign.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 */
export const updateCollaboratorRole = async (
  treeId: string,
  email: string,
  newRole: 'editor' | 'viewer',
  ownerId: string,
  ownerEmail: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, ownerEmail, token);
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await client
    .from('tree_collaborators')
    .update({ role: newRole })
    .eq('tree_id', treeId)
    .eq('email', normalizedEmail);

  if (error) throw error;
};

/**
 * Revokes a collaborator's access to a tree.
 * @param treeId - The ID of the tree.
 * @param email - The email of the collaborator to remove.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 */
export const revokeCollaboratorAccess = async (
  treeId: string,
  email: string,
  ownerId: string,
  ownerEmail: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, ownerEmail, token);
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await client
    .from('tree_collaborators')
    .delete()
    .eq('tree_id', treeId)
    .eq('email', normalizedEmail);

  if (error) throw error;
};

/**
 * Updates the Google Drive file reference for a specific tree in Supabase.
 * @param treeId - The ID of the tree.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 * @param driveFileId - The new Google Drive file ID.
 */
export const updateTreeSyncMetadata = async (
  treeId: string,
  ownerId: string,
  ownerEmail: string,
  driveFileId: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, ownerEmail, token);

  const { error } = await client
    .from('tree_shares')
    .update({ drive_file_id: driveFileId })
    .eq('tree_id', treeId);

  if (error) {
    console.error('updateTreeSyncMetadata Failed:', error);
    throw error;
  }
};

/**
 * Clears the Google Drive file reference for a specific tree in Supabase.
 * @param treeId - The ID of the tree.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 */
export const clearTreeSyncMetadata = async (
  treeId: string,
  ownerId: string,
  ownerEmail: string,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(ownerId, ownerEmail, token);

  // We nullify the drive_file_id in the tree_shares table
  const { error } = await client
    .from('tree_shares')
    .update({ drive_file_id: null })
    .eq('tree_id', treeId);

  if (error) {
    console.error('clearTreeSyncMetadata Failed:', error);
    throw error;
  }
};

/**
 * Updates the user's tour status in the user_profiles table.
 * @param uid - The user's Firebase UID.
 * @param email - The user's email.
 * @param hasSeen - Boolean flag.
 */
export const updateUserTourStatus = async (
  uid: string,
  email: string,
  hasCompleted: boolean,
  token?: string
): Promise<void> => {
  const client = getSupabaseWithAuth(uid, email || '', token);

  const { error } = await client
    .from('user_profiles')
    .upsert({
      id: uid,
      metadata: { has_completed_tour: hasCompleted }
    }, { onConflict: 'id' });

  if (error) {
    console.warn('updateUserTourStatus failed:', error.message);
  }
};
