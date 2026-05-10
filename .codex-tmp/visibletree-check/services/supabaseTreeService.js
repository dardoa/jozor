import { getSupabaseWithAuth } from './supabaseClient';
import { logError, logInfo, logWarn } from '../utils/errorLogger';
import { mapDbPersonRowToPerson, mapPersonToDbRow } from './personRowMapper';
import { formatDateForPostgres } from '../utils/dateUtils';
const getStoredSupabaseToken = () => {
    if (typeof window === 'undefined')
        return undefined;
    return localStorage.getItem('jozor_supabase_token') || undefined;
};
const getClient = (uid, email, token) => getSupabaseWithAuth(uid, email, token || getStoredSupabaseToken());
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
export const fetchUserProfile = async (uid, email, token) => {
    const client = getClient(uid, email || '', token);
    const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
    if (error) {
        logError('SupabaseTreeService fetchUserProfile', error, { category: 'NETWORK', severity: 'MEDIUM', showToast: false });
        return null;
    }
    return data;
};
/**
 * Updates the user profile in Supabase.
 */
export const updateUserProfile = async (uid, email, updates, token) => {
    const client = getClient(uid, email, token);
    const { error } = await client
        .from('user_profiles')
        .update({
        ...(updates.displayName && { display_name: updates.displayName }),
        ...(updates.photoURL && { photo_url: updates.photoURL }),
        ...(updates.metadata && { metadata: updates.metadata }),
    })
        .eq('id', uid);
    if (error) {
        logError('SupabaseTreeService updateUserProfile', error, {
            category: 'NETWORK',
            severity: 'MEDIUM',
            showToast: true,
            toastMessage: 'Failed to update profile.'
        });
        throw error;
    }
};
/**
 * Performs a full cascade delete for a user account.
 * Deletes all owned trees and the user profile.
 */
export const deleteUserAccount = async (uid, email, token) => {
    // Use user-specific client to ensure RLS allows deleting their own records.
    const client = getClient(uid, email || '', token);
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
export const fetchTreesForUser = async (ownerId, userEmail, token) => {
    const client = getClient(ownerId, userEmail, token);
    const { data, error } = await client
        .from('trees')
        .select('id, name, is_public, created_at, updated_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true });
    if (error)
        throw error;
    return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        isPublic: row.is_public,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
    }));
};
/**
 * Fetches all trees shared with a specific user email.
 * @param userEmail - The email of the current user.
 * @returns A promise that resolves to an array of shared tree summaries.
 */
export const fetchSharedTrees = async (uid, userEmail, token) => {
    if (!userEmail || !uid)
        return [];
    try {
        const normalizedEmail = userEmail.trim().toLowerCase();
        const client = getClient(uid, normalizedEmail, token);
        const { data: sharesData, error: shareError } = await client
            .from('tree_shares')
            .select('tree_id, collaborators, drive_file_id, owner_uid');
        const shares = sharesData;
        if (shareError) {
            console.warn('fetchSharedTrees (tree_shares query) failed:', shareError.message);
            return [];
        }
        if (!shares || shares.length === 0)
            return [];
        // Filter for trees where I am a collaborator (not the owner) 
        // AND my email is in the collaborators list (just as a double-check)
        const collaborativeShares = shares.filter((s) => {
            const isOwner = s.owner_uid === uid;
            const isCollaborator = Array.isArray(s.collaborators) && s.collaborators.some((c) => c.email.toLowerCase() === normalizedEmail);
            return !isOwner && isCollaborator;
        });
        if (collaborativeShares.length === 0)
            return [];
        const treeIds = collaborativeShares.map((s) => s.tree_id).filter(Boolean);
        if (treeIds.length === 0)
            return [];
        const { data: trees, error: treeError } = await client
            .from('trees')
            .select('id, name, created_at, updated_at')
            .in('id', treeIds);
        if (treeError) {
            console.warn('fetchSharedTrees (trees join query) failed:', treeError.message);
            return [];
        }
        return (trees ?? []).map((tree) => {
            const share = collaborativeShares.find((s) => s.tree_id === tree.id);
            const collab = share?.collaborators?.find((c) => c.email.toLowerCase() === normalizedEmail);
            return {
                id: tree.id,
                name: tree.name,
                isPublic: false,
                createdAt: tree.created_at,
                updatedAt: tree.updated_at || tree.created_at,
                role: (collab?.role || 'viewer'),
                driveFileId: share?.drive_file_id,
            };
        });
    }
    catch (e) {
        console.error('fetchSharedTrees: Unexpected error', e);
        return [];
    }
};
export const fetchTreeAccessRole = async (treeId, uid, userEmail, token) => {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const client = getClient(uid, normalizedEmail, token);
    const { data: tree, error: treeError } = await client
        .from('trees')
        .select('owner_id')
        .eq('id', treeId)
        .single();
    if (treeError)
        throw treeError;
    if (tree.owner_id === uid)
        return 'owner';
    const { data: collaborator, error: collabError } = await client
        .from('tree_collaborators')
        .select('role')
        .eq('tree_id', treeId)
        .eq('email', normalizedEmail)
        .maybeSingle();
    if (collabError)
        throw collabError;
    if (collaborator?.role === 'editor' || collaborator?.role === 'viewer') {
        return collaborator.role;
    }
    const { data: share, error: shareError } = await client
        .from('tree_shares')
        .select('collaborators')
        .eq('tree_id', treeId)
        .maybeSingle();
    if (shareError)
        throw shareError;
    const legacyRole = share?.collaborators?.find((c) => c.email?.toLowerCase?.() === normalizedEmail)?.role;
    return legacyRole === 'editor' ? 'editor' : 'viewer';
};
/**
 * Creates a new tree and its initial root person atomically.
 * @param ownerId - The unique ID of the user.
 * @param name - The name of the new tree.
 * @param rootPerson - The initial root person object.
 */
