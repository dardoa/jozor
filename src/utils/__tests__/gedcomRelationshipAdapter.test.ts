import { describe, expect, it } from 'vitest';
import { Person } from '../../types';
import { RelationshipEdge } from '../../types/relationship';
import { buildGedcomFamilyGroups } from '../gedcomRelationshipAdapter';

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

describe('GEDCOMRelationshipAdapter', () => {
  it('builds one spouse family group from a spouse edge', () => {
    const people = {
      p1: mockPerson('p1', { gender: 'male' }),
      p2: mockPerson('p2', { gender: 'female' }),
    };

    const edge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'p2',
      type: 'SPOUSE',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const { groups, warnings } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge] });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({
      familyId: 'fam:p1:p2',
      spouseIds: ['p1', 'p2'],
      childIds: [],
      source: 'relationship-edge',
      warnings: [],
    });
    expect(warnings).toHaveLength(0);
  });

  it('normalizes duplicate spouse edges into one group and emits DUPLICATE_SPOUSE_PAIR', () => {
    const people = {
      p1: mockPerson('p1'),
      p2: mockPerson('p2'),
    };

    const edge1: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'p2',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const edge2: RelationshipEdge = {
      id: 'e2',
      treeId: 'tree-1',
      fromPersonId: 'p2',
      toPersonId: 'p1',
      type: 'SPOUSE',
      createdAt: '2026-01-02',
    };

    const { groups, warnings } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge1, edge2] });

    expect(groups).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('DUPLICATE_SPOUSE_PAIR');
    expect(warnings[0].personIds).toEqual(['p1', 'p2']);
  });

  it('ignores self-spouse and self-parent edges with SELF_RELATIONSHIP', () => {
    const people = {
      p1: mockPerson('p1'),
    };

    const edge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'p1',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const { groups, warnings } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge] });

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('SELF_RELATIONSHIP');
  });

  it('builds parent-child family groups from edge direction', () => {
    const people = {
      parent: mockPerson('parent'),
      child: mockPerson('child'),
    };

    const edge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'parent',
      toPersonId: 'child',
      type: 'BIOLOGICAL_PARENT',
      createdAt: '2026-01-01',
    };

    const { groups } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge] });

    expect(groups).toHaveLength(1);
    expect(groups[0].familyId).toBe('fam:parent:single');
    expect(groups[0].spouseIds).toEqual(['parent']);
    expect(groups[0].childIds).toEqual(['child']);
  });

  it('attaches child to spouse family group when both parents are spouses', () => {
    const people = {
      p1: mockPerson('p1'),
      p2: mockPerson('p2'),
      child: mockPerson('child'),
    };

    const edgeSpouse: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'p2',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const edgeParent1: RelationshipEdge = {
      id: 'e2',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'child',
      type: 'BIOLOGICAL_PARENT',
      createdAt: '2026-01-02',
    };

    const edgeParent2: RelationshipEdge = {
      id: 'e3',
      treeId: 'tree-1',
      fromPersonId: 'p2',
      toPersonId: 'child',
      type: 'BIOLOGICAL_PARENT',
      createdAt: '2026-01-03',
    };

    const { groups } = buildGedcomFamilyGroups({
      people,
      relationshipEdges: [edgeSpouse, edgeParent1, edgeParent2],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].familyId).toBe('fam:p1:p2');
    expect(groups[0].childIds).toEqual(['child']);
  });

  it('creates single-parent family group when only one parent is present', () => {
    const people = {
      p1: mockPerson('p1'),
      child: mockPerson('child'),
    };

    const edge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'child',
      type: 'BIOLOGICAL_PARENT',
      createdAt: '2026-01-01',
    };

    const { groups } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge] });

    expect(groups).toHaveLength(1);
    expect(groups[0].familyId).toBe('fam:p1:single');
    expect(groups[0].spouseIds).toEqual(['p1']);
    expect(groups[0].childIds).toEqual(['child']);
  });

  it('emits MISSING_PERSON warning without throwing', () => {
    const people = {
      p1: mockPerson('p1'),
    };

    const edge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'missing-p2',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const { groups, warnings } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge] });

    expect(groups).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('MISSING_PERSON');
    expect(warnings[0].personIds).toContain('missing-p2');
  });

  it('uses legacy arrays when edges are absent', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
    };

    const { groups } = buildGedcomFamilyGroups({ people, relationshipEdges: [] });

    expect(groups).toHaveLength(1);
    expect(groups[0].familyId).toBe('fam:p1:p2');
    expect(groups[0].source).toBe('legacy-array');
  });

  it('prefers edges and emits RELATIONSHIP_DRIFT when legacy arrays conflict', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }), // legacy has spouse p2
      p2: mockPerson('p2', { spouses: ['p1'] }),
    };

    const activeEdge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'p3', // edges show p1 spouse is p3, legacy shows p1 spouse is p2
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const updatedPeople = {
      ...people,
      p3: mockPerson('p3'),
    };

    const result = buildGedcomFamilyGroups({
      people: updatedPeople,
      relationshipEdges: [activeEdge],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].familyId).toBe('fam:p1:p3'); // preferred edge
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe('RELATIONSHIP_DRIFT');
  });

  it('does not complete edge-derived groups from conflicting legacy arrays', () => {
    const people = {
      p1: mockPerson('p1', { spouses: ['p2'] }),
      p2: mockPerson('p2', { spouses: ['p1'] }),
    };

    // Active edges show p1 has parent relationship with child, but no spouse edges
    const parentEdge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'c1',
      type: 'BIOLOGICAL_PARENT',
      createdAt: '2026-01-01',
    };

    const updatedPeople = {
      ...people,
      c1: mockPerson('c1', { parents: ['p1', 'p2'] }),
    };

    const result = buildGedcomFamilyGroups({
      people: updatedPeople,
      relationshipEdges: [parentEdge],
    });

    // Edges only indicate p1 -> c1, and no spouse edges.
    // The legacy array shows p1 & p2 are spouses and c1 has both parents, but we must not mutate edge-derived groups.
    // So it should NOT create fam:p1:p2, instead it creates fam:p1:single child c1.
    const hasSpouseGroup = result.groups.some(g => g.familyId === 'fam:p1:p2');
    expect(hasSpouseGroup).toBe(false);

    const singleGroup = result.groups.find(g => g.familyId === 'fam:p1:single');
    expect(singleGroup).toBeDefined();
    expect(singleGroup!.childIds).toContain('c1');
  });

  it('produces deterministic sorted output', () => {
    const people = {
      p1: mockPerson('p1'),
      p2: mockPerson('p2'),
    };

    const edge1: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p2',
      toPersonId: 'p1',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const { groups } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge1] });

    expect(groups[0].familyId).toBe('fam:p1:p2'); // sorted
    expect(groups[0].spouseIds).toEqual(['p1', 'p2']); // sorted spouseIds
  });

  it('does not include person display names or raw biographical fields in warnings', () => {
    const people = {
      p1: mockPerson('p1', { firstName: 'SensitiveFirstName', birthDate: '1990-01-01' }),
    };

    const edge: RelationshipEdge = {
      id: 'e1',
      treeId: 'tree-1',
      fromPersonId: 'p1',
      toPersonId: 'missing-p2',
      type: 'SPOUSE',
      createdAt: '2026-01-01',
    };

    const { warnings } = buildGedcomFamilyGroups({ people, relationshipEdges: [edge] });

    const warningStr = JSON.stringify(warnings);
    expect(warningStr).not.toContain('SensitiveFirstName');
    expect(warningStr).not.toContain('1990-01-01');
  });
});
