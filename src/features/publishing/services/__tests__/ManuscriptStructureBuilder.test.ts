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
});
