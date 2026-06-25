import type {
  FamilyManuscriptModel,
  ManuscriptChapter,
  ManuscriptCitationEntry,
  ManuscriptPersonEntry,
  ManuscriptTimelineEntry,
} from '../types';

export interface MarkdownManuscriptRenderOptions {
  readonly title?: string;
  readonly includeMetadata?: boolean;
}

export class MarkdownManuscriptRenderer {
  public static renderToMarkdown(
    model: FamilyManuscriptModel,
    options: MarkdownManuscriptRenderOptions = {}
  ): string {
    const title = normalizeInline(options.title ?? model.title);
    const lines: string[] = [`# ${title}`, ''];

    if (options.includeMetadata ?? true) {
      lines.push(`- Manuscript ID: ${normalizeInline(model.id)}`);
      lines.push(`- Root person ID: ${normalizeInline(model.rootPersonId)}`);
      lines.push('');
    }

    model.chapters.forEach((chapter) => {
      lines.push(...renderChapter(chapter));
      lines.push('');
    });

    return trimBlankLines(lines).join('\n') + '\n';
  }
}

function renderChapter(chapter: ManuscriptChapter): string[] {
  const lines = [`## ${normalizeInline(chapter.title)}`, ''];

  switch (chapter.type) {
    case 'people':
      return [...lines, ...renderPeople(chapter.people ?? [])];
    case 'timeline':
      return [...lines, ...renderTimeline(chapter.timeline ?? [])];
    case 'evidence':
      return [...lines, ...renderEvidence(chapter.citations ?? [])];
    default:
      return lines;
  }
}

function renderPeople(people: readonly ManuscriptPersonEntry[]): string[] {
  if (people.length === 0) return ['No people entries.'];

  return people.flatMap((person) => {
    const lines = [
      `### ${normalizeInline(person.displayName)}`,
      '',
      `- Citation coverage: ${person.citationCoverage}%`,
      `- Citations: ${person.citationCount}`,
    ];

    if (person.narrative) {
      lines.push('', normalizeInline(person.narrative));
    }

    if (person.facts.length > 0) {
      lines.push('', '#### Facts', '');
      person.facts.forEach((fact) => {
        const suffix = fact.citationCount > 0 ? ` (${fact.citationCount} citation${fact.citationCount === 1 ? '' : 's'})` : '';
        lines.push(`- **${normalizeInline(fact.label)}:** ${normalizeInline(fact.value)}${suffix}`);
      });
    }

    if (person.sourceHighlights.length > 0) {
      lines.push('', '#### Source highlights', '');
      person.sourceHighlights.forEach((source) => {
        lines.push(`- ${normalizeInline(source.title)} (${source.citationCount})`);
      });
    }

    return [...lines, ''];
  });
}

function renderTimeline(entries: readonly ManuscriptTimelineEntry[]): string[] {
  if (entries.length === 0) return ['No timeline entries.'];

  return entries.map((entry) => {
    const place = entry.place ? ` - ${normalizeInline(entry.place)}` : '';
    return `- ${normalizeInline(entry.date)}: **${normalizeInline(entry.personName)}** - ${normalizeInline(entry.title)}${place}`;
  });
}

function renderEvidence(citations: readonly ManuscriptCitationEntry[]): string[] {
  if (citations.length === 0) return ['No bibliography entries.'];

  const bySource = new Map<string, { count: number; fields: Set<string> }>();
  citations.forEach((citation) => {
    const current = bySource.get(citation.sourceTitle) ?? { count: 0, fields: new Set<string>() };
    current.count += 1;
    if (citation.targetField) current.fields.add(citation.targetField);
    bySource.set(citation.sourceTitle, current);
  });

  return [...bySource.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([sourceTitle, info]) => {
      const fields = [...info.fields].sort().join(', ') || 'general';
      return `- ${normalizeInline(sourceTitle)} - ${info.count} citation${info.count === 1 ? '' : 's'}; fields: ${normalizeInline(fields)}`;
    });
}

function normalizeInline(value: string): string {
  return value
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1')
    .trim();
}

function trimBlankLines(lines: readonly string[]): string[] {
  const next = [...lines];
  while (next.length > 0 && next[0] === '') next.shift();
  while (next.length > 0 && next[next.length - 1] === '') next.pop();
  return next;
}
