import type {
  FamilyManuscriptModel,
  ManuscriptBranchSummary,
  ManuscriptChapter,
  ManuscriptCitationEntry,
  ManuscriptTimelineEntry,
} from '../types';
import {
  CLASSIC_MANUSCRIPT_PRINT_TEMPLATE,
  type ManuscriptPrintTemplate,
} from './manuscriptTemplates';
import { renderPersonCardByVariant } from './personCards/index';
import { getEnabledVisualInserts } from './visualInserts';
import { formatManuscriptDate } from '../services/ManuscriptStructureBuilder';
export { getMetadataLabel } from './personCards/classicPersonCard';

export interface HtmlManuscriptRenderOptions {
  readonly language?: 'ar' | 'en';
  readonly title?: string;
  readonly fontUrl?: string;
  readonly theme?: HtmlManuscriptTheme;
  /** Print template controlling card variant and layout options. Defaults to CLASSIC_MANUSCRIPT_PRINT_TEMPLATE. */
  readonly template?: ManuscriptPrintTemplate;
}

export interface HtmlManuscriptTheme {
  readonly colors: {
    readonly pageBackground: string;
    readonly paperBackground: string;
    readonly cardBackground: string;
    readonly text: string;
    readonly mutedText: string;
    readonly accent: string;
    readonly border: string;
  };
  readonly typography: {
    readonly fontFamily: string;
    readonly titleSize: string;
    readonly headingSize: string;
    readonly bodySize: string;
    readonly lineHeight: string;
    readonly kickerLetterSpacing: string;
  };
  readonly layout: {
    readonly pageMargin: string;
    readonly pagePadding: string;
    readonly cardPadding: string;
    readonly cardRadius: string;
    readonly gridGap: string;
  };
}

const DEFAULT_TITLE = 'Jozor Family Manuscript';

export const DEFAULT_HTML_MANUSCRIPT_THEME: HtmlManuscriptTheme = {
  colors: {
    pageBackground: '#f7f3ea',
    paperBackground: '#fffaf0',
    cardBackground: '#fffdf7',
    text: '#1f2937',
    mutedText: '#667085',
    accent: '#9a6b1f',
    border: '#eadcc6',
  },
  typography: {
    fontFamily: '"JozorArabic", "Noto Naskh Arabic", "Segoe UI", serif',
    titleSize: '30px',
    headingSize: '18px',
    bodySize: '13px',
    lineHeight: '1.35',
    kickerLetterSpacing: '0.08em',
  },
  layout: {
    pageMargin: '16mm',
    pagePadding: '28mm 20mm',
    cardPadding: '14px',
    cardRadius: '10px',
    gridGap: '12px',
  },
};

