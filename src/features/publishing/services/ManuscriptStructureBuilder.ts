import type { Citation, ManuscriptOrderingStrategy, Person, RelationshipEdge, Source } from '../../../types';
import type {
  FamilyManuscriptModel,
  ManuscriptFamilyContext,
  ManuscriptCitationEntry,
  ManuscriptFactEntry,
  ManuscriptPersonEntry,
  ManuscriptSourceHighlight,
  ManuscriptTimelineEntry,
  PublicationSection,
} from '../types';
import { PublishingRelationshipAdapter } from './PublishingRelationshipAdapter';
import type { PublishingBranchRelationship } from './PublishingRelationshipAdapter';
import type { PublishingEvidenceContext } from './PublishingEvidenceAdapter';
import { NarrativeDraftBuilder } from './NarrativeDraftBuilder';
import { NarrativeOrderingEngine } from './NarrativeOrderingEngine';

export interface ManuscriptStructureOptions {
  readonly rootPersonId: string;
  readonly people: Record<string, Person>;
  readonly relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[];
  readonly evidence?: PublishingEvidenceContext | {
    readonly sources: Record<string, Source>;
    readonly citations: Record<string, Citation>;
  };
  readonly generationsDepth?: number | 'all';
  readonly includeImages?: boolean;
  readonly includeNarrative?: boolean;
  readonly orderingStrategy?: ManuscriptOrderingStrategy;
  readonly customPersonOrder?: readonly string[];
  readonly language?: 'ar' | 'en';
}

