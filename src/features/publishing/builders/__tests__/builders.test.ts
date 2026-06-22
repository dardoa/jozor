import { describe, expect, it } from 'vitest';
import { AncestorBuilder } from '../AncestorBuilder';
import { BranchBuilder } from '../BranchBuilder';
import { TimelineBuilder } from '../TimelineBuilder';
import type { Person } from '../../../../types';
import { createPerson } from '../../../../utils/familyLogic';

// Construct clean mock people without using banned `any` casts
const createMockPerson = (id: string, gender: 'male' | 'female', overrides: Partial<Person>): Person => {
  return {
    ...createPerson(gender),
    id,
    gender,
    ...overrides,
  };
};

const mockPeople: Record<string, Person> = {
  'p-root': createMockPerson('p-root', 'male', {
    firstName: 'Ahmad',
    lastName: 'Al-Jamil',
    birthDate: '1990-05-15',
    birthPlace: 'Riyadh',
    parents: ['p-father', 'p-mother'],
    spouses: ['p-spouse'],
    children: ['p-child'],
  }),
  'p-father': createMockPerson('p-father', 'male', {
    firstName: 'Saleh',
    lastName: 'Al-Jamil',
    birthDate: '1960-01-01',
    birthPlace: 'Riyadh',
    isDeceased: true,
    deathDate: '2020-10-10',
    deathPlace: 'Jeddah',
    parents: ['p-grandfather'],
    children: ['p-root'],
  }),
  'p-mother': createMockPerson('p-mother', 'female', {
    firstName: 'Fatima',
    lastName: 'Al-Harbi',
    birthDate: '1965-02-02',
    birthPlace: 'Makkah',
    children: ['p-root'],
  }),
  'p-grandfather': createMockPerson('p-grandfather', 'male', {
    firstName: 'Ibrahim',
    lastName: 'Al-Jamil',
    birthDate: '1930-03-03',
    birthPlace: 'Riyadh',
    isDeceased: true,
    children: ['p-father'],
  }),
  'p-spouse': createMockPerson('p-spouse', 'female', {
    firstName: 'Mona',
    lastName: 'Al-Nasser',
    birthDate: '1992-04-04',
    birthPlace: 'Riyadh',
    spouses: ['p-root'],
    children: ['p-child'],
  }),
  'p-child': createMockPerson('p-child', 'male', {
    firstName: 'Faisal',
    lastName: 'Al-Jamil',
    birthDate: '2015-08-08',
    birthPlace: 'Riyadh',
    parents: ['p-root', 'p-spouse'],
    events: [
      {
        id: 'ev-grad',
        title: 'Graduation',
        date: '2035-06-06',
        place: 'Riyadh',
        description: 'Finished school',
      },
    ],
  }),
};

