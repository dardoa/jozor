import { beforeEach, describe, expect, it, vi } from 'vitest';

import { posterPreviewAdapter } from '../previewAdapterRegistry';
import { exportStudioPoster } from '../studioPosterExportAdapter';
import { createStudioPosterBrowserPdfRuntime } from '../studioPosterBrowserPdfRuntime';
import { createTestPosterScene } from './studioPosterTestFixtures';

const pdfMocks = vi.hoisted(() => {
  const addImage = vi.fn();
  const output = vi.fn();
  const constructor = vi.fn(class MockJsPdf {
    addImage = addImage;
    output = output;
  });
  return { addImage, output, constructor };
});

vi.mock('jspdf', () => ({ jsPDF: pdfMocks.constructor }));

const model = posterPreviewAdapter.createPreviewModel({
  definitionId: 'classic-ancestor-poster',
  mode: 'static-mock',
  privacyMode: 'masked',
  language: 'en',
  maxNodes: 7,
});
const portraitScene = createTestPosterScene({ model, language: 'en', title: 'Classic Poster' });
const landscapeScene = createTestPosterScene({
  model,
  language: 'en',
  title: 'Landscape Poster',
  pageSize: 'A3',
  orientation: 'landscape',
});

describe('studioPosterBrowserPdfRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdfMocks.output.mockReturnValue(new Blob(['pdf-data'], { type: 'application/pdf' }));
  });

  it('embeds the Studio PNG on one portrait PDF page with matching dimensions', async () => {
    const renderPng = vi.fn().mockResolvedValue(new Blob(['png-data'], { type: 'image/png' }));
    const runtime = createStudioPosterBrowserPdfRuntime({
      pngRuntime: { renderPng },
    });

    const result = await exportStudioPoster({
      scene: portraitScene,
      format: 'pdf',
    }, runtime);

    expect(result.fileName).toBe('Classic Poster.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(pdfMocks.constructor).toHaveBeenCalledWith(expect.objectContaining({
      orientation: 'portrait',
      unit: 'mm',
      format: [210, 297],
    }));
    expect(pdfMocks.addImage).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'PNG',
      0,
      0,
      210,
      297,
      undefined,
      'FAST'
    );
    expect(pdfMocks.output).toHaveBeenCalledWith('blob');
  });

  it('uses landscape orientation when page width is greater than height', async () => {
    const renderPng = vi.fn().mockResolvedValue(new Blob(['png-data'], { type: 'image/png' }));
    const runtime = createStudioPosterBrowserPdfRuntime({
      pngRuntime: { renderPng },
    });

    await exportStudioPoster({
      scene: landscapeScene,
      format: 'pdf',
    }, runtime);

    expect(pdfMocks.constructor).toHaveBeenCalledWith(expect.objectContaining({
      orientation: 'landscape',
      format: [420, 297],
    }));
  });

  it('rejects invalid intermediate PNG output before creating a PDF', async () => {
    const renderPng = vi.fn().mockResolvedValue(new Blob(['wrong'], { type: 'image/jpeg' }));
    const runtime = createStudioPosterBrowserPdfRuntime({
      pngRuntime: { renderPng },
    });

    await expect(exportStudioPoster({
      scene: portraitScene,
      fileName: 'Invalid Poster',
      format: 'pdf',
    }, runtime)).rejects.toThrow('invalid PNG data');

    expect(pdfMocks.constructor).not.toHaveBeenCalled();
  });
});