export const createTreeWithRootAtomic = async (ownerId, userEmail, name, rootPerson, token) => {
    const client = getClient(ownerId, userEmail, token);
    const rootPersonData = {
        id: rootPerson.id,
        first_name: rootPerson.firstName,
        last_name: rootPerson.lastName,
        gender: rootPerson.gender,
    };
    const { data, error } = await client.rpc('create_tree_with_root', {
        p_owner_id: ownerId,
        p_tree_name: name,
        p_root_person_data: rootPersonData,
    });
    if (error)
        throw error;
    return data;
};
/**
 * Creates a new tree for the given owner in the database.
 * @param ownerId - The unique ID of the user who owns the tree.
 * @param name - The name of the new tree.
 * @returns A promise that resolves to the newly created tree's ID.
 */
export const createTree = async (ownerId, userEmail, name, token) => {
    const client = getClient(ownerId, userEmail, token);
    const { data, error } = await client
        .from('trees')
        .insert({ owner_id: ownerId, name })
        .select('id')
        .single();
    if (error)
        throw error;
    return data.id;
};
/**
 * Renames an existing tree.
 * @param treeId - The ID of the tree to rename.
 * @param name - The new name for the tree.
 */
export const renameTree = async (treeId, ownerId, userEmail, name, token) => {
    const client = getClient(ownerId, userEmail, token);
    const { error } = await client
        .from('trees')
        .update({ name })
        .eq('id', treeId);
    if (error)
        throw error;
};
/**
 * Updates the root person (focus_id) of an existing tree.
 * @param treeId - The ID of the tree to update.
 * @param newRootId - The ID of the new root person.
 */
export const updateTreeRoot = async (treeId, newRootId, ownerId, userEmail, token) => {
    const client = getClient(ownerId, userEmail, token);
    const { error } = await client
        .from('trees')
        .update({ focus_id: newRootId })
        .eq('id', treeId);
    if (error)
        throw error;
};
/**
 * Updates the settings for a specific tree.
 * @param treeId - The ID of the tree to update.
 * @param settings - The new JSON settings object.
 */
export const updateTreeSettings = async (treeId, ownerId, userEmail, settings, token) => {
    const client = getClient(ownerId, userEmail, token);
    const { error } = await client
        .from('trees')
        .update({ settings })
        .eq('id', treeId);
    if (error) {
        logError('SupabaseTreeService updateTreeSettings', error, {
            category: 'DATABASE',
            severity: 'MEDIUM',
            metadata: { treeId, ownerId }
        });
        throw error;
    }
};
/**
 * Deletes an entire tree and all its data.
 * Assumes database cascades delete people and relationships.
 * @param treeId - The ID of the tree to delete.
 */
export const deleteWholeTree = async (treeId, ownerId, userEmail, token) => {
    const client = getClient(ownerId, userEmail, token);
    const { error } = await client
        .from('trees')
        .delete()
        .eq('id', treeId);
    if (error)
        throw error;
};
/**
 * Fetches the full data for a specific tree, including its people and relationships.
 * Maps the database rows into the application's FullState shape.
 * @param treeId - The unique ID of the tree.
 * @param ownerId - The ID of the owner to verify ownership.
 * @returns A promise that resolves to an object containing the people map and focusId.
 */
