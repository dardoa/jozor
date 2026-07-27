import { describe, expect, it, vi } from 'vitest';

import { posterPreviewAdapter } from '../previewAdapterRegistry';
import { exportStudioPoster, type StudioPosterExportRuntime } from '../studioPosterExportAdapter';
import { createTestPosterScene } from './studioPosterTestFixtures';

const model = posterPreviewAdapter.createPreviewModel({
  definitionId: 'classic-ancestor-poster',
  mode: 'sanitized-data',
  privacyMode: 'masked',
  language: 'ar',
  sanitizedGraph: {
    nodes: [
      {
        previewId: 'preview-node-1',
        displayName: 'سليم النور',
        generation: 1,
        relationshipHint: 'root',
        lifeStatus: 'deceased',
        isMasked: false,
        hasPhoto: false,
      },
    ],
    edges: [],
    warnings: [],
    metadata: {
      sanitizedNodeCount: 1,
      truncated: false,
      policy: {
        privacyMode: 'masked',
        language: 'ar',
        maxNodes: 10,
        includePhotos: false,
        includeYears: true,
      },
    },
  },
});
const scene = createTestPosterScene({
  model,
  language: 'ar',
  title: 'شجرة أسلاف سليم النور',
});

describe('studioPosterExportAdapter', () => {
  it('exports PNG through an injected runtime using the canonical SVG renderer output', async () => {
    const renderPng = vi.fn<NonNullable<StudioPosterExportRuntime['renderPng']>>()
      .mockResolvedValue(new Blob(['png'], { type: 'image/png' }));

    const result = await exportStudioPoster({
      scene,
      format: 'png',
    }, { renderPng });

    expect(result.mimeType).toBe('image/png');
    expect(result.fileName).toBe('شجرة أسلاف سليم النور.png');
    expect(result.renderResult.format).toBe('svg');
    expect(result.renderResult.svg).toContain('data-poster-renderer="svg-v1"');
    expect(result.renderResult.scene).toBe(scene);
    expect(result.renderResult.svg).toContain('<svg');
    expect(renderPng).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'شجرة أسلاف سليم النور.png',
      renderResult: expect.objectContaining({
        metadata: expect.objectContaining({ dir: 'rtl' }),
      }),
    }));
  });

  it('exports PDF through an injected runtime without using the legacy HTML renderer', async () => {
    const renderPdf = vi.fn<NonNullable<StudioPosterExportRuntime['renderPdf']>>()
      .mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));

    const result = await exportStudioPoster({
      scene,
      format: 'pdf',
      fileName: 'Classic: Poster/Test',
    }, { renderPdf });

    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName).toBe('Classic- Poster-Test.pdf');
    expect(result.renderResult.svg).toContain('<svg');
    expect(result.renderResult.svg).not.toContain('<canvas');
    expect(result.renderResult.svg).not.toContain('<foreignObject');
    expect(result.renderResult.svg).not.toContain('<script');
  });

  it('exports the canonical SVG directly without an additional runtime', async () => {
    const result = await exportStudioPoster({
      scene,
      format: 'svg',
      fileName: 'Arabic Poster',
    }, {});

    expect(result.fileName).toBe('Arabic Poster.svg');
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.renderResult.svg).toContain('<svg');
    expect(result.renderResult.metadata.rendererId).toBe('poster-scene-svg');
  });

  it('fails when the requested runtime is not configured', async () => {
    await expect(exportStudioPoster({
      scene,
      format: 'pdf',
    }, {})).rejects.toThrow('Studio poster PDF export runtime is not configured');
  });

  it('rejects empty or wrong-mime runtime outputs', async () => {
    await expect(exportStudioPoster({
      scene,
      format: 'png',
      fileName: 'Poster',
    }, {
      renderPng: vi.fn().mockResolvedValue(new Blob(['not-png'], { type: 'application/pdf' })),
    })).rejects.toThrow('instead of image/png');

    await expect(exportStudioPoster({
      scene,
      format: 'pdf',
      fileName: 'Poster',
    }, {
      renderPdf: vi.fn().mockResolvedValue(new Blob([], { type: 'application/pdf' })),
    })).rejects.toThrow('empty Blob');
  });
});
