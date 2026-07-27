import { describe, expect, it, vi } from 'vitest';

import { posterPreviewAdapter } from '../previewAdapterRegistry';
import { exportStudioPoster } from '../studioPosterExportAdapter';
import { createStudioPosterBrowserPngRuntime } from '../studioPosterBrowserPngRuntime';
import { createTestPosterScene } from './studioPosterTestFixtures';

const model = posterPreviewAdapter.createPreviewModel({
  definitionId: 'classic-ancestor-poster',
  mode: 'static-mock',
  privacyMode: 'masked',
  language: 'ar',
  maxNodes: 7,
});
const scene = createTestPosterScene({ model, language: 'ar', title: '\u0634\u062c\u0631\u0629 \u0627\u0644\u0623\u0633\u0644\u0627\u0641' });

function createRuntimeFixture(blob: Blob = new Blob(['png'], { type: 'image/png' })) {
  const drawImage = vi.fn();
  const fillRect = vi.fn();
  const context = { drawImage, fillRect, fillStyle: '' } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
  } as unknown as HTMLCanvasElement;
  const createCanvas = vi.fn(() => canvas);
  const loadSvgImage = vi.fn<(svg: string) => Promise<CanvasImageSource>>(
    async () => ({}) as CanvasImageSource
  );

  return { canvas, createCanvas, loadSvgImage, drawImage, fillRect };
}

describe('studioPosterBrowserPngRuntime', () => {
  it('rasterizes the canonical SVG to a high-resolution PNG canvas', async () => {
    const fixture = createRuntimeFixture();
    const runtime = createStudioPosterBrowserPngRuntime({
      pixelRatio: 3,
      backgroundColor: '#fff',
      createCanvas: fixture.createCanvas,
      loadSvgImage: fixture.loadSvgImage,
    });

    const result = await exportStudioPoster({ scene, format: 'png' }, runtime);

    expect(result.mimeType).toBe('image/png');
    expect(result.renderResult.format).toBe('svg');
    expect(result.renderResult.svg).toContain('data-poster-renderer="svg-v1"');
    expect(fixture.createCanvas).toHaveBeenCalledWith(
      scene.document.sceneSize.width * 3,
      scene.document.sceneSize.height * 3
    );
    expect(fixture.loadSvgImage).toHaveBeenCalledWith(result.renderResult.svg);
    expect(fixture.fillRect).toHaveBeenCalled();
    expect(fixture.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      scene.document.sceneSize.width * 3,
      scene.document.sceneSize.height * 3
    );
  });

  it('normalizes typeless raster blobs to image/png', async () => {
    const fixture = createRuntimeFixture(new Blob(['png']));
    const runtime = createStudioPosterBrowserPngRuntime({
      createCanvas: fixture.createCanvas,
      loadSvgImage: fixture.loadSvgImage,
    });

    const result = await exportStudioPoster({ scene, format: 'png' }, runtime);

    expect(result.blob.type).toBe('image/png');
  });

  it('fails when SVG rasterization cannot acquire a 2D canvas context', async () => {
    const canvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;
    const runtime = createStudioPosterBrowserPngRuntime({
      createCanvas: () => canvas,
      loadSvgImage: async () => ({}) as CanvasImageSource,
    });

    await expect(exportStudioPoster({ scene, format: 'png' }, runtime))
      .rejects.toThrow('requires a 2D canvas context');
  });

  it('does not use an iframe or HTML screenshot renderer', async () => {
    const fixture = createRuntimeFixture();
    const runtime = createStudioPosterBrowserPngRuntime({
      createCanvas: fixture.createCanvas,
      loadSvgImage: fixture.loadSvgImage,
    });

    await exportStudioPoster({ scene, format: 'png' }, runtime);

    expect(document.querySelector('iframe[aria-hidden="true"]')).toBeNull();
    expect(fixture.loadSvgImage.mock.calls[0][0]).not.toContain('<html');
  });
});
