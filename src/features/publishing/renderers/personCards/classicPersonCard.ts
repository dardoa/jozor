import type { ManuscriptPersonEntry } from '../../types';

export interface PersonCardRenderLabels {
  readonly coverage: string;
  readonly sourceSingular: string;
}

export interface PersonCardRenderContext {
  readonly language: 'ar' | 'en';
  readonly labels: PersonCardRenderLabels;
}

/**
 * Renders the classic two-column person card used in the Family Book manuscript.
 * This is the only implemented card variant. Future variants (leaf-card,
 * photo-card, research-card, compact-row) will live in sibling files.
 */
export function renderClassicPersonCard(
  person: ManuscriptPersonEntry,
  context: PersonCardRenderContext
): string {
  const { language, labels } = context;
  return [
    '<article class="person-card">',
    '<header class="person-card__header">',
    person.photoUrl ? `<img class="person-card__photo" src="${escapeHtml(person.photoUrl)}" alt="">` : '',
    '<div class="person-card__identity">',
    `<h2>${escapeHtml(person.displayName)}</h2>`,
    person.familyContext ? `<p class="person-card__context">${escapeHtml(person.familyContext.label)}</p>` : '',
    person.relationshipToRoot ? `<div class="person-card__relationship">${escapeHtml(getMetadataLabel(person.relationshipToRoot, person.generation, language))}</div>` : '',
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

/**
 * Returns a human-readable relationship/generation label for a person entry.
 * Exported so tests and the MarkdownManuscriptRenderer can share the same logic.
 */
export function getMetadataLabel(
  relationship: string,
  generation: number | undefined,
  language: 'ar' | 'en'
): string {
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
