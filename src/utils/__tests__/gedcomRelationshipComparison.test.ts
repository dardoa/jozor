import { describe, expect, it } from 'vitest';
import { Person } from '../../types';
import { RelationshipEdge } from '../../types/relationship';
import { compareGedcomRelationships } from '../gedcomRelationshipComparison';

const mockPerson = (id: string, overrides: Partial<Person> = {}): Person => ({
  id,
  firstName: `Person-${id}`,
  lastName: 'Doe',
  gender: 'male',
  parents: [],
  spouses: [],
  children: [],
  birthDate: '',
  birthPlace: '',
  isDeceased: false,
  ...overrides,
} as unknown as Person);

describe('GEDCOMRelationshipComparison', () => {
  it('matching legacy arrays and adapter fallback => equivalent: true', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
    };

    // relationshipEdges is undefined => adapter fallback legacy => equivalent true
    const resultUndefined = compareGedcomRelationships(people, undefined);
    expect(resultUndefined.equivalent).toBe(true);
    expect(resultUndefined.legacyFamilyCount).toBe(1);
    expect(resultUndefined.adapterFamilyCount).toBe(1);

    // relationshipEdges is [] => adapter fallback legacy => equivalent true
    const resultEmptyArray = compareGedcomRelationships(people, []);
    expect(resultEmptyArray.equivalent).toBe(true);
    expect(resultEmptyArray.legacyFamilyCount).toBe(1);
    expect(resultEmptyArray.adapterFamilyCount).toBe(1);
  });

  it('RelationshipEdge groups matching legacy arrays => equivalent: true', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
      c1: mockPerson('c1', { parents: ['p1', 'p2'] }),
    };

    const edges: RelationshipEdge[] = [
      {
        id: 'e1',
        treeId: 'tree-1',
        fromPersonId: 'p1',
        toPersonId: 'p2',
        type: 'SPOUSE',
        createdAt: '2026-01-01',
      },
      {
        id: 'e2',
        treeId: 'tree-1',
        fromPersonId: 'p1',
        toPersonId: 'c1',
        type: 'BIOLOGICAL_PARENT',
        createdAt: '2026-01-02',
      },
      {
        id: 'e3',
        treeId: 'tree-1',
        fromPersonId: 'p2',
        toPersonId: 'c1',
        type: 'BIOLOGICAL_PARENT',
        createdAt: '2026-01-03',
      },
    ];

    const result = compareGedcomRelationships(people, edges);
    expect(result.equivalent).toBe(true);
    expect(result.legacyFamilyCount).toBe(1);
    expect(result.adapterFamilyCount).toBe(1);
  });

  it('missing spouse edge compared to legacy spouse array => difference detected', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
    };

    // Edges are passed as empty, but we simulate it as an empty edge array indicating no edges are present.
    // However, when relationshipEdges is empty [], the adapter falls back to legacy arrays by default.
    // To test edge vs legacy conflict, we must pass at least one edge so fallback is bypassed.
    const parentEdgeOnly: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'c1',
      type: 'BIOLOGICAL_PARENT',
      createdAt: '2026-01-01',
    };

    const updatedPeople = {
      ...people,
      c1: mockPerson('c1', { parents: ['p1'] }),
    };

    const result = compareGedcomRelationships(updatedPeople, [parentEdgeOnly]);
    expect(result.equivalent).toBe(false);

    // Differences must exist for the missing fam:p1:p2 spouse family group in adapter
    const missingDiff = result.differences.find(d => d.code === 'MISSING_IN_ADAPTER');
    expect(missingDiff).toBeDefined();
    expect(missingDiff!.familyId).toBe('fam:p1:p2');
  });

  it('missing child edge compared to legacy parent array => difference detected', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
      c1: mockPerson('c1', { parents: ['p1', 'p2'] }), // legacy child link
    };

    // Spouse edge exists, but parent-child edge is missing in edges list
    const spouseEdgeOnly: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'p2',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const result = compareGedcomRelationships(people, [spouseEdgeOnly]);
    expect(result.equivalent).toBe(false);

    const childMismatch = result.differences.find(d => d.code === 'CHILDREN_MISMATCH');
    expect(childMismatch).toBeDefined();
    expect(childMismatch!.familyId).toBe('fam:p1:p2');
    expect(childMismatch!.personIds).toContain('c1');
  });

  it('conflicting child assignment => CHILDREN_MISMATCH', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
      c1: mockPerson('c1', { parents: ['p1', 'p2'] }),
    };

    // Edges list children differently
    const spouseEdge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'p2',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const childEdge: RelationshipEdge = {
      id: 'e2',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'c2', // different child p1 -> c2 instead of p1/p2 -> c1
      type: 'BIOLOGICAL_PARENT',
      createdAt: '2026-01-02',
    };

    const updatedPeople = {
      ...people,
      c2: mockPerson('c2'),
    };

    const result = compareGedcomRelationships(updatedPeople, [spouseEdge, childEdge]);
    expect(result.equivalent).toBe(false);

    const childMismatch = result.differences.find(d => d.code === 'CHILDREN_MISMATCH');
    expect(childMismatch).toBeDefined();
    expect(childMismatch!.familyId).toBe('fam:p1:p2');
  });

  it('differences never include names, dates, places, or bio', () => {
    const people = {
      p1: mockPerson('p1', { firstName: 'SensitiveName', birthDate: '1990' }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
    };

    const result = compareGedcomRelationships(people, []); // fallback case to trigger warnings/mismatches if any
    const diffStr = JSON.stringify(result);
    expect(diffStr).not.toContain('SensitiveName');
    expect(diffStr).not.toContain('1990');
  });
});