describe('Publishing Builders', () => {
  describe('AncestorBuilder', () => {
    it('successfully traverses parents upward up to default generations depth', () => {
      const doc = AncestorBuilder.build(mockPeople, 'p-root', 3);
      expect(doc.title).toBe('شجرة أسلاف Ahmad Al-Jamil');
      expect(doc.type).toBe('single-page');
      expect(doc.sections).toHaveLength(2); // Cover + Tree sections

      const treeSection = doc.sections[1];
      expect(treeSection.type).toBe('tree');
      expect(treeSection.blocks).toHaveLength(1);

      const treeBlock = treeSection.blocks[0];
      expect(treeBlock.type).toBe('tree');

      // There should be exactly one tree-diagram asset in the block
      expect(treeBlock.assets).toHaveLength(1);
      const treeAsset = treeBlock.assets[0];
      expect(treeAsset.type).toBe('tree-diagram');

      const payload = treeAsset.payload as {
        rootPersonId: string;
        people: Record<string, Person>;
        relationships: unknown[];
      };
      expect(payload.rootPersonId).toBe('p-root');

      // People collected should be: p-root, p-father, p-mother, p-grandfather
      const personIds = Object.keys(payload.people);
      expect(personIds).toHaveLength(4);
      expect(personIds).toContain('p-root');
      expect(personIds).toContain('p-father');
      expect(personIds).toContain('p-mother');
      expect(personIds).toContain('p-grandfather');

      // Relationships collected: p-root->p-father, p-root->p-mother, p-father->p-grandfather
      expect(payload.relationships).toHaveLength(3);
    });

    it('throws an error if root person is not found', () => {
      expect(() => AncestorBuilder.build(mockPeople, 'non-existent')).toThrow();
    });

    it('deduplicates parent relationships in case of pedigree collapse (common ancestor)', () => {
      const collapsePeople: Record<string, Person> = {
        'p-root': createMockPerson('p-root', 'male', {
          firstName: 'Root',
          parents: ['p-father', 'p-mother'],
        }),
        'p-father': createMockPerson('p-father', 'male', {
          firstName: 'Father',
          parents: ['p-grandfather'],
        }),
        'p-mother': createMockPerson('p-mother', 'female', {
          firstName: 'Mother',
          parents: ['p-grandfather'],
        }),
        'p-grandfather': createMockPerson('p-grandfather', 'male', {
          firstName: 'Grandfather',
          parents: ['p-greatgrandfather'],
        }),
        'p-greatgrandfather': createMockPerson('p-greatgrandfather', 'male', {
          firstName: 'Great Grandfather',
        }),
      };

      const doc = AncestorBuilder.build(collapsePeople, 'p-root', 4);
      const treeBlock = doc.sections[1].blocks[0];
      const treeAsset = treeBlock.assets[0];
      const payload = treeAsset.payload as {
        relationships: { childId: string; parentId: string; type: 'father' | 'mother' }[];
      };

      // Relationships should contain:
      // 1. p-root -> p-father (father)
      // 2. p-root -> p-mother (mother)
      // 3. p-father -> p-grandfather (father)
      // 4. p-mother -> p-grandfather (father)
      // 5. p-grandfather -> p-greatgrandfather (father) - SHOULD ONLY APPEAR ONCE!
      const gpfToGgpf = payload.relationships.filter(
        (r) => r.childId === 'p-grandfather' && r.parentId === 'p-greatgrandfather'
      );
      expect(gpfToGgpf).toHaveLength(1);
    });
  });

  describe('BranchBuilder', () => {
    it('successfully extracts descendant subgraphs', () => {
      const doc = BranchBuilder.build(mockPeople, 'p-root');
      expect(doc.title).toBe('فرع سلالة Ahmad Al-Jamil');

      const treeSection = doc.sections.find((s) => s.type === 'tree');
      expect(treeSection).toBeDefined();

      const treeBlock = treeSection!.blocks[0];
      
      // There should be exactly one tree-diagram asset in the block
      expect(treeBlock.assets).toHaveLength(1);
      const treeAsset = treeBlock.assets[0];
      expect(treeAsset.type).toBe('tree-diagram');

      const payload = treeAsset.payload as {
        rootPersonId: string;
        people: Record<string, Person>;
        relationships: unknown[];
      };
      expect(payload.rootPersonId).toBe('p-root');

      // Descendants + spouses: p-root, p-spouse, p-child
      const personIds = Object.keys(payload.people);
      expect(personIds).toHaveLength(3);
      expect(personIds).toContain('p-root');
      expect(personIds).toContain('p-spouse');
      expect(personIds).toContain('p-child');

      // Spouse links and parent links
      expect(payload.relationships.length).toBeGreaterThan(0);
    });
  });

  describe('TimelineBuilder', () => {
    it('gathers and sorts birth, marriage, death, and custom events chronologically', () => {
      // Timeline for all people
      const doc = TimelineBuilder.build(mockPeople);
      expect(doc.title).toBe('الخط الزمني العام للعائلة');

      const timelineSection = doc.sections.find((s) => s.type === 'timeline');
      expect(timelineSection).toBeDefined();

      const timelineBlock = timelineSection!.blocks[0];
      const eventAssets = timelineBlock.assets.filter((a) => a.type === 'event');

      // Total events:
      // p-root: birth (1990)
      // p-father: birth (1960), death (2020)
      // p-mother: birth (1965)
      // p-grandfather: birth (1930) (marked deceased but no deathDate)
      // p-spouse: birth (1992)
      // p-child: birth (2015), graduation custom event (2035)
      // Total should be 8 events
      expect(eventAssets).toHaveLength(8);

      // Verify sorting: earliest should be Ibrahim (p-grandfather birth in 1930)
      const firstEvent = eventAssets[0].payload as { date: string; title: string };
      expect(firstEvent.date).toBe('1930-03-03');
      expect(firstEvent.title).toContain('Ibrahim');

      // Latest should be Faisal (p-child graduation in 2035)
      const lastEvent = eventAssets[eventAssets.length - 1].payload as { date: string; title: string };
      expect(lastEvent.date).toBe('2035-06-06');
      expect(lastEvent.title).toBe('Graduation');
    });

    it('gathers events filtered to a specific root person descendant tree', () => {
      // Filter to p-root branch descendants (Ahmad and Faisal, Mona spouse)
      const doc = TimelineBuilder.build(mockPeople, 'p-root');
      expect(doc.title).toBe('الخط الزمني لعائلة Ahmad Al-Jamil');

      const timelineBlock = doc.sections.find((s) => s.type === 'timeline')!.blocks[0];
      const eventAssets = timelineBlock.assets.filter((a) => a.type === 'event');

      // Ahmad: birth (1990)
      // Mona: birth (1992)
      // Faisal: birth (2015), graduation (2035)
      // Total 4 events
      expect(eventAssets).toHaveLength(4);
    });
  });
});
