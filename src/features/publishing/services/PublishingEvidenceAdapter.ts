import type { Citation, Person, Source } from '../../../types';
import type { PublicationBlock, PublicationSection } from '../types';

export interface PublishingEvidenceContext {
  readonly sources: Record<string, Source>;
  readonly citations: Record<string, Citation>;
}

export interface PublishingEvidenceSummary {
  readonly sourceCount: number;
  readonly citationCount: number;
  readonly citedPersonCount: number;
  readonly citationCoverage: number;
}

export function summarizePublishingEvidence(
  people: Record<string, Person>,
  evidence?: PublishingEvidenceContext
): PublishingEvidenceSummary {
  const sources = evidence?.sources || {};
  const citations = evidence?.citations || {};
  const personIds = new Set(Object.keys(people));
  const citedPersonIds = new Set(
    Object.values(citations)
      .filter((citation) => citation.targetType === 'PERSON' && personIds.has(citation.targetId))
      .map((citation) => citation.targetId)
  );

  const totalPeople = personIds.size;
  const citationCoverage = totalPeople > 0
    ? Math.round((citedPersonIds.size / totalPeople) * 100)
    : 0;

  return {
    sourceCount: Object.keys(sources).length,
    citationCount: Object.keys(citations).length,
    citedPersonCount: citedPersonIds.size,
    citationCoverage,
  };
}

export function buildBibliographySection(
  people: Record<string, Person>,
  evidence?: PublishingEvidenceContext
): PublicationSection | null {
  const citations = Object.values(evidence?.citations || {});
  const personIds = new Set(Object.keys(people));
  const sources = Object.values(evidence?.sources || {})
    .filter((source) => source.title.trim())
    .sort((a, b) => a.title.localeCompare(b.title));

  if (sources.length === 0) return null;

  const summary = summarizePublishingEvidence(people, evidence);
  const headerBlock: PublicationBlock = {
    id: `block-bibliography-header-${crypto.randomUUID()}`,
    type: 'header',
    assets: [
      {
        id: `asset-bibliography-title-${crypto.randomUUID()}`,
        type: 'text',
        payload: {
          text: 'المصادر والمراجع',
          subtext: `${summary.sourceCount} مصدر | ${summary.citationCount} استشهاد | تغطية ${summary.citationCoverage}%`,
        },
      },
    ],
  };

  const body = sources
    .map((source, index) => {
      const meta = [source.author, source.date, source.url].filter(Boolean).join(' - ');
      const sourceCitations = citations.filter((citation) => citation.sourceId === source.id);
      const linkedPeopleCount = new Set(
        sourceCitations
          .filter((citation) => citation.targetType === 'PERSON' && personIds.has(citation.targetId))
          .map((citation) => citation.targetId)
      ).size;
      const usage = `${sourceCitations.length} citation${sourceCitations.length === 1 ? '' : 's'}`
        + (linkedPeopleCount > 0 ? ` across ${linkedPeopleCount} person${linkedPeopleCount === 1 ? '' : 's'}` : '');
      return `${index + 1}. ${source.title}${meta ? ` (${meta})` : ''}\n   ${usage}`;
    })
    .join('\n');

  const bodyBlock: PublicationBlock = {
    id: `block-bibliography-body-${crypto.randomUUID()}`,
    type: 'paragraph',
    assets: [
      {
        id: `asset-bibliography-body-${crypto.randomUUID()}`,
        type: 'text',
        payload: {
          text: 'قائمة المصادر',
          body,
        },
      },
    ],
  };

  return {
    id: `section-bibliography-${crypto.randomUUID()}`,
    type: 'bibliography',
    blocks: [headerBlock, bodyBlock],
  };
}
