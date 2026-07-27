import type {
  StudioPosterExportRuntime,
  StudioPosterExportRuntimeRequest,
} from './studioPosterExportAdapter';
import {
  createStudioPosterBrowserPngRuntime,
  type StudioPosterBrowserPngRuntimeOptions,
} from './studioPosterBrowserPngRuntime';

export interface StudioPosterBrowserPdfRuntimeOptions extends StudioPosterBrowserPngRuntimeOptions {
  readonly pngRuntime?: StudioPosterExportRuntime;
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read Studio poster PNG data'));
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('Studio poster PNG data could not be converted to bytes'));
        return;
      }

      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(blob);
  });
}

async function renderPdf(
  request: StudioPosterExportRuntimeRequest,
  options: StudioPosterBrowserPdfRuntimeOptions
): Promise<Blob> {
  const pngRuntime = options.pngRuntime ?? createStudioPosterBrowserPngRuntime(options);
  if (!pngRuntime.renderPng) {
    throw new Error('Studio poster PDF runtime requires a PNG renderer');
  }

  const pngBlob = await pngRuntime.renderPng(request);
  if (!(pngBlob instanceof Blob) || pngBlob.size <= 0 || pngBlob.type !== 'image/png') {
    throw new Error('Studio poster PDF runtime received invalid PNG data');
  }

  const { width: pageWidthMm, height: pageHeightMm } = request.renderResult.scene.document.physicalSizeMm;
  const orientation = pageWidthMm > pageHeightMm ? 'landscape' : 'portrait';
  const pngBytes = await readBlobBytes(pngBlob);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
    compress: true,
  });

  pdf.addImage(pngBytes, 'PNG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
  const output = pdf.output('blob');

  if (!(output instanceof Blob) || output.size <= 0) {
    throw new Error('Studio poster PDF runtime returned no PDF data');
  }

  return output.type === 'application/pdf'
    ? output
    : new Blob([output], { type: 'application/pdf' });
}

export function createStudioPosterBrowserPdfRuntime(
  options: StudioPosterBrowserPdfRuntimeOptions
): StudioPosterExportRuntime {
  return {
    renderPdf: (request) => renderPdf(request, options),
  };
}
