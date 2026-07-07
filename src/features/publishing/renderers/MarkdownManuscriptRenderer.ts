import type {
  FamilyManuscriptModel,
  ManuscriptBranchSummary,
  ManuscriptChapter,
  ManuscriptCitationEntry,
  ManuscriptPersonEntry,
  ManuscriptTimelineEntry,
} from '../types';
import { formatManuscriptDate } from '../services/ManuscriptStructureBuilder';

export interface MarkdownManuscriptRenderOptions {
  readonly title?: string;
  readonly includeMetadata?: boolean;
  readonly language?: 'ar' | 'en';
}

export class MarkdownManuscriptRenderer {
  public static renderToMarkdown(
    model: FamilyManuscriptModel,
    options: MarkdownManuscriptRenderOptions = {}
  ): string {
    const isArabic = /[\u0600-\u06FF]/.test(model.title || '');
    const language = options.language ?? (isArabic ? 'ar' : 'en');
    const title = normalizeInline(options.title ?? model.title);
    const lines: string[] = [`# ${title}`, ''];

    if (options.includeMetadata ?? true) {
      lines.push(`- Manuscript ID: ${normalizeInline(model.id)}`);
      lines.push(`- Root person ID: ${normalizeInline(model.rootPersonId)}`);
      lines.push('');
    }

    lines.push(...renderIntroduction(model.title, language));

    model.chapters.forEach((chapter) => {
      lines.push(...renderChapter(chapter, language));
      lines.push('');
    });

    return trimBlankLines(lines).join('\n') + '\n';
  }
}

function getFamilyNameFromTitle(title: string, language: 'ar' | 'en'): string {
  if (!title) return '';
  const cleaned = title.trim();
  if (language === 'ar') {
    const match = cleaned.match(/(?:كتاب عائلة|كتاب العائلة لـ|مخطوط عائلة|عائلة)\s+(.+)/);
    return match ? match[1].trim() : cleaned;
  } else {
    const match = cleaned.match(/(?:Family Book of|Family Book for|Family Manuscript of|Family Manuscript for|Family)\s+(.+)/i);
    return match ? match[1].trim() : cleaned;
  }
}

function renderIntroduction(title: string, language: 'ar' | 'en'): string[] {
  const familyName = getFamilyNameFromTitle(title, language);
  if (language === 'ar') {
    const text = familyName
      ? `يجمع هذا المخطوط أفراد عائلة ${familyName}، ويعرض الفروع والأشخاص والخط الزمني والمراجع المتاحة بحسب البيانات المسجلة في جذور.`
      : 'يجمع هذا المخطوط أفراد العائلة، ويعرض الفروع والأشخاص والخط الزمني والمراجع المتاحة بحسب البيانات المسجلة في جذور.';
    return [
      '## مقدمة المخطوط',
      '',
      text,
      '',
    ];
  } else {
    const text = familyName
      ? `This family book gathers the ${familyName} family branch, including people, branch summaries, timeline entries, and available references from the Jozor tree data.`
      : 'This family book gathers the family branch, including people, branch summaries, timeline entries, and available references from the Jozor tree data.';
    return [
      '## Manuscript Introduction',
      '',
      text,
      '',
    ];
  }
}

function renderChapter(chapter: ManuscriptChapter, language: 'ar' | 'en'): string[] {
  const sectionTitle = chapter.type === 'evidence'
    ? (language === 'ar' ? 'المراجع والمصادر' : 'References and Sources')
    : chapter.title;
  const lines = [`## ${normalizeInline(sectionTitle)}`, ''];

  switch (chapter.type) {
    case 'overview':
      return [...lines, ...renderOverview(chapter.branchSummaries ?? [], language)];
    case 'people':
      return [...lines, ...renderPeople(chapter.people ?? [], language)];
    case 'timeline':
      return [...lines, ...renderTimeline(chapter.timeline ?? [], language)];
    case 'evidence':
      return [...lines, ...renderEvidence(chapter.citations ?? [], language)];
    default:
      return lines;
  }
}

function renderOverview(branchSummaries: readonly ManuscriptBranchSummary[], language: 'ar' | 'en'): string[] {
  if (branchSummaries.length === 0) return ['No branch summaries.'];

  return branchSummaries.map((summary) => {
    const peopleSuffix = language === 'ar' ? 'شخصاً' : (summary.personCount === 1 ? 'person' : 'people');
    return `- ${normalizeInline(summary.label)} - ${summary.personCount} ${peopleSuffix}`;
  });
}

