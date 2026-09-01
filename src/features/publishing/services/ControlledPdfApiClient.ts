import type { ManuscriptPdfExportRequest } from './ManuscriptPdfExportService';
import { getSupabaseSessionAccessToken } from '../../../services/supabaseClient';
import { embedControlledManuscriptAssets } from './ControlledManuscriptAssetEmbedder';

const MAX_CONTROLLED_HTML_BYTES = 3_800_000;

async function getAuthorizationHeader(): Promise<string> {
  const accessToken = await getSupabaseSessionAccessToken();
  if (!accessToken) throw new Error('Controlled PDF renderer requires an authenticated session');
  return `Bearer ${accessToken}`;
}

async function parseSafeResponseError(response: Response): Promise<Error> {
  if (response.status === 503 || response.status === 501) {
    return new Error('Controlled PDF export is not configured yet.');
  }
  if (response.status === 401) {
    return new Error('Controlled PDF renderer requires an authenticated session');
  }
  if (response.status === 413) {
    return new Error('Controlled PDF manuscript exceeds the safe export size limit');
  }
  return new Error('Controlled PDF renderer unavailable');
}

async function hasPdfSignature(blob: Blob): Promise<boolean> {
  const header = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('PDF header could not be read'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob.slice(0, 5));
  });
  return new TextDecoder().decode(header) === '%PDF-';
}

export class ControlledPdfApiClient {
  public static async checkReadiness(): Promise<void> {
    const response = await fetch('/api/publishing/render-manuscript-pdf', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: await getAuthorizationHeader(),
      },
    });
    if (!response.ok) throw await parseSafeResponseError(response);
  }

  public static async renderManuscriptPdf(request: ManuscriptPdfExportRequest): Promise<Blob> {
    try {
      const prepared = await embedControlledManuscriptAssets(request.html);
      if (new TextEncoder().encode(prepared.html).byteLength > MAX_CONTROLLED_HTML_BYTES) {
        throw new Error('Controlled PDF manuscript exceeds the safe export size limit');
      }
      const response = await fetch('/api/publishing/render-manuscript-pdf', {
        method: 'POST',
        headers: {
          Accept: 'application/pdf',
          Authorization: await getAuthorizationHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: prepared.html,
          title: request.title,
          language: request.language,
        }),
      });

      if (!response.ok) {
        throw await parseSafeResponseError(response);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        throw new Error('Controlled PDF renderer returned invalid PDF');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Controlled PDF renderer returned invalid PDF');
      }
      if (!(await hasPdfSignature(blob))) {
        throw new Error('Controlled PDF renderer returned invalid PDF');
      }

      return blob;
    } catch (error) {
      // Prevent leaking raw HTML or sensitive request parameters in thrown errors
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('Controlled PDF export is not configured yet.')) {
        throw new Error('Controlled PDF export is not configured yet.');
      }
      if (msg.includes('Controlled PDF renderer returned invalid PDF')) {
        throw new Error('Controlled PDF renderer returned invalid PDF');
      }
      if (msg.includes('authenticated session')) {
        throw new Error('Controlled PDF renderer requires an authenticated session');
      }
      if (msg.includes('safe export size limit')) {
        throw new Error('Controlled PDF manuscript exceeds the safe export size limit');
      }
      throw new Error('Controlled PDF renderer unavailable');
    }
  }
}
