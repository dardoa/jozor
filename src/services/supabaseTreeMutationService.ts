import type { Person, TreeSettings } from '../types';
import { logError } from '../utils/errorLogger';
import { mapPersonToDbRow } from './personRowMapper';
import { getTreeClient } from './supabaseTreeClient';
import { activityService } from '../features/activity-log';

export const createTreeWithRootAtomic = async (
  ownerId: string,
  userEmail: string,
  name: string,
  rootPerson: Person,
  token?: string,
  settings?: Record<string, unknown>
): Promise<string> => {
  const client = getTreeClient(ownerId, userEmail, token);
  const rootPersonData = {
    id: rootPerson.id,
    first_name: rootPerson.firstName,
    last_name: rootPerson.lastName,
    gender: rootPerson.gender,
  };
  const payload: {
    p_owner_id: string;
    p_tree_name: string;
    p_root_person_data: typeof rootPersonData;
    p_settings?: Record<string, unknown>;
  } = {
    p_owner_id: ownerId,
    p_tree_name: name,
    p_root_person_data: rootPersonData,
  };

  if (settings) {
    payload.p_settings = settings;
  }

  const { data, error } = await client.rpc('create_tree_with_root', payload);

  if (error) throw error;
  return data as string;
};

export const createTree = async (
  ownerId: string,
  userEmail: string,
  name: string,
  token?: string,
  settings?: Record<string, unknown>
): Promise<string> => {
  const client = getTreeClient(ownerId, userEmail, token);
  const { data, error } = await client
    .from('trees')
    .insert(settings ? { owner_id: ownerId, name, settings } : { owner_id: ownerId, name })
    .select('id')
    .single();

  if (error) throw error;
  return data!.id as string;
};

export const renameTree = async (treeId: string, ownerId: string, userEmail: string, name: string, token?: string): Promise<void> => {
  const client = getTreeClient(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .update({ name })
    .eq('id', treeId);

  if (error) throw error;

  // Log activity
  activityService.logAction(treeId, 'RENAME_TREE', { newName: name });
};

export const updateTreeRoot = async (treeId: string, newRootId: string, ownerId: string, userEmail: string, token?: string): Promise<void> => {
  const client = getTreeClient(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .update({ focus_id: newRootId })
    .eq('id', treeId);

  if (error) throw error;
};

export const updateTreeSettings = async (
  treeId: string,
  ownerId: string,
  userEmail: string,
  settings: TreeSettings,
  token?: string
): Promise<void> => {
  const client = getTreeClient(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .update({ settings })
    .eq('id', treeId);

  if (error) {
    logError('SupabaseTreeMutationService updateTreeSettings', error, {
      category: 'DATABASE',
      severity: 'MEDIUM',
      metadata: { treeId, ownerId },
    });
    throw error;
  }

  // Log activity
  activityService.logAction(treeId, 'TREE_SETTINGS_UPDATE', { settings });
};

export const deleteWholeTree = async (treeId: string, ownerId: string, userEmail: string, token?: string): Promise<void> => {
  const client = getTreeClient(ownerId, userEmail, token);
  const { error } = await client
    .from('trees')
    .delete()
    .eq('id', treeId);

  if (error) throw error;
};

export const bulkUpsertPeople = async (
  treeId: string,
  ownerId: string,
  people: Person[],
  email?: string,
  token?: string
): Promise<void> => {
  if (people.length === 0) return;
  const client = getTreeClient(ownerId, email || '', token);
  const payload = people.map((person) => mapPersonToDbRow(person, treeId));
  const { error } = await client.from('people').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};

export const bulkInsertRelationships = async (
  relationships: { tree_id: string; person_id: string; relative_id: string; type: 'parent' | 'child' | 'spouse' }[],
  ownerId: string,
  email?: string,
  token?: string
): Promise<void> => {
  if (relationships.length === 0) return;
  const client = getTreeClient(ownerId, email || '', token);
  const { error } = await client.from('relationships').insert(relationships);
  if (error) throw error;
};
