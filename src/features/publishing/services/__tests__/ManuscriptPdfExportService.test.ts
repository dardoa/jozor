import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManuscriptPdfExportService } from '../ManuscriptPdfExportService';

describe('ManuscriptPdfExportService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the browser print fallback with the provided manuscript HTML', async () => {
    const documentOpen = vi.fn();
    const documentWrite = vi.fn();
    const documentClose = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    const setTimeoutMock = vi.fn((callback: () => void) => {
      callback();
      return 1 as unknown as number;
    });

    const printWindow = {
      document: {
        open: documentOpen,
        write: documentWrite,
        close: documentClose,
        title: '',
        fonts: { ready: Promise.resolve() },
      },
      setTimeout: setTimeoutMock,
      focus,
      print,
    } as unknown as Window;

    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow);

    await expect(
      ManuscriptPdfExportService.exportViaBrowserPrintFallback({
        html: '<html><body>Manuscript</body></html>',
        title: 'Family Manuscript',
      })
    ).resolves.toEqual({ mode: 'browser-print-fallback' });

    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'width=1100,height=900');
    expect(documentOpen).toHaveBeenCalledOnce();
    expect(documentWrite).toHaveBeenCalledWith('<html><body>Manuscript</body></html>');
    expect(documentClose).toHaveBeenCalledOnce();
    expect(printWindow.document.title).toBe('Family Manuscript');
    expect(focus).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });

  it('uses the browser print fallback as the current manuscript PDF export mode', async () => {
    const exportSpy = vi
      .spyOn(ManuscriptPdfExportService, 'exportViaBrowserPrintFallback')
      .mockResolvedValue({ mode: 'browser-print-fallback' });

    await expect(
      ManuscriptPdfExportService.exportManuscriptPdf({
        html: '<html><body>Portable manuscript</body></html>',
        title: 'Portable manuscript',
      })
    ).resolves.toEqual({ mode: 'browser-print-fallback' });

    expect(exportSpy).toHaveBeenCalledWith({
      html: '<html><body>Portable manuscript</body></html>',
      title: 'Portable manuscript',
    });
  });

  it('fails clearly when the browser blocks the print window', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    await expect(
      ManuscriptPdfExportService.exportViaBrowserPrintFallback({
        html: '<html></html>',
        title: 'Blocked',
      })
    ).rejects.toThrow(/browser blocked the print window/i);
  });
});