function getDisplayName(person: Person): string {
  return [person.title, person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || person.nickName || 'Unnamed Person';
}

function getEvidence(options?: ManuscriptStructureOptions['evidence']): {
  readonly sources: Record<string, Source>;
  readonly citations: Record<string, Citation>;
} {
  return {
    sources: options?.sources ?? {},
    citations: options?.citations ?? {},
  };
}

function getManuscriptLabels(language: 'ar' | 'en') {
  if (language === 'ar') {
    return {
      titlePrefix: 'مخطوط عائلة',
      peopleChapter: 'أفراد العائلة',
      timelineChapter: 'الخط الزمني للعائلة',
      evidenceChapter: 'نظرة عامة على المراجع',
      birthDate: 'تاريخ الميلاد',
      birthPlace: 'مكان الميلاد',
      deathDate: 'تاريخ الوفاة',
      deathPlace: 'مكان الوفاة',
      residence: 'الإقامة',
      occupation: 'المهنة',
      birthEvent: 'ميلاد',
      deathEvent: 'وفاة',
      unknownSource: 'مصدر غير معروف',
    };
  }

  return {
    titlePrefix: 'Family Manuscript',
    peopleChapter: 'People chapters',
    timelineChapter: 'Family timeline',
    evidenceChapter: 'Evidence overview',
    birthDate: 'Birth date',
    birthPlace: 'Birth place',
    deathDate: 'Death date',
    deathPlace: 'Death place',
    residence: 'Residence',
    occupation: 'Occupation',
    birthEvent: 'Birth',
    deathEvent: 'Death',
    unknownSource: 'Unknown source',
  };
}

function countCitationsForPerson(citations: readonly Citation[], personId: string, field?: string): number {
  return citations.filter((citation) => (
    citation.targetType === 'PERSON' &&
    citation.targetId === personId &&
    (!field || citation.targetField === field)
  )).length;
}

function buildSourceHighlightsForPerson(
  sources: Record<string, Source>,
  citations: readonly Citation[],
  personId: string,
  unknownSourceLabel: string
): readonly ManuscriptSourceHighlight[] {
  const counts = new Map<string, number>();

  citations
    .filter((citation) => citation.targetType === 'PERSON' && citation.targetId === personId)
    .forEach((citation) => {
      counts.set(citation.sourceId, (counts.get(citation.sourceId) ?? 0) + 1);
    });

  return [...counts.entries()]
    .map(([sourceId, citationCount]) => ({
      sourceId,
      title: sources[sourceId]?.title || unknownSourceLabel,
      citationCount,
    }))
    .sort((a, b) => b.citationCount - a.citationCount || a.title.localeCompare(b.title))
    .slice(0, 3);
}

function createFact(label: string, value: string, citationCount: number): ManuscriptFactEntry | null {
  const cleanValue = value.trim();
  if (!cleanValue) return null;
  return { label, value: cleanValue, citationCount };
}

function formatGenerationLabel(depth: number, language: 'ar' | 'en'): string {
  if (language === 'ar') return `الجيل ${depth}`;
  return `Generation ${depth}`;
}

function formatRootLabel(language: 'ar' | 'en'): string {
  return language === 'ar' ? 'الجذر المختار' : 'Selected root';
}

function formatSpouseLabel(anchorName: string, language: 'ar' | 'en'): string {
  return language === 'ar' ? `زوج/زوجة ${anchorName}` : `Spouse of ${anchorName}`;
}

function formatRelatedLabel(language: 'ar' | 'en'): string {
  return language === 'ar' ? 'قرابة أخرى' : 'Related entry';
}

function buildFamilyContexts(
  people: Record<string, Person>,
  rootPersonId: string,
  relationships: readonly PublishingBranchRelationship[],
  language: 'ar' | 'en'
): ReadonlyMap<string, ManuscriptFamilyContext> {
  const childrenByParent = new Map<string, string[]>();
  const spousesByPerson = new Map<string, string[]>();
  const parentByChild = new Map<string, string>();

  relationships.forEach((relationship) => {
    if (relationship.type === 'parent' && relationship.parentId && relationship.childId) {
      const children = childrenByParent.get(relationship.parentId) ?? [];
      children.push(relationship.childId);
      childrenByParent.set(relationship.parentId, children);
      if (!parentByChild.has(relationship.childId)) {
        parentByChild.set(relationship.childId, relationship.parentId);
      }
      return;
    }

    if (relationship.type === 'spouse' && relationship.personId && relationship.spouseId) {
      const first = spousesByPerson.get(relationship.personId) ?? [];
      first.push(relationship.spouseId);
      spousesByPerson.set(relationship.personId, first);

      const second = spousesByPerson.get(relationship.spouseId) ?? [];
      second.push(relationship.personId);
      spousesByPerson.set(relationship.spouseId, second);
    }
  });

  const descendantDepth = new Map<string, number>();
  const queue: Array<{ personId: string; depth: number }> = [{ personId: rootPersonId, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || descendantDepth.has(current.personId) || !people[current.personId]) continue;
    descendantDepth.set(current.personId, current.depth);
    (childrenByParent.get(current.personId) ?? []).forEach((childId) => {
      queue.push({ personId: childId, depth: current.depth + 1 });
    });
  }

  const buildBreadcrumb = (personId: string): readonly string[] => {
    const ids: string[] = [];
    const visited = new Set<string>();
    let cursor: string | undefined = personId;
    while (cursor && people[cursor] && !visited.has(cursor)) {
      visited.add(cursor);
      ids.unshift(cursor);
      if (cursor === rootPersonId) break;
      cursor = parentByChild.get(cursor);
    }
    if (ids[0] !== rootPersonId && people[rootPersonId]) {
      ids.unshift(rootPersonId);
    }
    return ids.map((id) => getDisplayName(people[id]));
  };

  const getBranchRootId = (personId: string): string | undefined => {
    let cursor: string | undefined = personId;
    let branchRootId: string | undefined;
    const visited = new Set<string>();
    while (cursor && people[cursor] && !visited.has(cursor)) {
      visited.add(cursor);
      if (cursor === rootPersonId) return branchRootId;
      branchRootId = cursor;
      cursor = parentByChild.get(cursor);
    }
    return undefined;
  };

  const getBranchInfo = (personId: string): Pick<ManuscriptFamilyContext, 'branchLabel' | 'branchRootPersonId'> => {
    const branchRootPersonId = getBranchRootId(personId);
    if (!branchRootPersonId) return {};
    return {
      branchRootPersonId,
      branchLabel: getDisplayName(people[branchRootPersonId]),
    };
  };

  const contexts = new Map<string, ManuscriptFamilyContext>();
  Object.keys(people).forEach((personId) => {
    if (personId === rootPersonId) {
      contexts.set(personId, {
        kind: 'root',
        generationDepth: 0,
        label: formatRootLabel(language),
        breadcrumb: [getDisplayName(people[personId])],
      });
      return;
    }

    const depth = descendantDepth.get(personId);
    if (depth !== undefined) {
      contexts.set(personId, {
        kind: 'descendant',
        generationDepth: depth,
        label: formatGenerationLabel(depth + 1, language),
        breadcrumb: buildBreadcrumb(personId),
        ...getBranchInfo(personId),
      });
      return;
    }

    const spouseAnchorId = (spousesByPerson.get(personId) ?? [])
      .find((spouseId) => descendantDepth.has(spouseId));
    if (spouseAnchorId) {
      const spouseDepth = descendantDepth.get(spouseAnchorId) ?? 0;
      contexts.set(personId, {
        kind: 'spouse',
        generationDepth: spouseDepth,
        label: formatSpouseLabel(getDisplayName(people[spouseAnchorId]), language),
        breadcrumb: [...buildBreadcrumb(spouseAnchorId), getDisplayName(people[personId])],
        ...getBranchInfo(spouseAnchorId),
        anchorPersonId: spouseAnchorId,
      });
      return;
    }

    contexts.set(personId, {
      kind: 'relative',
      generationDepth: Number.MAX_SAFE_INTEGER,
      label: formatRelatedLabel(language),
      breadcrumb: [getDisplayName(people[personId])],
    });
  });

  return contexts;
}

function buildPersonEntries(
  people: Record<string, Person>,
  sources: Record<string, Source>,
  citations: readonly Citation[],
  rootPersonId: string,
  includeImages: boolean,
  labels: ReturnType<typeof getManuscriptLabels>,
  narrativeOrder?: readonly string[],
  familyContexts?: ReadonlyMap<string, ManuscriptFamilyContext>
): readonly ManuscriptPersonEntry[] {
  const orderedPeople = (narrativeOrder && narrativeOrder.length > 0
    ? narrativeOrder.map((personId) => people[personId]).filter((person): person is Person => Boolean(person))
    : Object.values(people).sort((a, b) => {
      if (a.id === rootPersonId) return -1;
      if (b.id === rootPersonId) return 1;
      return getDisplayName(a).localeCompare(getDisplayName(b));
    }));

  return orderedPeople
    .map((person) => {
      const facts = [
        createFact(labels.birthDate, person.birthDate, countCitationsForPerson(citations, person.id, 'person.birth.date')),
        createFact(labels.birthPlace, person.birthPlace, countCitationsForPerson(citations, person.id, 'person.birth.place')),
        createFact(labels.deathDate, person.deathDate, countCitationsForPerson(citations, person.id, 'person.death.date')),
        createFact(labels.deathPlace, person.deathPlace, countCitationsForPerson(citations, person.id, 'person.death.place')),
        createFact(labels.residence, person.currentResidence || person.residence, countCitationsForPerson(citations, person.id)),
        createFact(labels.occupation, person.occupation || person.profession, countCitationsForPerson(citations, person.id)),
      ].filter((fact): fact is ManuscriptFactEntry => Boolean(fact));

      const citationCount = countCitationsForPerson(citations, person.id);
      const citedFactsCount = facts.filter((fact) => fact.citationCount > 0).length;

      return {
        personId: person.id,
        displayName: getDisplayName(person),
        photoUrl: includeImages ? person.photoUrl : undefined,
        familyContext: familyContexts?.get(person.id),
        facts,
        sourceHighlights: buildSourceHighlightsForPerson(sources, citations, person.id, labels.unknownSource),
        citationCount,
        citationCoverage: facts.length > 0 ? Math.round((citedFactsCount / facts.length) * 100) : 0,
      };
    });
}

function buildTimelineEntries(people: Record<string, Person>, labels: ReturnType<typeof getManuscriptLabels>): readonly ManuscriptTimelineEntry[] {
  const entries: ManuscriptTimelineEntry[] = [];

  Object.values(people).forEach((person) => {
    const personName = getDisplayName(person);

    if (person.birthDate) {
      entries.push({
        personId: person.id,
        personName,
        date: person.birthDate,
        title: labels.birthEvent,
        place: person.birthPlace || undefined,
      });
    }

    if (person.deathDate) {
      entries.push({
        personId: person.id,
        personName,
        date: person.deathDate,
        title: labels.deathEvent,
        place: person.deathPlace || undefined,
      });
    }

    person.events?.forEach((event) => {
      if (!event.date) return;
      entries.push({
        personId: person.id,
        personName,
        date: event.date,
        title: event.title,
        place: event.place || undefined,
      });
    });
  });

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function buildCitationEntries(
  sources: Record<string, Source>,
  citations: Record<string, Citation>,
  unknownSourceLabel: string
): readonly ManuscriptCitationEntry[] {
  return Object.values(citations)
    .filter((citation) => citation.targetType === 'PERSON')
    .map((citation) => ({
      citationId: citation.id,
      sourceId: citation.sourceId,
      sourceTitle: sources[citation.sourceId]?.title || unknownSourceLabel,
      targetId: citation.targetId,
      targetField: citation.targetField,
    }))
    .sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle));
}