export class HtmlManuscriptRenderer {
  public static renderToHtml(
    model: FamilyManuscriptModel,
    options: HtmlManuscriptRenderOptions = {}
  ): string {
    const language = options.language ?? 'ar';
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    const title = options.title ?? model.title ?? DEFAULT_TITLE;
    const theme = options.theme ?? DEFAULT_HTML_MANUSCRIPT_THEME;
    const template = options.template ?? CLASSIC_MANUSCRIPT_PRINT_TEMPLATE;

    // Resolve after-cover visual inserts contract point
    void getEnabledVisualInserts(template.visualInserts, 'after-cover');
    // Future work: If any inserts are active, they will be rendered as full-page plates here.

    return [
      '<!doctype html>',
      `<html lang="${language}" dir="${direction}">`,
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapeHtml(title)}</title>`,
      `<style>${buildPrintCss(direction, options.fontUrl ?? '/fonts/Amiri-Regular.ttf', theme)}</style>`,
      '</head>',
      '<body>',
      renderCover(model, title),
      renderIntroduction(title, language),
      model.chapters
        .map((chapter) => {
          if (chapter.type === 'evidence' && (!chapter.citations || chapter.citations.length === 0)) {
            return renderClosingSection(model, language);
          }
          return renderChapter(chapter, language, template);
        })
        .join('\n'),
      '</body>',
      '</html>',
    ].join('\n');
  }
}

function renderCover(model: FamilyManuscriptModel, title: string): string {
  return [
    '<section class="page cover-page">',
    '<div class="cover-kicker">Jozor Family Manuscript</div>',
    `<h1>${escapeHtml(title)}</h1>`,
    `<!-- manuscript-id: ${escapeHtml(model.id)} -->`,
    '</section>',
  ].join('\n');
}

function renderClosingSection(model: FamilyManuscriptModel, language: 'ar' | 'en'): string {
  let peopleCount = 0;
  let branchesCount = 0;
  let citationsCount = 0;
  model.chapters.forEach((c) => {
    if (c.type === 'people' && c.people) peopleCount += c.people.length;
    if (c.type === 'overview' && c.branchSummaries) branchesCount += c.branchSummaries.length;
    if (c.type === 'evidence' && c.citations) citationsCount += c.citations.length;
  });

  const hasSources = citationsCount > 0;

  if (language === 'ar') {
    const sourcesText = hasSources ? `${citationsCount}` : 'لا توجد مصادر مرتبطة بعد.';
    return [
      '<div class="manuscript-closing-section">',
      '  <h3 class="closing-title">انتهى هذا المخطوط</h3>',
      '  <p class="closing-generator">تم توليده بواسطة جذور</p>',
      '  <div class="closing-stats">',
      `    <div>عدد الأشخاص: <strong>${peopleCount}</strong></div>`,
      branchesCount > 0 ? `    <div>عدد الفروع: <strong>${branchesCount}</strong></div>` : '',
      `    <div>المراجع: <strong>${sourcesText}</strong></div>`,
      '  </div>',
      '</div>',
    ].filter(Boolean).join('\n');
  } else {
    const sourcesText = hasSources ? `${citationsCount}` : 'No linked sources yet.';
    return [
      '<div class="manuscript-closing-section">',
      '  <h3 class="closing-title">End of family book</h3>',
      '  <p class="closing-generator">Generated by Jozor</p>',
      '  <div class="closing-stats">',
      `    <div>People included: <strong>${peopleCount}</strong></div>`,
      branchesCount > 0 ? `    <div>Branches: <strong>${branchesCount}</strong></div>` : '',
      `    <div>Sources: <strong>${sourcesText}</strong></div>`,
      '  </div>',
      '</div>',
    ].filter(Boolean).join('\n');
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

function renderIntroduction(title: string, language: 'ar' | 'en'): string {
  const familyName = getFamilyNameFromTitle(title, language);
  if (language === 'ar') {
    const text = familyName
      ? `يجمع هذا المخطوط أفراد عائلة ${escapeHtml(familyName)}، ويعرض الفروع والأشخاص والخط الزمني والمراجع المتاحة بحسب البيانات المسجلة في جذور.`
      : 'يجمع هذا المخطوط أفراد العائلة، ويعرض الفروع والأشخاص والخط الزمني والمراجع المتاحة بحسب البيانات المسجلة في جذور.';
    return [
      '<section class="page introduction-page">',
      '<h2>مقدمة المخطوط</h2>',
      `<p class="intro-text">${text}</p>`,
      '</section>'
    ].join('\n');
  } else {
    const text = familyName
      ? `This family book gathers the ${escapeHtml(familyName)} family branch, including people, branch summaries, timeline entries, and available references from the Jozor tree data.`
      : 'This family book gathers the family branch, including people, branch summaries, timeline entries, and available references from the Jozor tree data.';
    return [
      '<section class="page introduction-page">',
      '<h2>Introduction</h2>',
      `<p class="intro-text">${text}</p>`,
      '</section>'
    ].join('\n');
  }
}

function renderChapter(chapter: ManuscriptChapter, language: 'ar' | 'en', template: ManuscriptPrintTemplate): string {
  switch (chapter.type) {
    case 'overview':
      return renderOverviewChapter(chapter.title, chapter.branchSummaries ?? [], language);
    case 'people': {
      // Resolve before-people visual inserts contract point
      void getEnabledVisualInserts(template.visualInserts, 'before-people');
      // Future work: Render before-people visual plates if enabled.
      return renderPeopleChapter(chapter.title, chapter.people ?? [], language, template);
    }
    case 'timeline': {
      // Resolve before-timeline visual inserts contract point
      void getEnabledVisualInserts(template.visualInserts, 'before-timeline');
      // Future work: Render before-timeline visual plates if enabled.
      return renderTimelineChapter(chapter.title, chapter.timeline ?? [], language);
    }
    case 'evidence':
      return renderEvidenceChapter(chapter.title, chapter.citations ?? [], language);
    default:
      return '';
  }
}

function renderOverviewChapter(
  title: string,
  branchSummaries: readonly ManuscriptBranchSummary[],
  language: 'ar' | 'en'
): string {
  const labels = language === 'ar'
    ? {
      lead: 'خريطة قراءة مختصرة للفروع التي يتضمنها هذا المخطوط.',
      people: 'أشخاص',
      empty: 'لا توجد فروع منفصلة في هذا المخطوط.',
    }
    : {
      lead: 'A compact reading map for the branches included in this manuscript.',
      people: 'people',
      empty: 'No separate branches are included in this manuscript.',
    };
  const items = branchSummaries.map((summary) => [
    '<li class="branch-overview__item">',
    `<strong>${escapeHtml(summary.label)}</strong>`,
    `<span>${summary.personCount} ${escapeHtml(labels.people)}</span>`,
    '</li>',
  ].join('\n')).join('\n');

  return [
    '<section class="page chapter-page overview-chapter">',
    `<h1>${escapeHtml(title)}</h1>`,
    `<p class="chapter-lead">${escapeHtml(labels.lead)}</p>`,
    '<ul class="branch-overview">',
    items || `<li class="branch-overview__item">${escapeHtml(labels.empty)}</li>`,
    '</ul>',
    '</section>',
  ].join('\n');
}

function renderPeopleChapter(
  title: string,
  people: readonly import('../types').ManuscriptPersonEntry[],
  language: 'ar' | 'en',
  template: ManuscriptPrintTemplate
): string {
  const labels = language === 'ar'
    ? {
      coverage: 'توثيق',
      sourceSingular: 'مصدر',
      lead: 'ملفات الأشخاص مع أبرز الوقائع ونسبة التوثيق.',
    }
    : {
      coverage: 'documented',
      sourceSingular: 'source',
      lead: 'Person entries with key facts and citation coverage.',
    };

  let activeBranchLabel = '';
  const cards = people.flatMap((person) => {
    const branchLabel = person.familyContext?.branchLabel;
    const branchDivider = branchLabel && branchLabel !== activeBranchLabel
      ? [
          // Resolve before-branch visual inserts contract point
          // const _beforeBranchInserts = getEnabledVisualInserts(template.visualInserts, 'before-branch');
          `<div class="branch-divider"><span>${escapeHtml(branchLabel)}</span></div>`
        ]
      : [];
    if (branchLabel) activeBranchLabel = branchLabel;

    // Resolve after-branch visual inserts contract point
    // const _afterBranchInserts = getEnabledVisualInserts(template.visualInserts, 'after-branch');

    return [
      ...branchDivider,
      renderPersonCardByVariant(template.personCardVariant, person, { language, labels }),
    ];
  }).join('\n');

  return [
    '<section class="page chapter-page people-chapter">',
    `<h1>${escapeHtml(title)}</h1>`,
    `<p class="chapter-lead">${escapeHtml(labels.lead)}</p>`,
    '<div class="person-grid">',
    cards,
    '</div>',
    '</section>',
  ].join('\n');
}

// Person card rendering is now delegated to renderPersonCardByVariant() above.
// The classic implementation lives in personCards/classicPersonCard.ts.

export function groupTimelineEventsForPrint<T>(
  events: readonly T[],
  preferredGroupSize = 6,
  minimumFinalGroupSize = 2
): T[][] {
  const groups: T[][] = [];
  if (events.length === 0) return groups;

  let currentGroup: T[] = [];
  for (let i = 0; i < events.length; i++) {
    currentGroup.push(events[i]);
    if (currentGroup.length === preferredGroupSize) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  if (groups.length > 1 && groups[groups.length - 1].length < minimumFinalGroupSize) {
    const lastGroup = groups.pop()!;
    groups[groups.length - 1] = groups[groups.length - 1].concat(lastGroup);
  }

  return groups;
}

function renderTimelineChapter(title: string, entries: readonly ManuscriptTimelineEntry[], language: 'ar' | 'en'): string {
  const sliced = entries.slice(0, 80);
  const groups = groupTimelineEventsForPrint(sliced, 6, 2);

  const groupHtmls = groups.map((group) => {
    const items = group.map((entry) => {
      const formattedDate = formatManuscriptDate(entry.date, language, entry.isApproximate);
      return [
        '<li>',
        `<time>${escapeHtml(formattedDate)}</time>`,
        `<strong>${escapeHtml(entry.personName)}</strong>`,
        `<span>${escapeHtml(entry.title)}${entry.place ? ` - ${escapeHtml(entry.place)}` : ''}</span>`,
        '</li>',
      ].join('\n');
    }).join('\n');

    return [
      '<div class="timeline-event-group">',
      '<ol class="timeline-list">',
      items,
      '</ol>',
      '</div>',
    ].join('\n');
  }).join('\n');

  return [
    '<section class="page chapter-page timeline-chapter">',
    `<h1>${escapeHtml(title)}</h1>`,
    groupHtmls,
    '</section>',
  ].join('\n');
}

function renderEvidenceChapter(title: string, citations: readonly ManuscriptCitationEntry[], language: 'ar' | 'en'): string {
  const labels = language === 'ar'
    ? { source: 'المصدر', citations: 'الاستشهادات', fields: 'الحقول', empty: 'لا توجد مصادر مرتبطة بعد.' }
    : { source: 'Source', citations: 'Citations', fields: 'Fields', empty: 'No linked sources yet.' };
  const bySource = new Map<string, { count: number; fields: Set<string> }>();
  citations.forEach((citation) => {
    const current = bySource.get(citation.sourceTitle) ?? { count: 0, fields: new Set<string>() };
    current.count += 1;
    if (citation.targetField) current.fields.add(citation.targetField);
    bySource.set(citation.sourceTitle, current);
  });

  const rows = [...bySource.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])).map(([sourceTitle, info], index) => [
    '<tr>',
    `<td>${index + 1}</td>`,
    `<td>${escapeHtml(sourceTitle)}</td>`,
    `<td>${info.count}</td>`,
    `<td>${escapeHtml([...info.fields].slice(0, 4).join(', ') || '-')}</td>`,
    '</tr>',
  ].join('\n')).join('\n');

  return [
    '<section class="page chapter-page evidence-chapter">',
    `<h1>${escapeHtml(title)}</h1>`,
    '<table class="bibliography-table">',
    `<thead><tr><th>#</th><th>${escapeHtml(labels.source)}</th><th>${escapeHtml(labels.citations)}</th><th>${escapeHtml(labels.fields)}</th></tr></thead>`,
    '<tbody>',
    rows || `<tr><td colspan="4">${escapeHtml(labels.empty)}</td></tr>`,
    '</tbody>',
    '</table>',
    '</section>',
  ].join('\n');
}

