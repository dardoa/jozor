import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ManuscriptPdfExportService } from '../ManuscriptPdfExportService';
import { ControlledPdfFeatureFlag } from '../ControlledPdfFeatureFlag';

describe('ManuscriptPdfExportService', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      originalEnv = import.meta.env.VITE_ENABLE_CONTROLLED_PDF as string;
    }
  });

  afterEach(() => {
    ControlledPdfFeatureFlag.setTestOverrideForTests(null);
    vi.restoreAllMocks();
    if (typeof import.meta !== 'undefined' && import.meta.env && originalEnv !== undefined) {
      vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', originalEnv);
    } else {
      vi.unstubAllEnvs();
    }
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

  it('routes controlled PDF requests through the provided adapter contract', async () => {
    const adapter = vi.fn().mockResolvedValue({
      mode: 'controlled-pdf',
      available: true,
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      fileName: 'Portable manuscript.pdf',
    });

    const request = {
      html: '<html lang="ar"><body>Portable manuscript</body></html>',
      title: 'Portable manuscript',
      language: 'ar',
      metadata: {
        userRole: 'viewer',
        masked: true,
        scopePersonCount: 25,
      },
    };

    await expect(
      ManuscriptPdfExportService.exportManuscriptPdf(request, {
        mode: 'controlled-pdf',
        controlledPdfAdapter: adapter,
      })
    ).resolves.toMatchObject({
      mode: 'controlled-pdf',
      available: true,
      fileName: 'Portable manuscript.pdf',
    });

    expect(adapter).toHaveBeenCalledWith(request);
  });

  it('controlled-pdf defaults to browser-print-fallback mode and reports feature flag disabled when flag is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'false');
    const fallbackSpy = vi
      .spyOn(ManuscriptPdfExportService, 'exportViaBrowserPrintFallback')
      .mockResolvedValue({ mode: 'browser-print-fallback' });

    const request = {
      html: '<html><body>Mock content</body></html>',
      title: 'Default controlled test',
      language: 'en',
      metadata: { masked: true, scopePersonCount: 44 },
    };

    const result = await ManuscriptPdfExportService.exportManuscriptPdf(request, {
      mode: 'controlled-pdf',
    });

    expect(result).toEqual({
      mode: 'browser-print-fallback',
      controlledAttempted: true,
      controlledReason: 'Controlled PDF feature flag disabled',
    });

    expect(fallbackSpy).toHaveBeenCalledWith(request);
  });

  it('controlled-pdf still falls back to browser-print and reports stub unconfigured state when flag is enabled but default adapter remains a stub', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    const fallbackSpy = vi
      .spyOn(ManuscriptPdfExportService, 'exportViaBrowserPrintFallback')
      .mockResolvedValue({ mode: 'browser-print-fallback' });

    const request = {
      html: '<html><body>Mock content</body></html>',
      title: 'Default controlled test',
      language: 'en',
      metadata: { masked: true, scopePersonCount: 44 },
    };

    const result = await ManuscriptPdfExportService.exportManuscriptPdf(request, {
      mode: 'controlled-pdf',
    });

    expect(result).toEqual({
      mode: 'browser-print-fallback',
      controlledAttempted: true,
      controlledReason: 'Controlled PDF export is not configured yet.',
    });

    expect(fallbackSpy).toHaveBeenCalledWith(request);
  });

  it('controlled-pdf returns controlled result and does not trigger browser fallback when adapter is available', async () => {
    const fallbackSpy = vi.spyOn(ManuscriptPdfExportService, 'exportViaBrowserPrintFallback');

    const mockBlob = new Blob(['controlled pdf content'], { type: 'application/pdf' });
    const adapter = vi.fn().mockResolvedValue({
      mode: 'controlled-pdf',
      available: true,
      blob: mockBlob,
      fileName: 'out.pdf',
    });

    const request = {
      html: '<html><body>Rendered</body></html>',
      title: 'Active Adapter Test',
    };

    const result = await ManuscriptPdfExportService.exportManuscriptPdf(request, {
      mode: 'controlled-pdf',
      controlledPdfAdapter: adapter,
    });

    expect(result).toEqual({
      mode: 'controlled-pdf',
      available: true,
      blob: mockBlob,
      fileName: 'out.pdf',
    });

    expect(fallbackSpy).not.toHaveBeenCalled();
  });

  it('controlled-pdf preserves request language and metadata across adapter boundary', async () => {
    const adapter = vi.fn().mockResolvedValue({
      mode: 'controlled-pdf',
      available: true,
      requestMetadata: { masked: true, rootPersonId: 'p1' },
    });

    const request = {
      html: '<html></html>',
      title: 'Boundary Test',
      language: 'ar',
      metadata: { masked: true, rootPersonId: 'p1' },
    };

    await ManuscriptPdfExportService.exportManuscriptPdf(request, {
      mode: 'controlled-pdf',
      controlledPdfAdapter: adapter,
    });

    expect(adapter).toHaveBeenCalledWith(expect.objectContaining({
      language: 'ar',
      metadata: { masked: true, rootPersonId: 'p1' },
    }));
  });

  it('controlled-pdf integrates successfully with LocalControlledPdfRenderer when passed as custom adapter', async () => {
    const fallbackSpy = vi.spyOn(ManuscriptPdfExportService, 'exportViaBrowserPrintFallback');
    const { LocalControlledPdfRenderer } = await import('../LocalControlledPdfRenderer');

    const request = {
      html: '<html><body>Rendered Prototype Document</body></html>',
      title: 'Prototype Report',
      language: 'en',
      metadata: {
        templateId: 'modern-book',
        scopePersonCount: 12,
      },
    };

    const result = await ManuscriptPdfExportService.exportManuscriptPdf(request, {
      mode: 'controlled-pdf',
      controlledPdfAdapter: LocalControlledPdfRenderer.renderPdf,
    });

    expect(result.mode).toBe('controlled-pdf');
    expect(result.available).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.fileName).toBe('prototype_report_manuscript.pdf');
    expect(result.requestMetadata).toEqual({
      templateId: 'modern-book',
      scopePersonCount: 12,
    });

    expect(fallbackSpy).not.toHaveBeenCalled();
  });

  it('uses injected controlled adapter for test-only opt-in smoke path when feature flag override is enabled', async () => {
    ControlledPdfFeatureFlag.setTestOverrideForTests(true);
    const mockBlob = new Blob(['controlled content'], { type: 'application/pdf' });
    const customAdapter = vi.fn().mockResolvedValue({
      mode: 'controlled-pdf',
      available: true,
      blob: mockBlob,
      fileName: 'custom_output.pdf',
    });

    const result = await ManuscriptPdfExportService.exportManuscriptPdf({
      html: '<html></html>',
      title: 'Opt-in Smoke Test',
    }, {
      mode: 'controlled-pdf',
      controlledPdfAdapter: customAdapter,
    });

    expect(result.mode).toBe('controlled-pdf');
    expect(result.available).toBe(true);
    expect(result.blob).toBe(mockBlob);
  });

  it('defaults to browser-print-fallback mode when mode option is omitted completely', async () => {
    const fallbackSpy = vi
      .spyOn(ManuscriptPdfExportService, 'exportViaBrowserPrintFallback')
      .mockResolvedValue({ mode: 'browser-print-fallback' });

    const result = await ManuscriptPdfExportService.exportManuscriptPdf({
      html: '<html></html>',
      title: 'Omitted Mode Test',
    });

    expect(result.mode).toBe('browser-print-fallback');
    expect(fallbackSpy).toHaveBeenCalled();
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