function formatPersonEntry(entry: ManuscriptPersonEntry): string {
  const factLines = entry.facts.length > 0
    ? entry.facts.map((fact) => {
      const citationSuffix = fact.citationCount > 0 ? ` (${fact.citationCount} source${fact.citationCount === 1 ? '' : 's'})` : '';
      return `- ${fact.label}: ${fact.value}${citationSuffix}`;
    }).join('\n')
    : '- No structured facts available yet.';

  return [
    entry.displayName,
    `Citation coverage: ${entry.citationCoverage}% (${entry.citationCount} citation${entry.citationCount === 1 ? '' : 's'})`,
    entry.sourceHighlights.length > 0
      ? `Key sources: ${entry.sourceHighlights.map((source) => `${source.title} (${source.citationCount})`).join('; ')}`
      : 'Key sources: No linked sources yet.',
    factLines,
  ].join('\n');
}

export class ManuscriptStructureBuilder {
  public static buildModel(options: ManuscriptStructureOptions): FamilyManuscriptModel {
    const rootPerson = options.people[options.rootPersonId];
    if (!rootPerson) {
      throw new Error(`Root person "${options.rootPersonId}" not found for manuscript generation.`);
    }

    const branchGraph = PublishingRelationshipAdapter.buildBranchGraph(
      options.people,
      options.rootPersonId,
      options.relationshipEdges,
      undefined,
      options.generationsDepth === 'all' ? undefined : options.generationsDepth
    );
    const manuscriptPeople = Object.keys(branchGraph.people).length > 0 ? branchGraph.people : options.people;
    const evidence = getEvidence(options.evidence);
    const language = options.language ?? 'en';
    const labels = getManuscriptLabels(language);
    const citationValues = Object.values(evidence.citations);
    const orderingStrategy = options.orderingStrategy ?? 'narrative';
    const narrativeOrder = NarrativeOrderingEngine.orderPeople({
      rootPersonId: options.rootPersonId,
      people: manuscriptPeople,
      relationships: branchGraph.relationships,
      strategy: orderingStrategy,
      customPersonOrder: options.customPersonOrder,
    });
    const familyContexts = buildFamilyContexts(manuscriptPeople, options.rootPersonId, branchGraph.relationships, language);
    const rawPeopleEntries = buildPersonEntries(
      manuscriptPeople,
      evidence.sources,
      citationValues,
      options.rootPersonId,
      Boolean(options.includeImages),
      labels,
      narrativeOrder,
      familyContexts
    );
    const peopleEntries = options.includeNarrative
      ? NarrativeDraftBuilder.applyToPeople(rawPeopleEntries, { language })
      : rawPeopleEntries;
    const timelineEntries = buildTimelineEntries(manuscriptPeople, labels);
    const citationEntries = buildCitationEntries(evidence.sources, evidence.citations, labels.unknownSource);

    return {
      id: `manuscript-${crypto.randomUUID()}`,
      title: `${labels.titlePrefix} ${getDisplayName(rootPerson)}`,
      rootPersonId: options.rootPersonId,
      readingOrder: {
        strategy: orderingStrategy,
        rootPersonId: options.rootPersonId,
        personIds: narrativeOrder,
      },
      chapters: [
        {
          id: `chapter-people-${crypto.randomUUID()}`,
          type: 'people',
          title: labels.peopleChapter,
          people: peopleEntries,
        },
        {
          id: `chapter-timeline-${crypto.randomUUID()}`,
          type: 'timeline',
          title: labels.timelineChapter,
          timeline: timelineEntries,
        },
        {
          id: `chapter-evidence-${crypto.randomUUID()}`,
          type: 'evidence',
          title: labels.evidenceChapter,
          citations: citationEntries,
        },
      ],
    };
  }

