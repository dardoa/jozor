import type { Person, TreeSettings } from '../types';
import { logError } from '../utils/errorLogger';
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

export const importTreeContent = async (
  treeId: string,
  ownerId: string,
  people: Person[],
  relationships: { person_id: string; relative_id: string; type: 'parent' | 'child' | 'spouse' }[],
  email?: string,
  token?: string
): Promise<void> => {
  const client = getTreeClient(ownerId, email || '', token);

  // Format people mapping to JSON serializable objects matching database expected schema
  const peoplePayload = people.map((person) => ({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    middleName: person.middleName,
    birthName: person.birthName,
    nickName: person.nickName,
    suffix: person.suffix,
    gender: person.gender,
    birthDate: person.birthDate,
    birthPlace: person.birthPlace,
    deathDate: person.deathDate,
    deathPlace: person.deathPlace,
    bio: person.bio,
    profession: person.profession,
    company: person.company,
    interests: person.interests,
    photoUrl: person.photoUrl,
    photoPath: person.photoPath,
    photoVersion: person.photoVersion,
    email: person.email,
    website: person.website,
    blog: person.blog,
    address: person.address,
    customFields: (person as any).customFields,
    metadata: (person as any).metadata,
  }));

  const { error } = await client.rpc('import_tree_content', {
    p_tree_id: treeId,
    p_people: peoplePayload,
    p_relationships: relationships,
  });

  if (error) {
    logError('SupabaseTreeMutationService importTreeContent', error);
    throw error;
  }
};
