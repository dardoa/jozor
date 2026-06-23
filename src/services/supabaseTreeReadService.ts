import type { FullState, Person } from '../types';
import { buildTreeFetchResult } from './supabaseTreeMapper';
import { getTreeClient } from './supabaseTreeClient';
import type { TreeSummary } from './supabaseTreeTypes';
import type { DeltaOperation } from './sync/SyncTypes';
import { logError } from '../utils/errorLogger';

export const fetchTreesForUser = async (
  ownerId: string,
  userEmail: string,
  token?: string
): Promise<TreeSummary[]> => {
  const client = getTreeClient(ownerId, userEmail, token);
  const { data, error } = await client
    .from('trees')
    .select('id, name, is_public, created_at, updated_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    isPublic: row.is_public as boolean,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || (row.created_at as string),
  }));
};

type EmbeddedPeopleCountRow = {
  id?: unknown;
  people?: unknown;
  people_secure?: unknown;
};

const readEmbeddedPeopleCount = (people: unknown): number => {
  if (Array.isArray(people)) {
    const first = people[0] as { count?: unknown } | undefined;
    return typeof first?.count === 'number' ? first.count : 0;
  }

  if (people && typeof people === 'object' && 'count' in people) {
    const count = (people as { count?: unknown }).count;
    return typeof count === 'number' ? count : 0;
  }

  return 0;
};

const fetchPeopleCountsPaginated = async (
  client: ReturnType<typeof getTreeClient>,
  treeIds: string[]
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const treeId of treeIds) {
    counts[treeId] = 0;
  }

  try {
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from('people_secure')
        .select('id, tree_id')
        .in('tree_id', treeIds)
        .order('tree_id', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        break;
      }

      for (const row of data) {
        const tId = (row as Record<string, unknown>).tree_id as string;
        if (tId && tId in counts) {
          counts[tId] = (counts[tId] || 0) + 1;
        }
      }

      if (data.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return counts;
  } catch (err) {
    logError('fetchPeopleCountsPaginated', err, {
      category: 'DATABASE',
      severity: 'LOW',
    });
    return {};
  }
};

export const fetchPeopleCountsForTrees = async (
  treeIds: string[],
  ownerId: string,
  userEmail: string,
  token?: string
): Promise<Record<string, number>> => {
  const uniqueTreeIds = Array.from(new Set(treeIds.filter(Boolean)));
  if (uniqueTreeIds.length === 0) return {};

  const client = getTreeClient(ownerId, userEmail, token);
  const { data, error } = await client
    .from('trees')
    .select('id, people_secure!people_tree_id_fkey(count)')
    .in('id', uniqueTreeIds);

  if (error) {
    return fetchPeopleCountsPaginated(client, uniqueTreeIds);
  }

  return (data ?? []).reduce<Record<string, number>>((counts, row) => {
    const treeRow = row as EmbeddedPeopleCountRow;
    if (typeof treeRow.id === 'string') {
      counts[treeRow.id] = readEmbeddedPeopleCount(treeRow.people_secure || treeRow.people);
    }
    return counts;
  }, {});
};

export const fetchTree = async (
  treeId: string,
  ownerId: string,
  userEmail: string,
  token?: string
): Promise<
  Pick<FullState, 'people' | 'focusId' | 'settings'> & {
    ownerId: string;
    lastVersion: number;
    name: string;
  }
> => {
  const client = getTreeClient(ownerId, userEmail, token);

  // 1. Try to fetch the latest checkpoint
  const { data: checkpoint, error: checkpointError } = await client
    .from('tree_checkpoints')
    .select('*')
    .eq('tree_id', treeId)
    .order('version_seq', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checkpointError) {
    // If table doesn't exist or query fails, fall back silently but log it
    console.warn(
      'Failed to query tree_checkpoints, falling back to legacy load:',
      checkpointError.message
    );
  }

  if (checkpoint) {
    // Checkpoint found! Load from checkpoint + trailing operations
    const { data: tree, error: treeError } = await client
      .from('trees')
      .select('*')
      .eq('id', treeId)
      .single();

    if (treeError) throw treeError;

    const { data: operationRows, error: opsError } = await client
      .from('tree_operations')
      .select('*')
      .eq('tree_id', treeId)
      .gt('version_seq', checkpoint.version_seq)
      .order('version_seq', { ascending: true });

    if (opsError) throw opsError;

    const basePeople = { ...(checkpoint.people as Record<string, Person>) };
    const result = {
      people: basePeople,
      focusId: tree.focus_id || Object.keys(basePeople)[0] || undefined,
      settings: tree.settings || {},
      ownerId: tree.owner_id,
      lastVersion: Number(checkpoint.version_seq),
      name: tree.name || 'Untitled tree',
    };

    const operations = (operationRows ?? []) as DeltaOperation[];
    const maxVersion = operations.reduce(
      (max, op) => Math.max(max, Number(op.version_seq ?? 0)),
      result.lastVersion
    );
    const { applyOperationToMap } = await import('../utils/syncUtils');
    const replayed = operations.reduce((people, op) => {
      if (op.type === 'SET_TREE_METADATA') {
        const metadata = op.payload.treeMetadata ?? {};
        if (metadata.focusId && people[metadata.focusId]) result.focusId = metadata.focusId;
        if (metadata.settings) result.settings = metadata.settings;
        if (metadata.name) result.name = metadata.name;
        return people;
      }

      return applyOperationToMap(people, op) ?? people;
    }, result.people);

    return {
      ...result,
      people: replayed,
      lastVersion: maxVersion,
    };
  }

  // 2. Legacy Fallback (No checkpoint found)
  const { data: tree, error: treeError } = await client
    .from('trees')
    .select('*')
    .eq('id', treeId)
    .single();

  if (treeError) throw treeError;

  const [
    { data: peopleRows, error: peopleError },
    { data: relRows, error: relError },
    { data: operationRows, error: opsError },
  ] = await Promise.all([
    client.from('people_secure').select('*').eq('tree_id', treeId),
    client.from('relationships').select('*').eq('tree_id', treeId),
    client
      .from('tree_operations')
      .select('*')
      .eq('tree_id', treeId)
      .order('version_seq', { ascending: true }),
  ]);

  if (peopleError) throw peopleError;
  if (relError) throw relError;
  if (opsError) throw opsError;

  const result = buildTreeFetchResult(tree, peopleRows, relRows, null);
  const operations = (operationRows ?? []) as DeltaOperation[];
  const maxVersion = operations.reduce((max, op) => Math.max(max, Number(op.version_seq ?? 0)), 0);
  const { applyOperationToMap } = await import('../utils/syncUtils');
  const replayed = operations.reduce((people, op) => {
    if (op.type === 'SET_TREE_METADATA') {
      const metadata = op.payload.treeMetadata ?? {};
      if (metadata.focusId && people[metadata.focusId]) result.focusId = metadata.focusId;
      if (metadata.settings) result.settings = metadata.settings;
      if (metadata.name) result.name = metadata.name;
      return people;
    }

    return applyOperationToMap(people, op) ?? people;
  }, result.people);

  return {
    ...result,
    people: replayed,
    lastVersion: maxVersion,
  };
};
