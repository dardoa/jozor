import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlledManuscriptPdfAdapter } from '../ControlledManuscriptPdfAdapter';
import { ControlledPdfFeatureFlag } from '../ControlledPdfFeatureFlag';

describe('ControlledManuscriptPdfAdapter', () => {
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

  it('reports controlled PDF as disabled when feature flag is disabled', () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'false');
    const status = ControlledManuscriptPdfAdapter.getStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toBe('Controlled PDF feature flag disabled');
  });

  it('reports controlled PDF as unavailable by default when flag is enabled but not configured', () => {
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
  });

  it('echoes request metadata for diagnostics and stays clean of raw data even when flag is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
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
      rootPersonId: 'p1',
      masked: true,
      scopePersonCount: 15,
    });

    // Verify it doesn't leak any raw markup or unintended sensitive details
    expect(result.requestMetadata).not.toHaveProperty('html');
    expect(result.requestMetadata).not.toHaveProperty('title');
    expect(result.requestMetadata).not.toHaveProperty('personName');
    expect(result.requestMetadata).not.toHaveProperty('nested');
  });

  it('strictly sanitizes and filters out unsafe and non-allowlisted keys from diagnostics metadata', async () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
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

  it('default adapter remains an intentional stub and returns unavailable even when feature flag override is enabled', async () => {
    // This asserts the intentional architectural stance that default adapter remains unavailable.
    ControlledPdfFeatureFlag.setTestOverrideForTests(true);
    const status = ControlledManuscriptPdfAdapter.getStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toBe('Controlled PDF export is not configured yet.');

    const result = await ControlledManuscriptPdfAdapter.exportPdf({
      html: '<html></html>',
      title: 'Stub Test',
    });
    expect(result.available).toBe(false);
    expect(result.fallbackRecommended).toBe(true);
    expect(result.reason).toBe('Controlled PDF export is not configured yet.');
  });
});
