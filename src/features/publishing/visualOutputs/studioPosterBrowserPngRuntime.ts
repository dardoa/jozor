import type {
  StudioPosterExportRuntime,
  StudioPosterExportRuntimeRequest,
} from './studioPosterExportAdapter';

type PosterSvgImageLoader = (svg: string) => Promise<CanvasImageSource>;

export interface StudioPosterBrowserPngRuntimeOptions {
  readonly pixelRatio?: number;
  readonly backgroundColor?: string;
  /** Test seam and future OffscreenCanvas/image-decoder integration point. */
  readonly loadSvgImage?: PosterSvgImageLoader;
  readonly createCanvas?: (width: number, height: number) => HTMLCanvasElement;
}

function ensureBrowserDocument(): Document {
  if (typeof document === 'undefined') {
    throw new Error('Studio poster browser PNG runtime requires a browser document');
  }
  return document;
}

async function loadSvgImageInBrowser(svg: string): Promise<CanvasImageSource> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'sync';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Studio poster SVG could not be decoded for PNG export'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function createBrowserCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = ensureBrowserDocument().createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Studio poster SVG rasterization returned no PNG data'));
        return;
      }
      resolve(blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' }));
    }, 'image/png');
  });
}

async function renderPng(
  request: StudioPosterExportRuntimeRequest,
  options: StudioPosterBrowserPngRuntimeOptions = {}
): Promise<Blob> {
  const pixelRatio = Math.max(1, options.pixelRatio ?? 2);
  const { width, height } = request.renderResult.metadata;
  const outputWidth = Math.max(1, Math.round(width * pixelRatio));
  const outputHeight = Math.max(1, Math.round(height * pixelRatio));
  const createCanvas = options.createCanvas ?? createBrowserCanvas;
  const loadSvgImage = options.loadSvgImage ?? loadSvgImageInBrowser;
  const canvas = createCanvas(outputWidth, outputHeight);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Studio poster SVG rasterization requires a 2D canvas context');
  }

  const image = await loadSvgImage(request.renderResult.svg);
  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, outputWidth, outputHeight);
  }
  context.drawImage(image, 0, 0, outputWidth, outputHeight);

  return canvasToPngBlob(canvas);
}

export function createStudioPosterBrowserPngRuntime(
  options: StudioPosterBrowserPngRuntimeOptions = {}
): StudioPosterExportRuntime {
  return {
    renderPng: (request) => renderPng(request, options),
  };
}
