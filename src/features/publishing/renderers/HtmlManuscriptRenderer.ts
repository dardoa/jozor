import type {
  FamilyManuscriptModel,
  ManuscriptChapter,
  ManuscriptCitationEntry,
  ManuscriptPersonEntry,
  ManuscriptTimelineEntry,
} from '../types';

export interface HtmlManuscriptRenderOptions {
  readonly language?: 'ar' | 'en';
  readonly title?: string;
  readonly fontUrl?: string;
  readonly theme?: HtmlManuscriptTheme;
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
      model.chapters.map((chapter) => renderChapter(chapter, language)).join('\n'),
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
    `<p class="cover-subtitle">${escapeHtml(model.id)}</p>`,
    '</section>',
  ].join('\n');
}

function renderChapter(chapter: ManuscriptChapter, language: 'ar' | 'en'): string {
  switch (chapter.type) {
    case 'people':
      return renderPeopleChapter(chapter.title, chapter.people ?? [], language);
    case 'timeline':
      return renderTimelineChapter(chapter.title, chapter.timeline ?? []);
    case 'evidence':
      return renderEvidenceChapter(chapter.title, chapter.citations ?? [], language);
    default:
      return '';
  }
}

function renderPeopleChapter(title: string, people: readonly ManuscriptPersonEntry[], language: 'ar' | 'en'): string {
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

  const cards = people.map((person) => [
    '<article class="person-card">',
    '<header class="person-card__header">',
    person.photoUrl ? `<img class="person-card__photo" src="${escapeHtml(person.photoUrl)}" alt="">` : '',
    '<div class="person-card__identity">',
    `<h2>${escapeHtml(person.displayName)}</h2>`,
    person.familyContext ? `<p class="person-card__context">${escapeHtml(person.familyContext.label)}</p>` : '',
    '</div>',
    `<span>${person.citationCoverage}% ${escapeHtml(labels.coverage)}</span>`,
    '</header>',
    renderFamilyBreadcrumb(person),
    person.narrative ? `<p class="person-card__narrative">${escapeHtml(person.narrative)}</p>` : '',
    '<dl class="fact-list">',
    ...person.facts.map((fact) => [
      '<div class="fact-row">',
      `<dt>${escapeHtml(fact.label)}</dt>`,
      `<dd>${escapeHtml(fact.value)}${fact.citationCount > 0 ? ` <small>${fact.citationCount} ${escapeHtml(labels.sourceSingular)}</small>` : ''}</dd>`,
      '</div>',
    ].join('\n')),
    '</dl>',
    renderSourceHighlights(person, language),
    '</article>',
  ].join('\n')).join('\n');

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

function renderFamilyBreadcrumb(person: ManuscriptPersonEntry): string {
  const breadcrumb = person.familyContext?.breadcrumb;
  if (!breadcrumb || breadcrumb.length <= 1) return '';
  return `<p class="person-card__breadcrumb">${breadcrumb.map(escapeHtml).join(' › ')}</p>`;
}

function renderSourceHighlights(person: ManuscriptPersonEntry, language: 'ar' | 'en'): string {
  if (person.sourceHighlights.length === 0) {
    return `<p class="sources-empty">${language === 'ar' ? 'لا توجد مصادر مرتبطة بعد.' : 'No linked sources yet.'}</p>`;
  }

  return [
    '<ul class="source-highlights">',
    ...person.sourceHighlights.map((source) => (
      `<li>${escapeHtml(source.title)} <small>${source.citationCount}</small></li>`
    )),
    '</ul>',
  ].join('\n');
}

function renderTimelineChapter(title: string, entries: readonly ManuscriptTimelineEntry[]): string {
  const items = entries.slice(0, 80).map((entry) => [
    '<li>',
    `<time>${escapeHtml(entry.date)}</time>`,
    `<strong>${escapeHtml(entry.personName)}</strong>`,
    `<span>${escapeHtml(entry.title)}${entry.place ? ` - ${escapeHtml(entry.place)}` : ''}</span>`,
    '</li>',
  ].join('\n')).join('\n');

  return [
    '<section class="page chapter-page timeline-chapter">',
    `<h1>${escapeHtml(title)}</h1>`,
    '<ol class="timeline-list">',
    items,
    '</ol>',
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
  justify-content: space-between;
  gap: ${theme.layout.gridGap};
  border-bottom: 1px solid ${theme.colors.border};
  padding-bottom: 8px;
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
  grid-template-columns: 110px 1fr;
  gap: 8px;
  margin: 5px 0;
}
dt {
  color: ${theme.colors.mutedText};
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.source-highlights {
  margin: 10px 0 0;
  padding-inline-start: 18px;
}
.timeline-list {
  padding-inline-start: 22px;
}
.timeline-list li {
  margin: 8px 0;
}
.timeline-list time {
  color: ${theme.colors.accent};
  margin-inline-end: 8px;
}
.bibliography-table {
  width: 100%;
  border-collapse: collapse;
  background: ${theme.colors.cardBackground};
}
.bibliography-table th,
.bibliography-table td {
  border-bottom: 1px solid ${theme.colors.border};
  padding: 8px;
  text-align: start;
  vertical-align: top;
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
