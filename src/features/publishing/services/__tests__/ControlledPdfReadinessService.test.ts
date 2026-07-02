import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlledPdfReadinessService } from '../ControlledPdfReadinessService';
import { ControlledPdfFeatureFlag } from '../ControlledPdfFeatureFlag';

describe('ControlledPdfReadinessService', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      originalEnv = import.meta.env.VITE_ENABLE_CONTROLLED_PDF as string;
    }
  });

  afterEach(() => {
    ControlledPdfFeatureFlag.setTestOverrideForTests(null);
    if (typeof import.meta !== 'undefined' && import.meta.env && originalEnv !== undefined) {
      vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', originalEnv);
    } else {
      vi.unstubAllEnvs();
    }
  });

  it('reports fallback and available false when flag is disabled even if renderer works', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'false');
    const result = await ControlledPdfReadinessService.evaluateReadiness();

    expect(result.available).toBe(false);
    expect(result.recommendedMode).toBe('browser-print-fallback');
    expect(result.reasons).toContain('Controlled PDF feature flag disabled');
  });

  it('reports controlled-pdf as recommended when feature flag override is enabled and local renderer succeeds', async () => {
    ControlledPdfFeatureFlag.setTestOverrideForTests(true);
    const result = await ControlledPdfReadinessService.evaluateReadiness();

    expect(result.available).toBe(true);
    expect(result.recommendedMode).toBe('controlled-pdf');
    expect(result.reasons).toHaveLength(0);
    expect(result.diagnostics.featureFlagEnabled).toBe(true);
  });

  it('reports controlled-pdf as recommended when flag is enabled and local renderer prototype succeeds', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
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
      featureFlagEnabled: true,
    });

    expect(result.diagnostics.outputSize).toBeGreaterThan(0);

    // Enforce diagnostics privacy cleanup check
    expect(result.diagnostics).not.toHaveProperty('html');
    expect(result.diagnostics).not.toHaveProperty('title');
    expect(result.diagnostics).not.toHaveProperty('rawTitle');
    expect(result.diagnostics).not.toHaveProperty('personName');
  });

  it('executes readiness probes with synthetic non-personal request payloads', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
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

  it('recommends browser-print-fallback when renderer fails even if flag is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    const errorRenderer = vi.fn().mockRejectedValue(new Error('Low memory crash simulation'));
    const result = await ControlledPdfReadinessService.evaluateReadiness({ renderer: errorRenderer });

    expect(result.available).toBe(false);
    expect(result.recommendedMode).toBe('browser-print-fallback');
    expect(result.reasons).toContain('Low memory crash simulation');
  });

  it('recommends browser-print-fallback when renderer outputs invalid MIME type or empty Blob', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
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
