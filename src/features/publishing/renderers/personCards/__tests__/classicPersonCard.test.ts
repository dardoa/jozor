import { describe, expect, it } from 'vitest';
import type { ManuscriptPersonEntry } from '../../../types';
import { getMetadataLabel, renderClassicPersonCard } from '../classicPersonCard';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const MOJIBAKE_FRAGMENTS = ['Ø', 'Ù', 'â€', 'â†', 'Ã‡'];

const basePerson: ManuscriptPersonEntry = {
  personId: 'p1',
  displayName: 'رمضان القربي',
  citationCoverage: 75,
  citationCount: 3,
  facts: [
    { label: 'مكان الميلاد', value: 'كفرنبل، سوريا', citationCount: 1 },
    { label: 'الإقامة', value: 'الرياض، السعودية', citationCount: 0 },
  ],
  sourceHighlights: [
    { sourceId: 's1', title: 'سجل النفوس', citationCount: 2 },
  ],
};

const arContext = {
  language: 'ar' as const,
  labels: { coverage: 'توثيق', sourceSingular: 'مصدر' },
};

const enContext = {
  language: 'en' as const,
  labels: { coverage: 'documented', sourceSingular: 'source' },
};

// ---------------------------------------------------------------------------
// renderClassicPersonCard
// ---------------------------------------------------------------------------

describe('renderClassicPersonCard', () => {
  it('renders person display name', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    expect(html).toContain('رمضان القربي');
  });

  it('renders citation coverage with coverage label', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    expect(html).toContain('75% توثيق');
  });

  it('renders fact labels and values', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    expect(html).toContain('مكان الميلاد');
    expect(html).toContain('كفرنبل، سوريا');
    expect(html).toContain('الإقامة');
    expect(html).toContain('الرياض، السعودية');
  });

  it('renders citation count on facts that have citations', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    expect(html).toContain('1 مصدر');
  });

  it('renders source highlights', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    expect(html).toContain('سجل النفوس');
  });

  it('renders empty-source Arabic fallback when no source highlights', () => {
    const person: ManuscriptPersonEntry = { ...basePerson, sourceHighlights: [] };
    const html = renderClassicPersonCard(person, arContext);
    expect(html).toContain('لا توجد مصادر مرتبطة بعد.');
  });

  it('renders empty-source English fallback when no source highlights', () => {
    const person: ManuscriptPersonEntry = { ...basePerson, sourceHighlights: [] };
    const html = renderClassicPersonCard(person, enContext);
    expect(html).toContain('No linked sources yet.');
  });

  it('renders photo img tag when photoUrl is provided', () => {
    const person: ManuscriptPersonEntry = {
      ...basePerson,
      photoUrl: 'https://example.com/photo.jpg',
    };
    const html = renderClassicPersonCard(person, arContext);
    expect(html).toContain('class="person-card__photo"');
    expect(html).toContain('https://example.com/photo.jpg');
  });

  it('does not render photo img tag when photoUrl is absent', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    expect(html).not.toContain('person-card__photo');
  });

  it('renders narrative paragraph when narrative is provided', () => {
    const person: ManuscriptPersonEntry = {
      ...basePerson,
      narrative: 'وُلد في قرية صغيرة.',
    };
    const html = renderClassicPersonCard(person, arContext);
    expect(html).toContain('person-card__narrative');
    expect(html).toContain('وُلد في قرية صغيرة.');
  });

  it('renders relationship metadata label', () => {
    const person: ManuscriptPersonEntry = {
      ...basePerson,
      relationshipToRoot: 'root',
      generation: 0,
    };
    const html = renderClassicPersonCard(person, arContext);
    expect(html).toContain('الجذر');
  });

  it('renders family context label', () => {
    const person: ManuscriptPersonEntry = {
      ...basePerson,
      familyContext: {
        kind: 'descendant',
        generationDepth: 1,
        label: 'الجيل الثاني',
        breadcrumb: ['جذر', 'رمضان'],
        branchRootPersonId: 'root',
        branchLabel: 'فرع القربي',
      },
    };
    const html = renderClassicPersonCard(person, arContext);
    expect(html).toContain('الجيل الثاني');
  });

  it('renders breadcrumb when breadcrumb has more than one entry', () => {
    const person: ManuscriptPersonEntry = {
      ...basePerson,
      familyContext: {
        kind: 'descendant',
        generationDepth: 1,
        label: 'الجيل 1',
        breadcrumb: ['جذر العائلة', 'رمضان القربي'],
        branchRootPersonId: 'root',
        branchLabel: 'الفرع الرئيسي',
      },
    };
    const html = renderClassicPersonCard(person, arContext);
    expect(html).toContain('person-card__breadcrumb');
    expect(html).toContain('جذر العائلة');
  });

  it('outputs well-formed article element', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    expect(html).toContain('<article class="person-card">');
    expect(html).toContain('</article>');
  });

  it('does not contain mojibake fragments in Arabic output', () => {
    const html = renderClassicPersonCard(basePerson, arContext);
    for (const fragment of MOJIBAKE_FRAGMENTS) {
      expect(html).not.toContain(fragment);
    }
  });

  it('escapes HTML special characters in display name', () => {
    const person: ManuscriptPersonEntry = {
      ...basePerson,
      displayName: '<script>alert(1)</script>',
    };
    const html = renderClassicPersonCard(person, enContext);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// getMetadataLabel
// ---------------------------------------------------------------------------

describe('getMetadataLabel', () => {
  it('returns Arabic root label', () => {
    expect(getMetadataLabel('root', 0, 'ar')).toBe('الجذر');
  });

  it('returns Arabic spouse label', () => {
    expect(getMetadataLabel('spouse', 0, 'ar')).toBe('زوج/زوجة');
  });

  it('returns Arabic child label', () => {
    expect(getMetadataLabel('child', 1, 'ar')).toBe('الجيل 1');
  });

  it('returns Arabic grandchild label', () => {
    expect(getMetadataLabel('grandchild', 2, 'ar')).toBe('الجيل 2');
  });

  it('returns Arabic generation fallback for unknown relationship', () => {
    expect(getMetadataLabel('great-grandchild', 3, 'ar')).toBe('الجيل 3');
  });

  it('returns English root label', () => {
    expect(getMetadataLabel('root', 0, 'en')).toBe('Root');
  });

  it('returns English generation fallback for unknown relationship', () => {
    expect(getMetadataLabel('great-grandchild', 3, 'en')).toBe('Generation 3');
  });
});
