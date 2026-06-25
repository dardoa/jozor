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
    const evidenceChapter = model.chapters.find((chapter) => chapter.type === 'evidence');
    expect(peopleChapter?.people?.map((entry) => entry.personId).sort()).toEqual(['child', 'root']);
    expect(peopleChapter?.people?.some((entry) => entry.personId === 'unrelated')).toBe(false);
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
});
