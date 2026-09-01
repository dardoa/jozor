import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlledManuscriptPdfAdapter } from '../ControlledManuscriptPdfAdapter';
import { ControlledPdfFeatureFlag } from '../ControlledPdfFeatureFlag';
import { ControlledPdfApiClient } from '../ControlledPdfApiClient';

vi.mock('../ControlledPdfApiClient', () => ({
  ControlledPdfApiClient: {
    renderManuscriptPdf: vi.fn(),
  },
}));

describe('ControlledManuscriptPdfAdapter', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('reports controlled PDF as disabled in getStatus when feature flag is disabled', () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'false');
    const status = ControlledManuscriptPdfAdapter.getStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toBe('Controlled PDF feature flag disabled');
  });

  it('reports controlled PDF as unavailable by default in getStatus when flag is enabled but not configured', () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    const status = ControlledManuscriptPdfAdapter.getStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toContain('not configured yet');
  });

  it('returns fallback recommendation when flag is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'false');
    const result = await ControlledManuscriptPdfAdapter.exportPdf({
      html: '<html><body>Test Output</body></html>',
      title: 'Diagnostics Test',
    });

    expect(result.mode).toBe('controlled-pdf');
    expect(result.available).toBe(false);
    expect(result.fallbackRecommended).toBe(true);
    expect(result.reason).toBe('Controlled PDF feature flag disabled');
    expect(ControlledPdfApiClient.renderManuscriptPdf).not.toHaveBeenCalled();
  });

  it('calls API client and returns success when feature flag is enabled and API succeeds', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    vi.mocked(ControlledPdfApiClient.renderManuscriptPdf).mockResolvedValue(mockBlob);

    const result = await ControlledManuscriptPdfAdapter.exportPdf({
      html: '<html></html>',
      title: 'Success Test',
    });

    expect(result.mode).toBe('controlled-pdf');
    expect(result.available).toBe(true);
    expect(result.blob).toBe(mockBlob);
    expect(result.fileName).toBe('success_test_manuscript.pdf');
    expect(ControlledPdfApiClient.renderManuscriptPdf).toHaveBeenCalled();
  });

  it('returns fallback recommendation when feature flag is enabled but API fails', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    vi.mocked(ControlledPdfApiClient.renderManuscriptPdf).mockRejectedValue(new Error('Controlled PDF renderer unavailable'));

    const result = await ControlledManuscriptPdfAdapter.exportPdf({
      html: '<html></html>',
      title: 'Failure Test',
    });

    expect(result.mode).toBe('controlled-pdf');
    expect(result.available).toBe(false);
    expect(result.fallbackRecommended).toBe(true);
    expect(result.reason).toBe('Controlled PDF renderer unavailable');
    expect(ControlledPdfApiClient.renderManuscriptPdf).toHaveBeenCalled();
  });

  it('echoes request metadata for diagnostics and stays clean of raw data even when flag is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    vi.mocked(ControlledPdfApiClient.renderManuscriptPdf).mockResolvedValue(mockBlob);

    const result = await ControlledManuscriptPdfAdapter.exportPdf({
      html: '<html><body>Sensitive Tree Data</body></html>',
      title: 'Safe Output',
      language: 'ar',
      metadata: {
        templateId: 'classic-book-manuscript',
        rootPersonId: 'p1',
        masked: true,
        scopePersonCount: 15,
        personName: 'Sensitive Person',
        html: '<body>raw</body>',
        nested: { unsafe: true },
      },
    });

    expect(result.requestMetadata).toEqual({
      templateId: 'classic-book-manuscript',
      masked: true,
      scopePersonCount: 15,
    });
    expect(result.requestMetadata).not.toHaveProperty('rootPersonId');

    // Verify it doesn't leak any raw markup or unintended sensitive details
    expect(result.requestMetadata).not.toHaveProperty('html');
    expect(result.requestMetadata).not.toHaveProperty('title');
    expect(result.requestMetadata).not.toHaveProperty('personName');
    expect(result.requestMetadata).not.toHaveProperty('nested');
  });

  it('strictly sanitizes and filters out unsafe and non-allowlisted keys from diagnostics metadata', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    vi.mocked(ControlledPdfApiClient.renderManuscriptPdf).mockResolvedValue(mockBlob);

    const result = await ControlledManuscriptPdfAdapter.exportPdf({
      html: '<p>Private Person</p>',
      title: 'Private Family',
      metadata: {
        html: '<p>Private Person</p>',
        personName: 'Private Person',
        rawTitle: 'Private Family',
        scopePersonCount: 12,
        unallowlisted: 'leak',
      },
    });

    expect(result.requestMetadata).toEqual({
      scopePersonCount: 12,
    });
    expect(result.requestMetadata).not.toHaveProperty('html');
    expect(result.requestMetadata).not.toHaveProperty('personName');
    expect(result.requestMetadata).not.toHaveProperty('rawTitle');
    expect(result.requestMetadata).not.toHaveProperty('unallowlisted');
  });
});
