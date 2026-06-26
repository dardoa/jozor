export interface ManuscriptPdfExportRequest {
  readonly html: string;
  readonly title: string;
}

export interface ManuscriptPdfExportResult {
  readonly mode: 'browser-print-fallback';
}

export class ManuscriptPdfExportService {
  /**
   * Transitional manuscript PDF path.
   *
   * ADR-009 keeps this route as a preview/beta fallback until a controlled
   * Headless Chromium PDF renderer is available.
   */
  public static async exportViaBrowserPrintFallback(
    request: ManuscriptPdfExportRequest
  ): Promise<ManuscriptPdfExportResult> {
    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      throw new Error('The browser blocked the print window. Please allow popups and try again.');
    }

    printWindow.document.open();
    printWindow.document.write(request.html);
    printWindow.document.close();
    printWindow.document.title = request.title;

    await waitForPrintWindowReady(printWindow);
    printWindow.focus();
    printWindow.print();

    return { mode: 'browser-print-fallback' };
  }
}

async function waitForPrintWindowReady(printWindow: Window): Promise<void> {
  await new Promise<void>((resolve) => printWindow.setTimeout(resolve, 150));
  const fonts = printWindow.document.fonts;
  if (!fonts?.ready) return;

  await Promise.race([
    fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => printWindow.setTimeout(resolve, 1800)),
  ]);
}