  public static buildPersonSections(model: FamilyManuscriptModel): readonly PublicationSection[] {
    const peopleChapter = model.chapters.find((chapter) => chapter.type === 'people');
    const entries = peopleChapter?.people ?? [];
    if (entries.length === 0) return [];
    const entriesPerPage = 4;
    const chunks: ManuscriptPersonEntry[][] = [];
    for (let i = 0; i < entries.length; i += entriesPerPage) {
      chunks.push(entries.slice(i, i + entriesPerPage) as ManuscriptPersonEntry[]);
    }

    return chunks.map((chunk, pageIndex) => ({
      id: `section-manuscript-people-${pageIndex + 1}-${crypto.randomUUID()}`,
      type: 'biography',
      blocks: [
        {
          id: `block-manuscript-people-header-${pageIndex + 1}-${crypto.randomUUID()}`,
          type: 'header',
          assets: [{
            id: `asset-manuscript-people-title-${pageIndex + 1}-${crypto.randomUUID()}`,
            type: 'text',
            payload: {
              text: 'People chapters',
              subtext: chunks.length > 1
                ? `Structured family entries with citation coverage. Page ${pageIndex + 1} of ${chunks.length}.`
                : 'Structured family entries with citation coverage.',
            },
          }],
        },
        ...chunk.map((entry) => ({
          id: `block-manuscript-person-${entry.personId}`,
          type: 'paragraph' as const,
          assets: [{
            id: `asset-manuscript-person-${entry.personId}`,
            type: 'text' as const,
            payload: {
              text: entry.displayName,
              body: formatPersonEntry(entry),
            },
          }],
        })),
      ],
    }));
  }
}
