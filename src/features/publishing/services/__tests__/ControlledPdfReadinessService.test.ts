import { describe, expect, it, vi } from 'vitest';
import { ControlledPdfReadinessService } from '../ControlledPdfReadinessService';

describe('ControlledPdfReadinessService', () => {
  it('reports controlled-pdf as recommended when local renderer prototype succeeds', async () => {
    const result = await ControlledPdfReadinessService.evaluateReadiness();

    expect(result.available).toBe(true);
    expect(result.recommendedMode).toBe('controlled-pdf');
    expect(result.reasons).toHaveLength(0);

    // Verify diagnostics output structure and values
    expect(result.diagnostics).toEqual({
      renderer: 'local-controlled',
      probe: true,
      mode: 'controlled-pdf',
      availableResult: true,
      outputType: 'application/pdf',
      outputSize: expect.any(Number),
    });

    expect(result.diagnostics.outputSize).toBeGreaterThan(0);

    // Enforce diagnostics privacy cleanup check
    expect(result.diagnostics).not.toHaveProperty('html');
    expect(result.diagnostics).not.toHaveProperty('title');
    expect(result.diagnostics).not.toHaveProperty('rawTitle');
    expect(result.diagnostics).not.toHaveProperty('personName');
  });

  it('executes readiness probes with synthetic non-personal request payloads', async () => {
    const renderer = vi.fn().mockResolvedValue({
      mode: 'controlled-pdf',
      available: true,
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
    });

    await ControlledPdfReadinessService.evaluateReadiness({ renderer });

    expect(renderer).toHaveBeenCalledWith({
      html: '<html><body>Readiness Probe</body></html>',
      title: 'Controlled PDF Readiness Probe',
      language: 'en',
      metadata: {
        templateId: 'readiness-test-template',
        scopePersonCount: 1,
      },
    });
  });

  it('recommends browser-print-fallback when renderer fails', async () => {
    const errorRenderer = vi.fn().mockRejectedValue(new Error('Low memory crash simulation'));
    const result = await ControlledPdfReadinessService.evaluateReadiness({ renderer: errorRenderer });

    expect(result.available).toBe(false);
    expect(result.recommendedMode).toBe('browser-print-fallback');
    expect(result.reasons).toContain('Low memory crash simulation');
  });

  it('recommends browser-print-fallback when renderer outputs invalid MIME type or empty Blob', async () => {
    // 1. Invalid MIME type mock
    const badMimeRenderer = vi.fn().mockResolvedValue({
      mode: 'controlled-pdf',
      available: true,
      blob: new Blob(['hello'], { type: 'text/html' }),
    });

    const mimeResult = await ControlledPdfReadinessService.evaluateReadiness({ renderer: badMimeRenderer });
    expect(mimeResult.available).toBe(false);
    expect(mimeResult.recommendedMode).toBe('browser-print-fallback');
    expect(mimeResult.reasons[0]).toContain('Invalid output MIME type');

    // 2. Empty Blob size 0 mock
    const emptyBlobRenderer = vi.fn().mockResolvedValue({
      mode: 'controlled-pdf',
      available: true,
      blob: new Blob([], { type: 'application/pdf' }),
    });

    const sizeResult = await ControlledPdfReadinessService.evaluateReadiness({ renderer: emptyBlobRenderer });
    expect(sizeResult.available).toBe(false);
    expect(sizeResult.recommendedMode).toBe('browser-print-fallback');
    expect(sizeResult.reasons[0]).toContain('Output PDF blob is empty');
  });
});
