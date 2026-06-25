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
}

const DEFAULT_TITLE = 'Jozor Family Manuscript';

export class HtmlManuscriptRenderer {
  public static renderToHtml(
    model: FamilyManuscriptModel,
    options: HtmlManuscriptRenderOptions = {}
  ): string {
    const language = options.language ?? 'ar';
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    const title = options.title ?? model.title ?? DEFAULT_TITLE;

    return [
      '<!doctype html>',
      `<html lang="${language}" dir="${direction}">`,
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapeHtml(title)}</title>`,
      `<style>${buildPrintCss(direction, options.fontUrl ?? '/fonts/Amiri-Regular.ttf')}</style>`,
      '</head>',
      '<body>',
      renderCover(model, title),
      model.chapters.map((chapter) => renderChapter(chapter)).join('\n'),
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

function renderChapter(chapter: ManuscriptChapter): string {
  switch (chapter.type) {
    case 'people':
      return renderPeopleChapter(chapter.title, chapter.people ?? []);
    case 'timeline':
      return renderTimelineChapter(chapter.title, chapter.timeline ?? []);
    case 'evidence':
      return renderEvidenceChapter(chapter.title, chapter.citations ?? []);
    default:
      return '';
  }
}

function renderPeopleChapter(title: string, people: readonly ManuscriptPersonEntry[]): string {
  const cards = people.map((person) => [
    '<article class="person-card">',
    '<header class="person-card__header">',
    `<h2>${escapeHtml(person.displayName)}</h2>`,
    `<span>${person.citationCoverage}% توثيق</span>`,
    '</header>',
    '<dl class="fact-list">',
    ...person.facts.map((fact) => [
      '<div class="fact-row">',
      `<dt>${escapeHtml(fact.label)}</dt>`,
      `<dd>${escapeHtml(fact.value)}${fact.citationCount > 0 ? ` <small>${fact.citationCount} مصدر</small>` : ''}</dd>`,
      '</div>',
    ].join('\n')),
    '</dl>',
    renderSourceHighlights(person),
    '</article>',
  ].join('\n')).join('\n');

  return [
    '<section class="page chapter-page people-chapter">',
    `<h1>${escapeHtml(title)}</h1>`,
    '<p class="chapter-lead">ملفات الأشخاص مع أبرز الوقائع ونسبة التوثيق.</p>',
    '<div class="person-grid">',
    cards,
    '</div>',
    '</section>',
  ].join('\n');
}

function renderSourceHighlights(person: ManuscriptPersonEntry): string {
  if (person.sourceHighlights.length === 0) {
    return '<p class="sources-empty">لا توجد مصادر مرتبطة بعد.</p>';
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

function renderEvidenceChapter(title: string, citations: readonly ManuscriptCitationEntry[]): string {
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
    '<thead><tr><th>#</th><th>المصدر</th><th>الاستشهادات</th><th>الحقول</th></tr></thead>',
    '<tbody>',
    rows || '<tr><td colspan="4">لا توجد مصادر مرتبطة بعد.</td></tr>',
    '</tbody>',
    '</table>',
    '</section>',
  ].join('\n');
}

function buildPrintCss(direction: 'rtl' | 'ltr', fontUrl: string): string {
  return `
@font-face {
  font-family: "JozorArabic";
  src: url("${escapeCssUrl(fontUrl)}") format("truetype");
  font-weight: 400;
  font-style: normal;
}
@page {
  size: A4;
  margin: 16mm;
}
* {
  box-sizing: border-box;
}
html {
  direction: ${direction};
  font-family: "JozorArabic", "Noto Naskh Arabic", "Segoe UI", serif;
  color: #1f2937;
  background: #f7f3ea;
}
body {
  margin: 0;
  background: #f7f3ea;
}
.page {
  min-height: 100vh;
  padding: 28mm 20mm;
  page-break-after: always;
  background: #fffaf0;
}
.cover-page {
  display: grid;
  align-content: center;
  text-align: center;
}
.cover-kicker {
  color: #9a6b1f;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1 {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.35;
}
h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}
.chapter-lead,
.cover-subtitle,
.sources-empty {
  color: #667085;
  font-size: 13px;
}
.person-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.person-card {
  break-inside: avoid;
  page-break-inside: avoid;
  min-height: 150px;
  border: 1px solid #eadcc6;
  border-radius: 10px;
  padding: 14px;
  background: #fffdf7;
}
.person-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #eadcc6;
  padding-bottom: 8px;
}
.person-card__header span,
small {
  color: #9a6b1f;
}
.fact-list {
  margin: 10px 0 0;
}
.fact-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
  margin: 5px 0;
}
dt {
  color: #667085;
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
  color: #9a6b1f;
  margin-inline-end: 8px;
}
.bibliography-table {
  width: 100%;
  border-collapse: collapse;
  background: #fffdf7;
}
.bibliography-table th,
.bibliography-table td {
  border-bottom: 1px solid #eadcc6;
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
