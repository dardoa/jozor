import { describe, expect, it } from 'vitest';
import type { ManuscriptPersonEntry } from '../../types';
import { NarrativeDraftBuilder } from '../NarrativeDraftBuilder';

const entry: ManuscriptPersonEntry = {
  personId: 'p1',
  displayName: 'Root Person',
  facts: [
    { label: 'Birth date', value: '1950-01-01', citationCount: 1 },
    { label: 'Birth place', value: 'Kafranbel, Syria', citationCount: 1 },
    { label: 'Residence', value: 'Riyadh, Saudi Arabia', citationCount: 0 },
    { label: 'Occupation', value: 'Teacher', citationCount: 0 },
  ],
  sourceHighlights: [
    { sourceId: 's1', title: 'Birth registry', citationCount: 2 },
  ],
  citationCount: 2,
  citationCoverage: 50,
};

const maskedEntry: ManuscriptPersonEntry = {
  personId: 'p-private',
  displayName: 'Private',
  facts: [],
  sourceHighlights: [],
  citationCount: 0,
  citationCoverage: 0,
};

describe('NarrativeDraftBuilder', () => {
  it('builds a deterministic person narrative from structured manuscript facts', () => {
    const narrative = NarrativeDraftBuilder.buildPersonNarrative(entry);

    expect(narrative).toContain('Root Person was born on 1950-01-01 in Kafranbel, Syria.');
    expect(narrative).toContain('occupation Teacher');
    expect(narrative).toContain('2 linked citations');
    expect(narrative).toContain('Birth registry');
  });

  it('applies narrative drafts without mutating the input entries', () => {
    const [withNarrative] = NarrativeDraftBuilder.applyToPeople([entry]);

    expect(entry.narrative).toBeUndefined();
    expect(withNarrative.narrative).toContain('Root Person was born');
  });

  it('does not create repetitive empty narratives for fully masked private entries by default', () => {
    const [withNarrative] = NarrativeDraftBuilder.applyToPeople([maskedEntry]);

    expect(withNarrative.narrative).toBeUndefined();
    expect(NarrativeDraftBuilder.buildPersonNarrative(maskedEntry)).toBe('');
  });

  it('can explicitly keep fallback private narratives for internal review modes', () => {
    const narrative = NarrativeDraftBuilder.buildPersonNarrative(maskedEntry, {
      suppressEmptyPrivateNarratives: false,
    });

    expect(narrative).toContain('Private is documented in this family manuscript.');
  });

  it('builds Arabic narrative drafts when requested', () => {
    const narrative = NarrativeDraftBuilder.buildPersonNarrative(entry, { language: 'ar' });

    expect(narrative).toContain('Root Person وُلد بتاريخ 1950-01-01 في Kafranbel, Syria.');
    expect(narrative).toContain('يرتبط هذا الملف بـ 2 استشهاد');
    expect(narrative).toContain('من أبرز المصادر: Birth registry.');
  });
});
