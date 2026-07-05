import type { ManuscriptPdfExportRequest } from './ManuscriptPdfExportService';

export class ControlledPdfApiClient {
  public static async renderManuscriptPdf(request: ManuscriptPdfExportRequest): Promise<Blob> {
    try {
      const response = await fetch('/api/publishing/render-manuscript-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: request.html,
          title: request.title,
          language: request.language,
          metadata: request.metadata,
        }),
      });

      if (!response.ok) {
        if (response.status === 501) {
          throw new Error('Controlled PDF export is not configured yet.');
        }
        throw new Error(`Server returned status ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        throw new Error('Controlled PDF renderer returned invalid PDF');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
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
      throw new Error('Controlled PDF renderer unavailable');
    }
  }
}
