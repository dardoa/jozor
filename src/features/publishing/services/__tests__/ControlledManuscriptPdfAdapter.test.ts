import { describe, expect, it } from 'vitest';
import { ControlledManuscriptPdfAdapter } from '../ControlledManuscriptPdfAdapter';

describe('ControlledManuscriptPdfAdapter', () => {
  it('reports controlled PDF as unavailable by default', () => {
    const status = ControlledManuscriptPdfAdapter.getStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toContain('not configured yet');
  });

  it('returns fallback recommendation without opening browser print', async () => {
    const result = await ControlledManuscriptPdfAdapter.exportPdf({
      html: '<html><body>Test Output</body></html>',
      title: 'Diagnostics Test',
    });

    expect(result.mode).toBe('controlled-pdf');
    expect(result.available).toBe(false);
    expect(result.fallbackRecommended).toBe(true);
    expect(result.blob).toBeUndefined();
    expect(result.fileName).toBeUndefined();
  });

  it('echoes request metadata for diagnostics and stays clean of raw data', async () => {
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
});
