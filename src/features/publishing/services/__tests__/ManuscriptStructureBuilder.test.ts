import { describe, expect, it } from 'vitest';
import type { Citation, Person, RelationshipEdge, Source } from '../../../../types';
import { createPerson } from '../../../../utils/familyLogic';
import { ManuscriptStructureBuilder } from '../ManuscriptStructureBuilder';

const createMockPerson = (id: string, gender: 'male' | 'female', overrides: Partial<Person>): Person => ({
  ...createPerson(gender),
  id,
  gender,
  ...overrides,
});

describe('ManuscriptStructureBuilder', () => {
  it('builds structured person chapters from relationship-scoped people and evidence', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Root',
        lastName: 'Family',
        birthDate: '1950-01-01',
        birthPlace: 'Kafranbel',
        photoUrl: 'https://example.com/root.jpg',
        children: [],
      }),
      child: createMockPerson('child', 'female', {
        firstName: 'Child',
        lastName: 'Family',
        birthDate: '1980-05-05',
        occupation: 'Teacher',
      }),
      unrelated: createMockPerson('unrelated', 'male', {
        firstName: 'Unrelated',
        lastName: 'Person',
      }),
    };
    const relationships: Record<string, RelationshipEdge> = {
      edge: {
        id: 'edge',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'child',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };
    const sources: Record<string, Source> = {
      source: {
        id: 'source',
        treeId: 'tree-1',
        type: 'DOCUMENT',
        title: 'Birth registry',
        normalizedKey: 'tree-1:DOCUMENT:birth registry',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };
    const citations: Record<string, Citation> = {
      citation: {
        id: 'citation',
        treeId: 'tree-1',
        sourceId: 'source',
        targetType: 'PERSON',
        targetId: 'root',
        targetField: 'person.birth.date',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges: relationships,
      evidence: { sources, citations },
    });

    const peopleChapter = model.chapters.find((chapter) => chapter.type === 'people');
    const overviewChapter = model.chapters.find((chapter) => chapter.type === 'overview');
    const evidenceChapter = model.chapters.find((chapter) => chapter.type === 'evidence');
    expect(overviewChapter?.branchSummaries).toEqual([{
      branchRootPersonId: 'child',
      label: 'Child Family',
      personCount: 1,
    }]);
    expect(peopleChapter?.people?.map((entry) => entry.personId).sort()).toEqual(['child', 'root']);
    expect(peopleChapter?.people?.some((entry) => entry.personId === 'unrelated')).toBe(false);
    expect(peopleChapter?.people?.find((entry) => entry.personId === 'root')?.familyContext).toMatchObject({
      kind: 'root',
      generationDepth: 0,
      label: 'Selected root',
    });
    expect(peopleChapter?.people?.find((entry) => entry.personId === 'child')?.familyContext).toMatchObject({
      kind: 'descendant',
      generationDepth: 1,
      label: 'Generation 2',
      breadcrumb: ['Root Family', 'Child Family'],
      branchRootPersonId: 'child',
      branchLabel: 'Child Family',
    });
    expect(peopleChapter?.people?.find((entry) => entry.personId === 'root')?.citationCount).toBe(1);
    expect(peopleChapter?.people?.find((entry) => entry.personId === 'root')?.sourceHighlights).toEqual([{
      sourceId: 'source',
      title: 'Birth registry',
      citationCount: 1,
    }]);
    expect(evidenceChapter?.citations?.[0]).toMatchObject({
      citationId: 'citation',
      sourceTitle: 'Birth registry',
      targetId: 'root',
    });
    expect(peopleChapter?.people?.find((entry) => entry.personId === 'root')?.photoUrl).toBeUndefined();
  });

  it('includes person photos only when manuscript image output is enabled', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Root',
        lastName: 'Family',
        photoUrl: 'https://example.com/root.jpg',
      }),
    };

    const withoutImages = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      includeImages: false,
    });
    const withImages = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      includeImages: true,
    });

    expect(withoutImages.chapters.find((chapter) => chapter.type === 'people')?.people?.[0]?.photoUrl).toBeUndefined();
    expect(withImages.chapters.find((chapter) => chapter.type === 'people')?.people?.[0]?.photoUrl).toBe('https://example.com/root.jpg');
  });

  it('adds deterministic narrative drafts only when enabled', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Root',
        lastName: 'Family',
        birthDate: '1950-01-01',
        birthPlace: 'Kafranbel',
      }),
    };

    const withoutNarrative = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      includeNarrative: false,
    });
    const withNarrative = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      includeNarrative: true,
      language: 'ar',
    });

    expect(withoutNarrative.chapters.find((chapter) => chapter.type === 'people')?.people?.[0]?.narrative).toBeUndefined();
    expect(withNarrative.chapters.find((chapter) => chapter.type === 'people')?.people?.[0]?.narrative).toContain('Root Family وُلد');
    expect(withNarrative.title).toBe('مخطوط عائلة Root Family');
    expect(withNarrative.chapters.find((chapter) => chapter.type === 'people')?.title).toBe('أفراد العائلة');
    expect(withNarrative.chapters.find((chapter) => chapter.type === 'timeline')?.title).toBe('الخط الزمني للعائلة');
    expect(withNarrative.chapters.find((chapter) => chapter.type === 'people')?.people?.[0]?.facts[0]?.label).toBe('تاريخ الميلاد');
    expect(withNarrative.chapters.find((chapter) => chapter.type === 'timeline')?.timeline?.[0]?.title).toBe('ميلاد');
  });

  it('creates a biography section consumable by the existing book layout', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Root',
        lastName: 'Family',
        birthDate: '1950-01-01',
      }),
    };

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
    });
    const sections = ManuscriptStructureBuilder.buildPersonSections(model);

    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('biography');
    expect(sections[0].blocks[0].type).toBe('header');
    expect(sections[0].blocks[1].assets[0].payload).toMatchObject({
      text: 'Root Family',
    });
  });

  it('limits branch manuscript people by configured generation depth', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Root',
        lastName: 'Family',
      }),
      child: createMockPerson('child', 'female', {
        firstName: 'Child',
        lastName: 'Family',
      }),
      grandchild: createMockPerson('grandchild', 'male', {
        firstName: 'Grandchild',
        lastName: 'Family',
      }),
    };
    const relationshipEdges: Record<string, RelationshipEdge> = {
      child: {
        id: 'edge-child',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'child',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      grandchild: {
        id: 'edge-grandchild',
        treeId: 'tree-1',
        fromPersonId: 'child',
        toPersonId: 'grandchild',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const limited = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges,
      generationsDepth: 2,
    });
    const full = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges,
      generationsDepth: 'all',
    });

    const limitedIds = limited.chapters.find((chapter) => chapter.type === 'people')?.people?.map((entry) => entry.personId).sort();
    const fullIds = full.chapters.find((chapter) => chapter.type === 'people')?.people?.map((entry) => entry.personId).sort();
    expect(limitedIds).toEqual(['child', 'root']);
    expect(fullIds).toEqual(['child', 'grandchild', 'root']);
  });

  it('orders people chapters as a family reading path instead of alphabetical entries', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Founder',
        lastName: 'Family',
        birthDate: '1930-01-01',
      }),
      spouse: createMockPerson('spouse', 'female', {
        firstName: 'Founder Spouse',
        lastName: 'Family',
        birthDate: '1935-01-01',
      }),
      childA: createMockPerson('childA', 'male', {
        firstName: 'Ahmad',
        lastName: 'Family',
        birthDate: '1960-01-01',
      }),
      childASpouse: createMockPerson('childASpouse', 'female', {
        firstName: 'Ahmad Spouse',
        lastName: 'Family',
        birthDate: '1962-01-01',
      }),
      grandchildA: createMockPerson('grandchildA', 'female', {
        firstName: 'Grandchild',
        lastName: 'Family',
        birthDate: '1990-01-01',
      }),
      childB: createMockPerson('childB', 'male', {
        firstName: 'Bilal',
        lastName: 'Family',
        birthDate: '1965-01-01',
      }),
    };
    const relationshipEdges: Record<string, RelationshipEdge> = {
      spouse: {
        id: 'edge-spouse',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'spouse',
        type: 'SPOUSE',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      childA: {
        id: 'edge-child-a',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childA',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      childB: {
        id: 'edge-child-b',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childB',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      childASpouse: {
        id: 'edge-child-a-spouse',
        treeId: 'tree-1',
        fromPersonId: 'childA',
        toPersonId: 'childASpouse',
        type: 'SPOUSE',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      grandchildA: {
        id: 'edge-grandchild-a',
        treeId: 'tree-1',
        fromPersonId: 'childA',
        toPersonId: 'grandchildA',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges,
      generationsDepth: 'all',
    });

    const orderedIds = model.chapters.find((chapter) => chapter.type === 'people')?.people?.map((entry) => entry.personId);
    expect(model.readingOrder).toEqual({
      strategy: 'narrative',
      rootPersonId: 'root',
      personIds: ['root', 'spouse', 'childA', 'childASpouse', 'grandchildA', 'childB'],
    });
    expect(orderedIds).toEqual([
      'root',
      'spouse',
      'childA',
      'childASpouse',
      'grandchildA',
      'childB',
    ]);
  });

  it('supports alphabetical manuscript ordering for name-directory output', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Ziad',
        lastName: 'Family',
        birthDate: '1930-01-01',
      }),
      childA: createMockPerson('childA', 'male', {
        firstName: 'Ahmad',
        lastName: 'Family',
        birthDate: '1960-01-01',
      }),
      childB: createMockPerson('childB', 'male', {
        firstName: 'Bilal',
        lastName: 'Family',
        birthDate: '1955-01-01',
      }),
    };
    const relationshipEdges: Record<string, RelationshipEdge> = {
      childA: {
        id: 'edge-child-a',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childA',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      childB: {
        id: 'edge-child-b',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childB',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges,
      orderingStrategy: 'alphabetical',
    });

    const orderedIds = model.chapters.find((chapter) => chapter.type === 'people')?.people?.map((entry) => entry.personId);
    expect(model.readingOrder?.strategy).toBe('alphabetical');
    expect(model.readingOrder?.personIds).toEqual(['childA', 'childB', 'root']);
    expect(orderedIds).toEqual(['childA', 'childB', 'root']);
  });

  it('supports custom manuscript ordering and appends remaining family entries', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', { firstName: 'Root', birthDate: '1930-01-01' }),
      childA: createMockPerson('childA', 'male', { firstName: 'Ahmad', birthDate: '1960-01-01' }),
      childB: createMockPerson('childB', 'female', { firstName: 'Mona', birthDate: '1955-01-01' }),
    };
    const relationshipEdges: Record<string, RelationshipEdge> = {
      childA: {
        id: 'edge-child-a',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childA',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      childB: {
        id: 'edge-child-b',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childB',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges,
      orderingStrategy: 'custom',
      customPersonOrder: ['childB'],
    });

    const orderedIds = model.chapters.find((chapter) => chapter.type === 'people')?.people?.map((entry) => entry.personId);
    expect(model.readingOrder).toEqual({
      strategy: 'custom',
      rootPersonId: 'root',
      personIds: ['childB', 'root', 'childA'],
    });
    expect(orderedIds).toEqual(['childB', 'root', 'childA']);
  });

  it('supports chronological manuscript ordering for historical reading', () => {
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', {
        firstName: 'Ziad',
        lastName: 'Family',
        birthDate: '1930-01-01',
      }),
      childA: createMockPerson('childA', 'male', {
        firstName: 'Ahmad',
        lastName: 'Family',
        birthDate: '1960-01-01',
      }),
      childB: createMockPerson('childB', 'male', {
        firstName: 'Bilal',
        lastName: 'Family',
        birthDate: '1955-01-01',
      }),
    };
    const relationshipEdges: Record<string, RelationshipEdge> = {
      childA: {
        id: 'edge-child-a',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childA',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      childB: {
        id: 'edge-child-b',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'childB',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges,
      orderingStrategy: 'chronological',
    });

    const orderedIds = model.chapters.find((chapter) => chapter.type === 'people')?.people?.map((entry) => entry.personId);
    expect(orderedIds).toEqual(['root', 'childB', 'childA']);
  });

  it('splits person entries across biography sections to avoid overcrowded print pages', () => {
    const people = Array.from({ length: 5 }).reduce<Record<string, Person>>((acc, _, index) => {
      const id = `person-${index + 1}`;
      acc[id] = createMockPerson(id, index % 2 === 0 ? 'male' : 'female', {
        firstName: `Person ${index + 1}`,
        lastName: 'Family',
        birthDate: `19${70 + index}-01-01`,
      });
      return acc;
    }, {});
    const relationshipEdges = Object.fromEntries(
      Array.from({ length: 4 }).map((_, index) => {
        const childId = `person-${index + 2}`;
        return [`edge-${childId}`, {
          id: `edge-${childId}`,
          treeId: 'tree-1',
          fromPersonId: 'person-1',
          toPersonId: childId,
          type: 'BIOLOGICAL_PARENT',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00.000Z',
        } satisfies RelationshipEdge];
      })
    );

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'person-1',
      people,
      relationshipEdges,
    });

    const sections = ManuscriptStructureBuilder.buildPersonSections(model);
    expect(sections).toHaveLength(2);
    expect(sections[0].blocks.filter((block) => block.type === 'paragraph')).toHaveLength(4);
    expect(sections[1].blocks.filter((block) => block.type === 'paragraph')).toHaveLength(1);
  });

  it('verifies genealogical narrative flow ordering matches depth-first traversal and populates metadata correctly', () => {
    // Z Root, A Spouse, Y First Child, B Child Spouse, X Grandchild, C Second Child
    const people: Record<string, Person> = {
      root: createMockPerson('root', 'male', { firstName: 'Z Root', lastName: 'Family', birthDate: '1950-01-01' }),
      spouse: createMockPerson('spouse', 'female', { firstName: 'A Spouse', lastName: 'Family', birthDate: '1952-01-01' }),
      child1: createMockPerson('child1', 'male', { firstName: 'Y First Child', lastName: 'Family', birthDate: '1980-01-01' }),
      spouseChild1: createMockPerson('spouseChild1', 'female', { firstName: 'B Child Spouse', lastName: 'Family', birthDate: '1982-01-01' }),
      grandchild: createMockPerson('grandchild', 'male', { firstName: 'X Grandchild', lastName: 'Family', birthDate: '2010-01-01' }),
      child2: createMockPerson('child2', 'male', { firstName: 'C Second Child', lastName: 'Family', birthDate: '1985-01-01' }),
    };

    const relationshipEdges: Record<string, RelationshipEdge> = {
      edgeSpouse: {
        id: 'edgeSpouse',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'spouse',
        type: 'SPOUSE',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      edgeChild1: {
        id: 'edgeChild1',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'child1',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      edgeChild2: {
        id: 'edgeChild2',
        treeId: 'tree-1',
        fromPersonId: 'root',
        toPersonId: 'child2',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      edgeChild1Spouse: {
        id: 'edgeChild1Spouse',
        treeId: 'tree-1',
        fromPersonId: 'child1',
        toPersonId: 'spouseChild1',
        type: 'SPOUSE',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      edgeGrandchild: {
        id: 'edgeGrandchild',
        treeId: 'tree-1',
        fromPersonId: 'child1',
        toPersonId: 'grandchild',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const model = ManuscriptStructureBuilder.buildModel({
      rootPersonId: 'root',
      people,
      relationshipEdges,
    });

    const peopleChapter = model.chapters.find((c) => c.type === 'people');
    expect(peopleChapter).toBeDefined();

    const orderedIds = peopleChapter?.people?.map((p) => p.personId);
    // Root -> Spouse -> Child1 -> Child1Spouse -> Grandchild -> Child2
    expect(orderedIds).toEqual(['root', 'spouse', 'child1', 'spouseChild1', 'grandchild', 'child2']);

    const rootEntry = peopleChapter?.people?.find((p) => p.personId === 'root');
    expect(rootEntry?.relationshipToRoot).toBe('root');
    expect(rootEntry?.generation).toBe(0);

    const spouseEntry = peopleChapter?.people?.find((p) => p.personId === 'spouse');
    expect(spouseEntry?.relationshipToRoot).toBe('spouse');
    expect(spouseEntry?.generation).toBe(0);
    expect(spouseEntry?.branchPath).toEqual(['root', 'spouse']);

    const child1Entry = peopleChapter?.people?.find((p) => p.personId === 'child1');
    expect(child1Entry?.relationshipToRoot).toBe('child');
    expect(child1Entry?.generation).toBe(1);

    const spouseChild1Entry = peopleChapter?.people?.find((p) => p.personId === 'spouseChild1');
    expect(spouseChild1Entry?.relationshipToRoot).toBe('spouse');
    expect(spouseChild1Entry?.generation).toBe(1); // Spouse inherits generation of their node (child1 is gen 1)
    expect(spouseChild1Entry?.branchPath).toEqual(['root', 'child1', 'spouseChild1']);

    const grandchildEntry = peopleChapter?.people?.find((p) => p.personId === 'grandchild');
    expect(grandchildEntry?.relationshipToRoot).toBe('grandchild');
    expect(grandchildEntry?.generation).toBe(2);
  });
});
