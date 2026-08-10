import { describe, expect, it } from 'vitest';
import { evaluatePosterPrintQuality } from '../posterPrintQuality';
import type { PosterDocumentSpec, PosterSceneNode } from '../posterSceneTypes';

const MOCK_A3_DOCUMENT: PosterDocumentSpec = {
  pageSize: 'A3',
  orientation: 'landscape',
  marginPreset: 'balanced',
  physicalSizeMm: { width: 420, height: 297 },
  sceneSize: { width: 1680, height: 1188 },
  marginsMm: { top: 13.5, right: 13.5, bottom: 13.5, left: 13.5 },
  margins: { top: 54, right: 54, bottom: 54, left: 54 },
};

function createMockNode(nameFontSize: number): PosterSceneNode {
  return {
    previewId: 'node-1',
    displayName: 'Test Person',
    generation: 1,
    isRoot: true,
    isMasked: false,
    hasPhoto: false,
    relationshipHint: 'root',
    initials: 'TP',
    nameFontSize,
    rect: { x: 100, y: 100, width: 120, height: 80 },
  };
}

describe('posterPrintQuality regression gate', () => {
  it('blocks scenes with font sizes between 4.0pt and 7.9pt', () => {
    // sceneUnitsToPoints for A3 landscape = (297 / 1188) * (72 / 25.4) = 0.70866
    // nameFontSize = 7.0 scene units => 7.0 * 0.70866 = 4.96pt (< 8.0pt)
    const report4_9pt = evaluatePosterPrintQuality({
      document: MOCK_A3_DOCUMENT,
      nodes: [createMockNode(7.0)],
      truncated: false,
    });

    expect(report4_9pt.status).toBe('blocked');
    expect(report4_9pt.warnings).toContain('poster.quality.font-too-small:5.0pt');

    // nameFontSize = 10.0 scene units => 10.0 * 0.70866 = 7.09pt (< 8.0pt)
    const report7_1pt = evaluatePosterPrintQuality({
      document: MOCK_A3_DOCUMENT,
      nodes: [createMockNode(10.0)],
      truncated: false,
    });

    expect(report7_1pt.status).toBe('blocked');
    expect(report7_1pt.warnings).toContain('poster.quality.font-too-small:7.1pt');
  });

  it('passes quality check when font size is >= 8.0pt', () => {
    // nameFontSize = 12.0 scene units => 12.0 * 0.70866 = 8.50pt (>= 8.0pt)
    const report8_5pt = evaluatePosterPrintQuality({
      document: MOCK_A3_DOCUMENT,
      nodes: [createMockNode(12.0)],
      truncated: false,
    });

    expect(report8_5pt.status).not.toBe('blocked');
    expect(report8_5pt.warnings).not.toContain(expect.stringMatching(/font-too-small/));
  });
});