export const fetchTree = async (treeId, ownerId, userEmail, token) => {
    const client = getClient(ownerId, userEmail, token);
    // Fetch tree metadata by ID
    const { data: tree, error: treeError } = await client
        .from('trees')
        .select('*')
        .eq('id', treeId)
        .single();
    if (treeError)
        throw treeError;
    // Fetch the authoritative snapshot plus the latest synced operation version.
    const [{ data: peopleRows, error: peopleError }, { data: relRows, error: relError }, { data: latestOpRow, error: opsError }] = await Promise.all([
        client.from('people').select('*').eq('tree_id', treeId),
        client.from('relationships').select('*').eq('tree_id', treeId),
        client
            .from('tree_operations')
            .select('version_seq')
            .eq('tree_id', treeId)
            .order('version_seq', { ascending: false })
            .limit(1)
            .maybeSingle()
    ]);
    if (peopleError)
        throw peopleError;
    if (relError)
        throw relError;
    if (opsError) {
        logWarn('SupabaseTreeService fetchTree latestVersion', 'Failed to fetch operations log; continuing with snapshot only.', {
            category: 'SYNC',
            metadata: { treeId, ownerId, errorMessage: opsError.message }
        });
    }
    const peopleMap = {};
    // Initialize base Person objects from people rows
    (peopleRows ?? []).forEach((row) => {
        const id = row.id;
        peopleMap[id] = mapDbPersonRowToPerson(row);
    });
    // Build relationships into parents/children/spouses arrays
    (relRows ?? []).forEach((rel) => {
        const personId = rel.person_id;
        const relativeId = rel.relative_id;
        const type = rel.type;
        if (!peopleMap[personId] || !peopleMap[relativeId])
            return;
        if (type === 'parent') {
            if (!peopleMap[personId].parents.includes(relativeId)) {
                peopleMap[personId].parents.push(relativeId);
            }
            if (!peopleMap[relativeId].children.includes(personId)) {
                peopleMap[relativeId].children.push(personId);
            }
        }
        else if (type === 'child') {
            if (!peopleMap[personId].children.includes(relativeId)) {
                peopleMap[personId].children.push(relativeId);
            }
            if (!peopleMap[relativeId].parents.includes(personId)) {
                peopleMap[relativeId].parents.push(personId);
            }
        }
        else if (type === 'spouse') {
            if (!peopleMap[personId].spouses.includes(relativeId)) {
                peopleMap[personId].spouses.push(relativeId);
            }
            if (!peopleMap[relativeId].spouses.includes(personId)) {
                peopleMap[relativeId].spouses.push(personId);
            }
        }
    });
    if (latestOpRow?.version_seq) {
        logInfo('SupabaseTreeService fetchTree', 'Loaded snapshot from authoritative rows.', {
            treeId,
            ownerId,
            lastVersion: latestOpRow.version_seq,
        });
    }
    const focusId = tree.focus_id || Object.keys(peopleMap)[0] || undefined;
    const lastVersion = Number(latestOpRow?.version_seq || 0);
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
export const createPersonAndRelationshipAtomic = async (treeId, ownerId, person, relativeId, type, email, token) => {
    const client = getClient(ownerId, email || '', token);
    // Prepare full data for the hardened RPC
    const personData = {
        id: person.id,
        first_name: person.firstName || '',
        last_name: person.lastName || '',
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
        logWarn('SupabaseTreeService createPersonAndRelationshipAtomic', 'Skipping atomic sync because one of the IDs is not a UUID.', {
            category: 'VALIDATION',
            metadata: { treeId, relativeId, ownerId, personId: person.id }
        });
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
        logError('SupabaseTreeService createPersonAndRelationshipAtomic', error, {
            category: 'DATABASE',
            severity: 'HIGH',
            metadata: {
                treeId,
                ownerId,
                relativeId,
                relationshipType: type,
                personId: person.id,
            }
        });
        throw error;
    }
};
/**
 * Upserts a single person into the database for a given tree.
 * @param treeId - The ID of the tree the person belongs to.
 * @param ownerId - The ID of the tree owner.
 * @param person - The person object to save.
 */
export const savePerson = async (treeId, ownerId, person, email, token) => {
    const client = getClient(ownerId, email || '', token);
    const payload = mapPersonToDbRow(person, treeId);
    const { error: upsertError } = await client
        .from('people')
        .upsert(payload, { onConflict: 'id' });
    if (upsertError) {
        logError('SupabaseTreeService savePerson', upsertError, {
            category: 'DATABASE',
            severity: 'HIGH',
            metadata: {
                treeId,
                ownerId,
                personId: person.id,
                operationType: 'savePerson',
            }
        });
        throw upsertError;
    }
    logInfo('SupabaseTreeService savePerson', 'Person saved to Supabase.', {
        treeId,
        ownerId,
        personId: person.id,
        operationType: 'savePerson',
    });
};
export const deletePerson = async (treeId, ownerId, personId, email, token) => {
    const client = getClient(ownerId, email || '', token);
    const { error } = await client.rpc('delete_person_and_relations', {
        p_tree_id: treeId,
        p_owner_id: ownerId,
        p_person_id: personId
    });
    if (error)
        throw error;
};
/**
 * Persists a relationship between two people in the database.
 * @param treeId - The ID of the tree.
 * @param _ownerId - The ID of the owner.
 * @param personId - The ID of the main person.
 * @param relativeId - The ID of the relative.
 * @param type - The type of relationship.
 */
export const saveRelationship = async (treeId, ownerId, personId, relativeId, type, email, token) => {
    const client = getClient(ownerId, email || '', token);
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
export const deleteRelationship = async (treeId, ownerId, personId, relativeId, type, email, token) => {
    const client = getClient(ownerId, email || '', token);
    const { error } = await client
        .from('relationships')
        .delete()
        .eq('tree_id', treeId)
        .eq('person_id', personId)
        .eq('relative_id', relativeId)
        .eq('type', type);
    if (error)
        throw error;
};
/**
 * Bulk upserts multiple people into the database.
 * Used for importing trees.
 * @param treeId - The ID of the tree.
 * @param ownerId - The ID of the owner.
 * @param people - Array of people to upsert.
 */
export const bulkUpsertPeople = async (treeId, ownerId, people, email, token) => {
    if (people.length === 0)
        return;
    const client = getClient(ownerId, email || '', token);
    // ... rest of mapping
    const payload = people.map((person) => ({
        ...mapPersonToDbRow(person, treeId),
    }));
    const { error } = await client
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
export const bulkInsertRelationships = async (relationships, ownerId, email, token) => {
    if (relationships.length === 0)
        return;
    const client = getClient(ownerId, email || '', token);
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
/**
 * Fetches all collaborators for a specific tree.
 * @param treeId - The ID of the tree.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 * @returns A promise that resolves to an array of collaborators.
 */
export const getTreeCollaborators = async (treeId, ownerId, ownerEmail, token) => {
    const client = getClient(ownerId, ownerEmail, token);
    const { data, error } = await client
        .from('tree_collaborators')
        .select('*')
        .eq('tree_id', treeId)
        .order('invited_at', { ascending: false });
    if (error)
        throw error;
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
export const inviteCollaborator = async (treeId, email, role, ownerId, ownerEmail, token) => {
    const client = getClient(ownerId, ownerEmail, token);
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
export const updateCollaboratorRole = async (treeId, email, newRole, ownerId, ownerEmail, token) => {
    const client = getClient(ownerId, ownerEmail, token);
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await client
        .from('tree_collaborators')
        .update({ role: newRole })
        .eq('tree_id', treeId)
        .eq('email', normalizedEmail);
    if (error)
        throw error;
};
/**
 * Revokes a collaborator's access to a tree.
 * @param treeId - The ID of the tree.
 * @param email - The email of the collaborator to remove.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 */
export const revokeCollaboratorAccess = async (treeId, email, ownerId, ownerEmail, token) => {
    const client = getClient(ownerId, ownerEmail, token);
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await client
        .from('tree_collaborators')
        .delete()
        .eq('tree_id', treeId)
        .eq('email', normalizedEmail);
    if (error)
        throw error;
};
/**
 * Updates the Google Drive file reference for a specific tree in Supabase.
 * @param treeId - The ID of the tree.
 * @param ownerId - The owner's Firebase UID.
 * @param ownerEmail - The owner's email.
 * @param driveFileId - The new Google Drive file ID.
 */
export const updateTreeSyncMetadata = async (treeId, ownerId, ownerEmail, driveFileId, token) => {
    const client = getClient(ownerId, ownerEmail, token);
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
export const clearTreeSyncMetadata = async (treeId, ownerId, ownerEmail, token) => {
    const client = getClient(ownerId, ownerEmail, token);
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
export const updateUserTourStatus = async (uid, email, hasCompleted, token) => {
    const client = getClient(uid, email || '', token);
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