function buildPrintCss(direction: 'rtl' | 'ltr', fontUrl: string, theme: HtmlManuscriptTheme): string {
  return `
@font-face {
  font-family: "JozorArabic";
  src: url("${escapeCssUrl(fontUrl)}") format("truetype");
  font-weight: 400;
  font-style: normal;
}
@page {
  size: A4;
  margin: ${theme.layout.pageMargin};
}
* {
  box-sizing: border-box;
}
html {
  direction: ${direction};
  font-family: ${theme.typography.fontFamily};
  color: ${theme.colors.text};
  background: ${theme.colors.pageBackground};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  margin: 0;
  background: ${theme.colors.pageBackground};
}
.page {
  min-height: 100vh;
  padding: ${theme.layout.pagePadding};
  page-break-after: always;
  background: ${theme.colors.paperBackground};
}
.chapter-page {
  break-after: page;
}
.cover-page {
  display: grid;
  align-content: center;
  text-align: center;
}
.cover-kicker {
  color: ${theme.colors.accent};
  letter-spacing: ${theme.typography.kickerLetterSpacing};
  text-transform: uppercase;
}
h1, h2, .person-card, .person-card__identity, .fact-row, .bibliography-table td, .source-highlights li {
  overflow-wrap: anywhere;
  word-break: normal;
  -webkit-hyphens: auto;
  hyphens: auto;
}
h1 {
  margin: 0 0 12px;
  font-size: ${theme.typography.titleSize};
  line-height: ${theme.typography.lineHeight};
}
h2 {
  margin: 0;
  font-size: ${theme.typography.headingSize};
  line-height: ${theme.typography.lineHeight};
}
.person-card__identity {
  min-width: 0;
  flex: 1 1 auto;
}
.person-card__context {
  margin: 3px 0 0;
  color: ${theme.colors.mutedText};
  font-size: 11px;
  line-height: 1.25;
}
.person-card__relationship {
  display: inline-block;
  margin: 3px 0 0;
  color: ${theme.colors.accent};
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.person-card__breadcrumb {
  margin: 8px 0 0;
  color: ${theme.colors.mutedText};
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.chapter-lead,
.cover-subtitle,
.sources-empty {
  color: ${theme.colors.mutedText};
  font-size: ${theme.typography.bodySize};
}
.person-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.layout.gridGap};
}
.branch-divider {
  grid-column: 1 / -1;
  margin: 4px 0 0;
  color: ${theme.colors.accent};
  font-size: 12px;
  font-weight: 700;
  border-bottom: 1px solid ${theme.colors.border};
  padding-bottom: 6px;
}
.branch-divider span {
  display: inline-block;
}
.branch-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.layout.gridGap};
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}
.branch-overview__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.layout.gridGap};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.cardRadius};
  padding: ${theme.layout.cardPadding};
  background: ${theme.colors.cardBackground};
  break-inside: avoid;
}
.branch-overview__item strong {
  overflow-wrap: anywhere;
}
.branch-overview__item span {
  flex: 0 0 auto;
  color: ${theme.colors.accent};
  font-size: 12px;
}
.person-card {
  break-inside: avoid;
  page-break-inside: avoid;
  min-height: 150px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.cardRadius};
  padding: ${theme.layout.cardPadding};
  background: ${theme.colors.cardBackground};
}
.person-card__header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  border-bottom: 1px solid ${theme.colors.border};
  padding-bottom: 8px;
}
.person-card__coverage {
  margin-top: 8px;
  font-size: 11px;
  color: ${theme.colors.mutedText};
}
.person-card__photo {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid ${theme.colors.border};
  object-fit: cover;
  background: ${theme.colors.paperBackground};
}
.person-card__header span,
small {
  color: ${theme.colors.accent};
}
.fact-list {
  margin: 10px 0 0;
}
.person-card__narrative {
  margin: 10px 0 0;
  color: ${theme.colors.text};
  font-size: ${theme.typography.bodySize};
  line-height: 1.65;
}
.fact-row {
  display: grid;
  grid-template-columns: minmax(86px, 120px) minmax(0, 1fr);
  gap: 8px;
  margin: 5px 0;
}
dt {
  color: ${theme.colors.mutedText};
}
dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
.source-highlights {
  margin: 10px 0 0;
  padding-inline-start: 18px;
}
.timeline-event-group {
  break-inside: avoid;
  page-break-inside: avoid;
}
.timeline-list {
  list-style: none;
  padding-inline-start: 0;
  break-inside: auto;
  page-break-inside: auto;
}
.timeline-list li {
  margin: 8px 0;
  break-inside: avoid;
  page-break-inside: avoid;
}
.timeline-list time {
  color: ${theme.colors.accent};
  margin-inline-end: 8px;
}
.bibliography-table {
  width: 100%;
  border-collapse: collapse;
  background: ${theme.colors.cardBackground};
  table-layout: fixed;
}
.bibliography-table tr {
  break-inside: avoid;
}
.bibliography-table th,
.bibliography-table td {
  border-bottom: 1px solid ${theme.colors.border};
  padding: 8px;
  text-align: start;
  vertical-align: top;
}
.bibliography-table th:first-child,
.bibliography-table td:first-child {
  width: 44px;
}
.bibliography-table th:nth-child(3),
.bibliography-table td:nth-child(3) {
  width: 86px;
}
.page-footer {
  margin-top: 18px;
  padding-top: 8px;
  border-top: 1px solid ${theme.colors.border};
  color: ${theme.colors.mutedText};
  font-size: 10px;
}
.introduction-page {
  display: grid;
  align-content: center;
  text-align: center;
  padding: 40px;
}
.introduction-page h2 {
  color: ${theme.colors.accent};
  font-size: 24px;
  margin-bottom: 24px;
}
.intro-text {
  font-size: 16px;
  line-height: 1.8;
  max-width: 600px;
  margin: 0 auto;
}
.manuscript-sources-note {
  margin-top: 24px;
  padding: 12px;
  border-top: 1px dashed ${theme.colors.border};
  font-size: 11px;
  color: ${theme.colors.mutedText};
  text-align: center;
}
.manuscript-closing-section {
  margin: 40px auto;
  max-width: 500px;
  padding: 28px;
  background: ${theme.colors.cardBackground};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.cardRadius};
  text-align: center;
  break-inside: avoid;
  page-break-inside: avoid;
}
.closing-title {
  margin: 0 0 6px 0;
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.accent};
}
.closing-generator {
  margin: 0 0 20px 0;
  font-size: 12px;
  color: ${theme.colors.mutedText};
}
.closing-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: ${theme.colors.mutedText};
  max-width: 320px;
  margin: 0 auto;
}
.closing-stats div {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  background: ${theme.colors.paperBackground};
  border: 1px solid ${theme.colors.border};
  border-radius: 6px;
  padding: 8px 14px;
}
@media print {
  body {
    background: white;
  }
  .page {
    min-height: auto;
  }
}
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCssUrl(value: string): string {
  return value.replace(/["\\\n\r]/g, '');
}

// getMetadataLabel is re-exported from personCards/classicPersonCard.ts above.
