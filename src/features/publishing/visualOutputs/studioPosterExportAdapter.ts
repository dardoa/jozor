import type { VisualOutputRenderer } from './visualOutputTypes';
import type {
  StudioPosterSvgRenderRequest,
  StudioPosterSvgRenderResult,
} from './studioPosterSvgRenderer';
import { renderPosterSceneToSvg } from './studioPosterSvgRenderer';

export type StudioPosterExportFormat = Extract<VisualOutputRenderer, 'svg' | 'png' | 'pdf'>;

export interface StudioPosterExportRequest extends StudioPosterSvgRenderRequest {
  readonly format: StudioPosterExportFormat;
  readonly fileName?: string;
}

export interface StudioPosterExportRuntimeRequest {
  readonly renderResult: StudioPosterSvgRenderResult;
  readonly fileName: string;
}

export interface StudioPosterExportRuntime {
  readonly renderPng?: (request: StudioPosterExportRuntimeRequest) => Promise<Blob>;
  readonly renderPdf?: (request: StudioPosterExportRuntimeRequest) => Promise<Blob>;
}

export interface StudioPosterExportResult {
  readonly blob: Blob;
  readonly fileName: string;
  readonly mimeType: 'image/svg+xml' | 'image/png' | 'application/pdf';
  readonly renderResult: StudioPosterSvgRenderResult;
}

const MIME_BY_FORMAT: Record<StudioPosterExportFormat, StudioPosterExportResult['mimeType']> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  pdf: 'application/pdf',
};

function sanitizeFileName(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ');

  return cleaned || 'studio-poster';
}

function buildDefaultFileName(request: StudioPosterExportRequest): string {
  const extension = request.format;
  return `${sanitizeFileName(request.fileName ?? request.scene.content.title)}.${extension}`;
}

function assertValidBlob(blob: Blob, expectedMime: StudioPosterExportResult['mimeType']): void {
  if (!(blob instanceof Blob)) {
    throw new Error('Studio poster export runtime returned an invalid Blob');
  }

  if (blob.size <= 0) {
    throw new Error('Studio poster export runtime returned an empty Blob');
  }

  if (blob.type !== expectedMime) {
    throw new Error(`Studio poster export runtime returned ${blob.type || 'unknown MIME'} instead of ${expectedMime}`);
  }
}

export async function exportStudioPoster(
  request: StudioPosterExportRequest,
  runtime: StudioPosterExportRuntime
): Promise<StudioPosterExportResult> {
  const renderResult = renderPosterSceneToSvg(request);
  const fileName = buildDefaultFileName(request);
  const expectedMime = MIME_BY_FORMAT[request.format];

  if (request.format === 'svg') {
    const blob = new Blob([renderResult.svg], { type: expectedMime });
    assertValidBlob(blob, expectedMime);
    return { blob, fileName, mimeType: expectedMime, renderResult };
  }

  const render =
    request.format === 'png'
      ? runtime.renderPng
      : runtime.renderPdf;

  if (!render) {
    throw new Error(`Studio poster ${request.format.toUpperCase()} export runtime is not configured`);
  }

  const blob = await render({ renderResult, fileName });
  assertValidBlob(blob, expectedMime);

  return {
    blob,
    fileName,
    mimeType: expectedMime,
    renderResult,
  };
}
