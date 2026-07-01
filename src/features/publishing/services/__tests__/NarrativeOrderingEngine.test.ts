import { describe, it, expect } from 'vitest';
import { NarrativeOrderingEngine } from '../NarrativeOrderingEngine';
import type { Person } from '../../../../types';
import type { PublishingBranchRelationship } from '../PublishingRelationshipAdapter';

describe('NarrativeOrderingEngine', () => {
  const rootId = 'p-root';
  const rootSpouseId = 'p-root-spouse';
  const child1Id = 'p-child1';
  const child1SpouseId = 'p-child1-spouse';
  const child2Id = 'p-child2';
  const grandchild1Id = 'p-grandchild1';
  const unreachableId = 'p-unreachable';

  const mockPeople: Record<string, Person> = {
    [rootId]: { id: rootId, firstName: 'Z-Root', gender: 'male', birthDate: '1950-01-01' } as Person,
    [rootSpouseId]: { id: rootSpouseId, firstName: 'A-Spouse', gender: 'female' } as Person,
    [child1Id]: { id: child1Id, firstName: 'Y-Child1', gender: 'male', birthDate: '1980-01-01' } as Person,
    [child1SpouseId]: { id: child1SpouseId, firstName: 'B-Child1-Spouse', gender: 'female' } as Person,
    [child2Id]: { id: child2Id, firstName: 'C-Child2', gender: 'female', birthDate: '1985-01-01' } as Person,
    [grandchild1Id]: { id: grandchild1Id, firstName: 'X-Grandchild1', gender: 'male' } as Person,
    [unreachableId]: { id: unreachableId, firstName: 'D-Unreachable', gender: 'male' } as Person,
  };

  const mockRelationships: PublishingBranchRelationship[] = [
    { type: 'spouse', personId: rootId, spouseId: rootSpouseId },
    { type: 'parent', parentId: rootId, childId: child1Id },
    { type: 'parent', parentId: rootId, childId: child2Id },
    { type: 'spouse', personId: child1Id, spouseId: child1SpouseId },
    { type: 'parent', parentId: child1Id, childId: grandchild1Id },
  ];

  it('verifies that narrative ordering is not alphabetical when genealogy differs', () => {
    const result = NarrativeOrderingEngine.orderPeople({
      rootPersonId: rootId,
      people: mockPeople,
      relationships: mockRelationships,
      strategy: 'narrative',
    });

    // In alphabetical order: A-Spouse, B-Child1-Spouse, C-Child2, D-Unreachable, X-Grandchild1, Y-Child1, Z-Root
    // Narrative expected: Root -> Spouse -> Child1 -> Child1-Spouse -> Grandchild1 -> Child2 -> Unreachable
    expect(result[0]).toBe(rootId);
    expect(result[1]).toBe(rootSpouseId);
    expect(result).not.toEqual(
      Object.keys(mockPeople).sort((a, b) =>
        (mockPeople[a].firstName || '').localeCompare(mockPeople[b].firstName || '')
      )
    );
  });

  it('verifies that root appears first and spouse appears near root', () => {
    const { orderedIds, metadata } = NarrativeOrderingEngine.orderPeopleWithMetadata({
      rootPersonId: rootId,
      people: mockPeople,
      relationships: mockRelationships,
      strategy: 'narrative',
    });

    expect(orderedIds[0]).toBe(rootId);
    expect(orderedIds[1]).toBe(rootSpouseId);

    expect(metadata[rootId]).toEqual({
      generation: 0,
      branchPath: [rootId],
      relationshipToRoot: 'root',
    });

    expect(metadata[rootSpouseId]).toEqual({
      generation: 0,
      branchPath: [rootId, rootSpouseId],
      relationshipToRoot: 'spouse',
    });
  });

  it('verifies first child branch is fully completed (depth-first) before next sibling branch', () => {
    const result = NarrativeOrderingEngine.orderPeople({
      rootPersonId: rootId,
      people: mockPeople,
      relationships: mockRelationships,
      strategy: 'narrative',
    });

    // Root -> Spouses -> Child1 -> Spouses of Child1 -> Grandchild1 (descendant of Child1) -> Child2
    const child1Idx = result.indexOf(child1Id);
    const grandchild1Idx = result.indexOf(grandchild1Id);
    const child2Idx = result.indexOf(child2Id);

    expect(child1Idx).toBeGreaterThan(-1);
    expect(grandchild1Idx).toBeGreaterThan(child1Idx);
    expect(child2Idx).toBeGreaterThan(grandchild1Idx); // child 2 must come AFTER grandchild 1 (depth-first traversal of child 1 completed)
  });

  it('prevents infinite loops when family relationships contain cycles', () => {
    const cyclicRelationships: PublishingBranchRelationship[] = [
      ...mockRelationships,
      // Cycle: child1 is parent of parent (impossible genealogically but ensures loop safety)
      { type: 'parent', parentId: grandchild1Id, childId: rootId },
    ];

    expect(() => {
      NarrativeOrderingEngine.orderPeople({
        rootPersonId: rootId,
        people: mockPeople,
        relationships: cyclicRelationships,
        strategy: 'narrative',
      });
    }).not.toThrow();
  });

  it('appends unreachable people deterministically at the end', () => {
    const result = NarrativeOrderingEngine.orderPeople({
      rootPersonId: rootId,
      people: mockPeople,
      relationships: mockRelationships,
      strategy: 'narrative',
    });

    expect(result[result.length - 1]).toBe(unreachableId);
  });

  it('verifies that metadata fields are populated correctly', () => {
    const { metadata } = NarrativeOrderingEngine.orderPeopleWithMetadata({
      rootPersonId: rootId,
      people: mockPeople,
      relationships: mockRelationships,
      strategy: 'narrative',
    });

    // Root
    expect(metadata[rootId].generation).toBe(0);
    expect(metadata[rootId].relationshipToRoot).toBe('root');
    expect(metadata[rootId].branchPath).toEqual([rootId]);

    // Spouse of Root
    expect(metadata[rootSpouseId].generation).toBe(0);
    expect(metadata[rootSpouseId].relationshipToRoot).toBe('spouse');
    expect(metadata[rootSpouseId].branchPath).toEqual([rootId, rootSpouseId]);

    // Child
    expect(metadata[child1Id].generation).toBe(1);
    expect(metadata[child1Id].relationshipToRoot).toBe('child');
    expect(metadata[child1Id].branchPath).toEqual([rootId, child1Id]);

    // Grandchild
    expect(metadata[grandchild1Id].generation).toBe(2);
    expect(metadata[grandchild1Id].relationshipToRoot).toBe('grandchild');
    expect(metadata[grandchild1Id].branchPath).toEqual([rootId, child1Id, grandchild1Id]);

    // Unreachable relative fallback
    expect(metadata[unreachableId].generation).toBe(0);
    expect(metadata[unreachableId].relationshipToRoot).toBe('relative');
    expect(metadata[unreachableId].branchPath).toEqual([]);
  });

  it('verifies that alphabetical and chronological ordering strategies behave as before', () => {
    const alphabeticalIds = NarrativeOrderingEngine.orderPeople({
      rootPersonId: rootId,
      people: mockPeople,
      relationships: mockRelationships,
      strategy: 'alphabetical',
    });

    // Alphabetical order of display names (e.g. A-Spouse, B-Child1-Spouse, C-Child2, D-Unreachable, X-Grandchild1, Y-Child1, Z-Root)
    expect(alphabeticalIds[0]).toBe(rootSpouseId); // A-Spouse
    expect(alphabeticalIds[alphabeticalIds.length - 1]).toBe(rootId); // Z-Root
  });
});
