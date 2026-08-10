import { describe, expect, it } from 'vitest';
import { computeCardContentLayout, rectsIntersect, splitTextLines } from '../posterCardContentLayout';

import type { PosterCardPreset, PosterSceneNode } from '../posterSceneTypes';

const MOCK_CARD_PRESET: PosterCardPreset = {
  id: 'classic-heritage',
  theme: 'classic',
  visualStyle: 'classic-heritage',

  geometry: {
    minWidth: 104,
    maxWidth: 160,
    height: 68,
    borderRadius: 8,
  },
  typography: {
    nameSize: 13,
    yearsSize: 9.5,
    statusSize: 9.5,
  },
  photo: {
    shape: 'circle',
    preferredDiameter: 0,
    borderWidth: 1.5,
    overlapsCard: false,
  },
};

const MOCK_NODE: PosterSceneNode = {
  previewId: 'test-node-1',
  displayName: 'الشيخ عبد الرحمن بن محمد بن علي آل رمضان',
  generation: 1,
  isRoot: true,
  isMasked: false,
  hasPhoto: false,
  birthYear: 1980,
  deathYear: 2025,
  relationshipHint: 'root',
  initials: 'عع',
  nameFontSize: 13,
  rect: { x: 100, y: 100, width: 120, height: 80 },
};


describe('posterCardContentLayout', () => {
  it('computes non-intersecting regions for name and years', () => {
    const layout = computeCardContentLayout({
      node: MOCK_NODE,
      cardWidth: 120,
      cardHeight: 80,
      cardPreset: MOCK_CARD_PRESET,
      language: 'ar',
      cardX: 100,
      cardY: 100,
    });

    expect(layout.nameLines.length).toBeGreaterThan(0);
    expect(layout.detailRows.length).toBeGreaterThan(0);

    if (layout.detailRegionBounds) {
      const intersect = rectsIntersect(layout.nameBounds, layout.detailRegionBounds);
      expect(intersect).toBe(false);
    }
  });

  it('keeps name bounds strictly inside card bounds with safe padding', () => {
    const minPadding = 4;
    const cardX = 50;
    const cardY = 50;
    const cardW = 130;
    const cardH = 90;

    const layout = computeCardContentLayout({
      node: MOCK_NODE,
      cardWidth: cardW,
      cardHeight: cardH,
      cardPreset: MOCK_CARD_PRESET,
      language: 'ar',
      cardX,
      cardY,
      minPadding,
    });

    expect(layout.nameBounds.x).toBeGreaterThanOrEqual(cardX + minPadding - 0.1);
    expect(layout.nameBounds.y).toBeGreaterThanOrEqual(cardY + minPadding - 0.1);
    expect(layout.nameBounds.x + layout.nameBounds.width).toBeLessThanOrEqual(cardX + cardW - minPadding + 0.1);
    expect(layout.nameBounds.y + layout.nameBounds.height).toBeLessThanOrEqual(cardY + cardH - minPadding + 0.1);
  });

  it('handles privacy masked nodes correctly', () => {
    const maskedNode: PosterSceneNode = {
      ...MOCK_NODE,
      isMasked: true,
    };

    const layout = computeCardContentLayout({
      node: maskedNode,
      cardWidth: 120,
      cardHeight: 80,
      cardPreset: MOCK_CARD_PRESET,
      language: 'ar',
      cardX: 0,
      cardY: 0,
    });

    expect(layout.detailRows).toHaveLength(1);
    expect(layout.detailRows[0]!.field).toBe('privacy');
    expect(layout.detailRows[0]!.label).toBe(
      '\u0645\u062d\u0645\u064a \u0628\u0645\u0648\u062c\u0628 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629'
    );
  });

  it('wraps long Arabic names cleanly across lines', () => {
    const longNameNode: PosterSceneNode = {
      ...MOCK_NODE,
      displayName: 'صاحب السماحة العلامة الحاج محمد بن علي بن عثمان بن حسن آل رمضان المبارك',
    };

    const layout = computeCardContentLayout({
      node: longNameNode,
      cardWidth: 130,
      cardHeight: 100,
      cardPreset: MOCK_CARD_PRESET,
      language: 'ar',
    });

    expect(layout.nameLines.length).toBeGreaterThanOrEqual(2);
    expect(layout.nameFontSize).toBeGreaterThanOrEqual(8.5);
  });

  describe('splitTextLines unit assertions', () => {
    it('handles two-word wrapping cleanly without ellipsis', () => {
      const lines = splitTextLines('Grandfather Paternal', 12, 2);
      expect(lines).toEqual(['Grandfather', 'Paternal']);
      expect(lines.some((l) => l.includes('\u2026'))).toBe(false);
    });

    it('moves final word to a new line cleanly', () => {
      const lines = splitTextLines('John Smith Junior', 10, 3);
      expect(lines).toEqual(['John Smith', 'Junior']);
      expect(lines.some((l) => l.includes('\u2026'))).toBe(false);
    });

    it('respects exact maxCharacters boundary', () => {
      const lines = splitTextLines('Hello World', 11, 2);
      expect(lines).toEqual(['Hello World']);
      expect(lines.some((l) => l.includes('\u2026'))).toBe(false);
    });

    it('handles Arabic multi-line wrapping without truncation', () => {
      const lines = splitTextLines('محمد بن علي بن عثمان', 12, 2);
      expect(lines).toEqual(['محمد بن علي', 'بن عثمان']);
      expect(lines.some((l) => l.includes('\u2026'))).toBe(false);
    });
  });

  describe('computeCardContentLayout fitsInCard integrity', () => {
    it('returns fitsInCard: false when text cannot fit without truncation', () => {
      const hugeNameNode: PosterSceneNode = {
        ...MOCK_NODE,
        displayName: 'A Very Long Complex Name That Exceeds All Printable Bounds Of A Tiny Card',
      };
      const layout = computeCardContentLayout({
        node: hugeNameNode,
        cardWidth: 60,
        cardHeight: 40,
        cardPreset: MOCK_CARD_PRESET,
        language: 'en',
        minReadableFontSize: 10,
      });
      expect(layout.fitsInCard).toBe(false);
    });

    it('returns fitsInCard: false when font size falls below minimum readable font size', () => {
      const longNameNode: PosterSceneNode = {
        ...MOCK_NODE,
        displayName: 'Grandfather Paternal Senior The Third',
      };
      const layout = computeCardContentLayout({
        node: longNameNode,
        cardWidth: 70,
        cardHeight: 45,
        cardPreset: MOCK_CARD_PRESET,
        language: 'en',
        minReadableFontSize: 12, // requires 12, but tiny card forces smaller
      });
      expect(layout.fitsInCard).toBe(false);
    });
  });
});
