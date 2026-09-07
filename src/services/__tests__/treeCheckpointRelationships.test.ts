import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePerson } from '../../utils/familyLogic';
import { fetchTree } from '../supabaseTreeReadService';

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('../supabaseTreeClient', () => ({ getTreeClient: mocks.client }));
vi.mock('../../utils/errorLogger', () => ({ logError: vi.fn() }));

const treeId = 'checkpoint-tree';
const fixture = () => ({
  father: validatePerson({ id: 'father', firstName: 'Father', spouses: ['mother', 'former'], children: ['child'],
    partnerDetails: { former: { type: 'divorced', startDate: '1990' } } }),
  mother: validatePerson({ id: 'mother', spouses: ['father'], children: ['child'], isPrivate: true }),
  former: validatePerson({ id: 'former', spouses: ['father'], children: ['child'] }),
  child: validatePerson({ id: 'child', parents: ['father', 'mother', 'former'],
    gallery: [{ id: 'image', caption: 'Preserved caption', version: 1, createdAt: '2026-09-07' }] }),
});
const edges = [
  { person_id: 'father', relative_id: 'mother', type: 'spouse' },
  { person_id: 'father', relative_id: 'former', type: 'spouse' },
  { person_id: 'father', relative_id: 'child', type: 'child' },
  { person_id: 'child', relative_id: 'mother', type: 'parent' },
];
const setup = (options: { edges?: typeof edges; error?: Error; operations?: unknown[] } = {}) => {
  const people = fixture();
  const edgeRows = options.edges ?? edges;
  const range = vi.fn(async (offset: number, end: number) => ({ data: edgeRows.slice(offset, end + 1), error: options.error ?? null }));
  const from = vi.fn((table: string) => {
    const data = table === 'tree_checkpoints' ? { people, version_seq: 0 }
      : table === 'trees' ? { owner_id: 'owner', focus_id: 'child', settings: { ownerPersonId: 'father' } }
        : table === 'tree_operations' ? options.operations ?? [] : null;
    if (!['tree_checkpoints', 'trees', 'tree_operations', 'relationships'].includes(table)) throw new Error(`Unexpected table ${table}`);
    const result = Promise.resolve({ data, error: null });
    const chain = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain), gt: vi.fn(() => chain),
      order: vi.fn(() => chain), limit: vi.fn(() => chain), range,
      maybeSingle: () => result, single: () => result, then: result.then.bind(result),
    };
    return chain;
  });
  mocks.client.mockReturnValue({ from });
  return { people, from, range };
};

describe('checkpoint relationships use persisted edges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes historical inferred parenthood without changing people, metadata or the checkpoint', async () => {
    const { people } = setup();
    const before = JSON.stringify(people);
    const result = await fetchTree(treeId, 'owner', 'owner@example.test');
    expect(result.people.child.parents.slice().sort()).toEqual(['father', 'mother']);
    expect(result.people.former.children).toEqual([]);
    expect(result.people.father.spouses).toEqual(['mother', 'former']);
    expect(result.people.mother.children).toEqual(['child']);
    expect(result.people.child.gallery).toEqual(people.child.gallery);
    expect(result.people.father.partnerDetails).toEqual(people.father.partnerDetails);
    expect(result.people.mother.isPrivate).toBe(true);
    expect(result.focusId).toBe('child');
    expect(result.settings).toEqual({ ownerPersonId: 'father' });
    expect(JSON.stringify(people)).toBe(before);
  });

  it('clears obsolete checkpoint arrays when no relationships remain', async () => {
    setup({ edges: [] });
    const result = await fetchTree(treeId, 'owner', 'owner@example.test');
    for (const person of Object.values(result.people)) {
      expect(person.parents).toEqual([]); expect(person.children).toEqual([]); expect(person.spouses).toEqual([]);
    }
  });

  it('fails closed when canonical relationships cannot be read', async () => {
    setup({ error: new Error('Relationship access denied') });
    await expect(fetchTree(treeId, 'owner', 'owner@example.test')).rejects.toThrow('Relationship access denied');
  });

  it('loads all relationship pages before returning the graph', async () => {
    const { range } = setup({ edges: [...Array.from({ length: 1000 }, () => edges[0]), edges[2]] });
    const result = await fetchTree(treeId, 'owner', 'owner@example.test');
    expect(range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
    expect(result.people.child.parents).toEqual(['father']);
  });

  it('preserves trailing property updates without replaying obsolete relationships over current edges', async () => {
    setup({ operations: [
      { type: 'UPDATE_PROP', version_seq: 1, payload: { id: 'child', updates: { firstName: 'Updated' } } },
      { type: 'ADD_RELATION', version_seq: 2, payload: { focusId: 'former', existingId: 'child', type: 'child' } },
      { type: 'DELETE_RELATION', version_seq: 3, payload: { targetId: 'former', relativeId: 'child', type: 'child' } },
    ] });
    const result = await fetchTree(treeId, 'owner', 'owner@example.test');
    expect(result.people.child.firstName).toBe('Updated');
    expect(result.people.child.parents.slice().sort()).toEqual(['father', 'mother']);
    expect(result.lastVersion).toBe(3);
  });
});