function renderPeople(people: readonly ManuscriptPersonEntry[], language: 'ar' | 'en'): string[] {
  if (people.length === 0) return ['No people entries.'];

  let activeBranchLabel = '';
  return people.flatMap((person) => {
    const branchLines: string[] = [];
    const branchLabel = person.familyContext?.branchLabel;

    const branchPrefix = language === 'ar' ? 'الفرع' : 'Branch';
    if (branchLabel && branchLabel !== activeBranchLabel) {
      activeBranchLabel = branchLabel;
      branchLines.push(`#### ${branchPrefix}: ${normalizeInline(branchLabel)}`, '');
    }

    const relationshipPrefix = language === 'ar' ? 'العلاقة مع الجذر' : 'Relationship to root';
    const familyContextPrefix = language === 'ar' ? 'الجيل في المخطوط (السياق العائلي)' : 'Manuscript generation (Family context)';
    const familyPathPrefix = language === 'ar' ? 'المسار العائلي' : 'Family path';
    const citationCoveragePrefix = language === 'ar' ? 'حالة المصادر' : 'Source status';
    const citationsPrefix = language === 'ar' ? 'عدد الاستشهادات' : 'Citations';

    const lines = [
      `### ${normalizeInline(person.displayName)}`,
      '',
      ...(person.relationshipToRoot
        ? [`- ${relationshipPrefix}: ${normalizeInline(getMetadataLabel(person.relationshipToRoot, person.generation, language))}`]
        : []),
      ...(person.familyContext ? [`- ${familyContextPrefix}: ${normalizeInline(person.familyContext.label)}`] : []),
      ...(person.familyContext?.breadcrumb && person.familyContext.breadcrumb.length > 1
        ? [`- ${familyPathPrefix}: ${person.familyContext.breadcrumb.map(normalizeInline).join(' > ')}`]
        : []),
      ...(person.citationCoverage === 0
        ? [`- ${citationCoveragePrefix}: ${language === 'ar' ? 'المصادر غير مضافة بعد' : 'not added yet'}`]
        : [`- ${citationCoveragePrefix}: ${person.citationCoverage}%`]),
      `- ${citationsPrefix}: ${person.citationCount}`,
    ];

    if (person.narrative) {
      lines.push('', normalizeInline(person.narrative));
    }

    if (person.facts.length > 0) {
      const factsTitle = language === 'ar' ? 'الحقائق' : 'Facts';
      lines.push('', `#### ${factsTitle}`, '');
      person.facts.forEach((fact) => {
        const suffix = fact.citationCount > 0 ? ` (${fact.citationCount} citation${fact.citationCount === 1 ? '' : 's'})` : '';
        lines.push(`- **${normalizeInline(fact.label)}:** ${normalizeInline(fact.value)}${suffix}`);
      });
    }

    if (person.sourceHighlights.length > 0) {
      const sourceHighlightsTitle = language === 'ar' ? 'أبرز المصادر' : 'Source highlights';
      lines.push('', `#### ${sourceHighlightsTitle}`, '');
      person.sourceHighlights.forEach((source) => {
        lines.push(`- ${normalizeInline(source.title)} (${source.citationCount})`);
      });
    }

    return [...branchLines, ...lines, ''];
  });
}

function renderTimeline(entries: readonly ManuscriptTimelineEntry[], language: 'ar' | 'en'): string[] {
  if (entries.length === 0) return ['No timeline entries.'];

  return entries.map((entry) => {
    const separator = ' — ';
    const place = entry.place ? `${separator}${normalizeInline(entry.place)}` : '';
    const formattedDate = formatManuscriptDate(entry.date, language, entry.isApproximate);
    return `- ${normalizeInline(formattedDate)}: **${normalizeInline(entry.personName)}**${separator}${normalizeInline(entry.title)}${place}`;
  });
}

function renderEvidence(citations: readonly ManuscriptCitationEntry[], language: 'ar' | 'en'): string[] {
  if (citations.length === 0) {
    return [
      language === 'ar' ? 'لم تتم إضافة مصادر مرتبطة بعد.' : 'No linked sources have been added yet.'
    ];
  }

  const bySource = new Map<string, { count: number; fields: Set<string> }>();
  citations.forEach((citation) => {
    const current = bySource.get(citation.sourceTitle) ?? { count: 0, fields: new Set<string>() };
    current.count += 1;
    if (citation.targetField) current.fields.add(citation.targetField);
    bySource.set(citation.sourceTitle, current);
  });

  const citationSuffix = language === 'ar' ? 'استشهادات' : 'citations';
  const fieldsPrefix = language === 'ar' ? 'الحقول' : 'fields';

  return [...bySource.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([sourceTitle, info]) => {
      const fields = [...info.fields].sort().join(', ') || (language === 'ar' ? 'عام' : 'general');
      return `- ${normalizeInline(sourceTitle)} — ${info.count} ${citationSuffix}; ${fieldsPrefix}: ${normalizeInline(fields)}`;
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

function getMetadataLabel(relationship: string, generation: number | undefined, language: 'ar' | 'en'): string {
  const genNum = generation ?? 0;
  if (language === 'ar') {
    const labels: Record<string, string> = {
      root: 'الجذر',
      spouse: 'زوج/زوجة',
      child: 'الجيل 1',
      grandchild: 'الجيل 2',
      relative: 'قريب',
    };
    return labels[relationship] ?? `الجيل ${genNum}`;
  } else {
    const labels: Record<string, string> = {
      root: 'Root',
      spouse: 'Spouse',
      child: 'Generation 1',
      grandchild: 'Generation 2',
      relative: 'Relative',
    };
    return labels[relationship] ?? `Generation ${genNum}`;
  }
}
