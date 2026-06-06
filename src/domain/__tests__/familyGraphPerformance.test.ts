import { describe, expect, it } from 'vitest';
import { DEFAULT_TREE_SETTINGS } from '../../constants';
import type { Person } from '../../types';
import { computeV3PipelineData } from '../../utils/layout/v3LayoutPipeline';

const makePerson = (id: string, overrides: Partial<Person> = {}): Person => ({
  id,
  title: '',
  firstName: id,
  middleName: '',
  lastName: 'Person',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
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
  spouses: [],
  children: [],
  ...overrides,
});

const buildSyntheticTree = (targetCount: number): Record<string, Person> => {
  const people: Record<string, Person> = {
    root: makePerson('root'),
    root_spouse: makePerson('root_spouse', { gender: 'female', spouses: ['root'] }),
  };
  people.root.spouses = ['root_spouse'];

  const parentPairs: Array<[string, string]> = [['root', 'root_spouse']];
  let nextId = 1;

  while (Object.keys(people).length < targetCount && parentPairs.length > 0) {
    const [parentA, parentB] = parentPairs.shift()!;
    const childIds: string[] = [];

    for (let childIndex = 0; childIndex < 3 && Object.keys(people).length < targetCount; childIndex += 1) {
      const childId = `person_${nextId}`;
      nextId += 1;
      const spouseId = `${childId}_spouse`;
      const includeSpouse = Object.keys(people).length + 1 < targetCount;

      childIds.push(childId);
      people[childId] = makePerson(childId, {
        gender: childIndex % 2 === 0 ? 'male' : 'female',
        parents: [parentA, parentB],
        spouses: includeSpouse ? [spouseId] : [],
      });

      if (includeSpouse) {
        people[spouseId] = makePerson(spouseId, {
          gender: childIndex % 2 === 0 ? 'female' : 'male',
          spouses: [childId],
        });
        parentPairs.push([childId, spouseId]);
      }
    }

    people[parentA].children = [...people[parentA].children, ...childIds];
    people[parentB].children = [...people[parentB].children, ...childIds];
  }

  return people;
};

const measurePipeline = (people: Record<string, Person>) => {
  const start = performance.now();
  const pipeline = computeV3PipelineData({
    people,
    focusId: 'root',
    collapsePoints: [],
    settings: {
      ...DEFAULT_TREE_SETTINGS,
      generationLimit: 10,
    },
  });
  const durationMs = performance.now() - start;

  return {
    durationMs,
    nodeCount: pipeline?.projectedNodes.length ?? 0,
    edgeCount: pipeline?.edgeEntities.length ?? 0,
    familyCount: pipeline?.familyNodes.length ?? 0,
  };
};

describe('family graph layout performance baseline', () => {
  it('keeps V3 pipeline computation within broad large-tree guardrails', () => {
    const scenarios = [
      { peopleCount: 100, maxDurationMs: 300 },
      { peopleCount: 500, maxDurationMs: 1200 },
      { peopleCount: 1000, maxDurationMs: 2500 },
    ];

    const results = scenarios.map((scenario) => {
      const people = buildSyntheticTree(scenario.peopleCount);
      const measured = measurePipeline(people);

      expect(measured.nodeCount).toBeGreaterThan(0);
      expect(measured.durationMs).toBeLessThan(scenario.maxDurationMs);

      return {
        People: Object.keys(people).length,
        Nodes: measured.nodeCount,
        Families: measured.familyCount,
        Edges: measured.edgeCount,
        DurationMs: Number(measured.durationMs.toFixed(2)),
        GuardrailMs: scenario.maxDurationMs,
      };
    });

    console.table(results);
  });
});
