import { describe, it, expect } from 'vitest';
import { Person, RelationshipEdge } from '../index';
import { deriveRelationshipsFromPeople, syncRelationshipsWithPeople } from '../relationship';

describe('Relationship Edge Derivation & Sync', () => {
  const treeId = 'test-tree';

  const mockPerson1: Person = {
    id: 'p1',
    title: '',
    firstName: 'John',
    middleName: '',
    lastName: 'Doe',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '',
    birthPlace: '',
    birthSource: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: false,
    profession: '',
    company: '',
    interests: '',
    bio: '',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: [],
    spouses: ['p2'],
    children: ['p3'],
  };

  const mockPerson2: Person = {
    ...mockPerson1,
    id: 'p2',
    firstName: 'Jane',
    gender: 'female',
    spouses: ['p1'],
    children: ['p3'],
  };

  const mockPerson3: Person = {
    ...mockPerson1,
    id: 'p3',
    firstName: 'Junior',
    parents: ['p1', 'p2'],
    spouses: [],
    children: [],
  };

  const peopleMap: Record<string, Person> = {
    p1: mockPerson1,
    p2: mockPerson2,
    p3: mockPerson3,
  };

  describe('deriveRelationshipsFromPeople', () => {
    it('should derive biological parent and spouse relationship edges correctly', () => {
      const edges = deriveRelationshipsFromPeople(treeId, peopleMap);
      const edgeList = Object.values(edges);

      // We expect 3 edges:
      // 1 spouse edge between p1 and p2 (normalized)
      // 1 parent-child edge from p1 to p3
      // 1 parent-child edge from p2 to p3
      expect(edgeList).toHaveLength(3);

      const spouseEdge = edgeList.find((e) => e.type === 'SPOUSE');
      expect(spouseEdge).toBeDefined();
      expect(spouseEdge?.fromPersonId).toBe('p1'); // p1 < p2 alphabetically
      expect(spouseEdge?.toPersonId).toBe('p2');

      const parentEdges = edgeList.filter((e) => e.type === 'BIOLOGICAL_PARENT');
      expect(parentEdges).toHaveLength(2);

      const p1ToP3 = parentEdges.find((e) => e.fromPersonId === 'p1');
      expect(p1ToP3).toBeDefined();
      expect(p1ToP3?.toPersonId).toBe('p3');

      const p2ToP3 = parentEdges.find((e) => e.fromPersonId === 'p2');
      expect(p2ToP3).toBeDefined();
      expect(p2ToP3?.toPersonId).toBe('p3');
    });

    it('should prevent self-relationships', () => {
      const selfLinkingPeople: Record<string, Person> = {
        p1: {
          ...mockPerson1,
          spouses: ['p1'],
          parents: ['p1'],
        },
      };

      const edges = deriveRelationshipsFromPeople(treeId, selfLinkingPeople);
      expect(Object.keys(edges)).toHaveLength(0);
    });

    it('should ignore non-existent people links', () => {
      const ghostPeople: Record<string, Person> = {
        p1: {
          ...mockPerson1,
          spouses: ['ghost-spouse'],
          parents: ['ghost-parent'],
          children: ['ghost-child'],
        },
      };

      const edges = deriveRelationshipsFromPeople(treeId, ghostPeople);
      expect(Object.keys(edges)).toHaveLength(0);
    });
  });

  describe('syncRelationshipsWithPeople', () => {
    it('should preserve custom relationship types and metadata for existing links', () => {
      // 1. Initial derivation
      const initialEdges = deriveRelationshipsFromPeople(treeId, peopleMap);
      
      // 2. Mock a custom relationship type (e.g. ADOPTIVE_PARENT) and metadata
      const edgeList = Object.values(initialEdges);
      const parentEdge = edgeList.find((e) => e.fromPersonId === 'p1' && e.toPersonId === 'p3');
      expect(parentEdge).toBeDefined();

      const customParentEdge: RelationshipEdge = {
        ...parentEdge!,
        type: 'ADOPTIVE_PARENT',
        metadata: {
          startDate: '2020-01-01',
          startPlace: 'Home',
        },
      };

      const customEdgesRecord = {
        ...initialEdges,
        [customParentEdge.id]: customParentEdge,
      };

      // 3. Sync relationships with the same people map
      const synced = syncRelationshipsWithPeople(customEdgesRecord, treeId, peopleMap);

      // Verify that the ADOPTIVE_PARENT edge is preserved with its metadata!
      const syncedParentEdge = Object.values(synced).find(
        (e) => e.fromPersonId === 'p1' && e.toPersonId === 'p3'
      );
      expect(syncedParentEdge).toBeDefined();
      expect(syncedParentEdge?.type).toBe('ADOPTIVE_PARENT');
      expect(syncedParentEdge?.metadata?.startDate).toBe('2020-01-01');
    });

    it('should remove obsolete relationship edges during sync', () => {
      const initialEdges = deriveRelationshipsFromPeople(treeId, peopleMap);

      // Remove the child from John (p1)
      const updatedJohn = {
        ...mockPerson1,
        children: [],
      };
      // Remove John from Junior's parents (p3)
      const updatedJunior = {
        ...mockPerson3,
        parents: ['p2'],
      };

      const updatedPeople = {
        ...peopleMap,
        p1: updatedJohn,
        p3: updatedJunior,
      };

      const synced = syncRelationshipsWithPeople(initialEdges, treeId, updatedPeople);
      const parentEdges = Object.values(synced).filter((e) => e.type === 'BIOLOGICAL_PARENT');

      // Junior (p3) should now only have Jane (p2) as a parent edge
      expect(parentEdges).toHaveLength(1);
      expect(parentEdges[0].fromPersonId).toBe('p2');
    });
  });
});
