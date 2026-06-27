import type {
  ManuscriptPdfExportRequest,
  ManuscriptPdfExportResult,
} from './ManuscriptPdfExportService';

export class LocalControlledPdfRenderer {
  public static async renderPdf(
    request: ManuscriptPdfExportRequest
  ): Promise<ManuscriptPdfExportResult> {
    try {
      // Enforce strict diagnostics metadata cleanup (allowlist parameters only)
      // Exclude full HTML and personal names to ensure absolute privacy in logs
      const cleanDiagnosticsMetadata: Record<string, unknown> = {};
      if (request.metadata) {
        const allowedKeys = ['templateId', 'treeId', 'userRole', 'masked', 'scopePersonCount', 'pageEstimate'];
        allowedKeys.forEach((key) => {
          const value = request.metadata?.[key];
          if (isSafeDiagnosticValue(value)) {
            cleanDiagnosticsMetadata[key] = value;
          }
        });
      }

      // Dynamic import of jspdf to prevent bundle footprint overhead during initialization
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Simple document layout mapping
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(16);
      doc.text(request.title, 20, 20);

      // In a real PDF path, HTML formatting would be processed here.
      // For the prototype, we compile a valid PDF structure representing the requested metadata
      doc.setFontSize(10);
      doc.text(`Generated document - Language: ${request.language ?? 'en'}`, 20, 35);
      doc.text(`Scope Person Count: ${cleanDiagnosticsMetadata.scopePersonCount ?? 0}`, 20, 45);

      const pdfBlob = doc.output('blob');

      return {
        mode: 'controlled-pdf',
        available: true,
        blob: pdfBlob,
        fileName: `${sanitizeFileName(request.title)}_manuscript.pdf`,
        requestMetadata: cleanDiagnosticsMetadata,
      };
    } catch (error) {
      return {
        mode: 'controlled-pdf',
        available: false,
        fallbackRecommended: true,
        reason: error instanceof Error ? error.message : 'Local PDF generation failed.',
      };
    }
  }
}

function isSafeDiagnosticValue(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  );
}

function sanitizeFileName(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9\u0600-\u06ff_-]+/gi, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'family_manuscript';
}
