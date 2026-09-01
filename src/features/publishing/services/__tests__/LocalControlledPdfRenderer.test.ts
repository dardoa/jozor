import { describe, expect, it } from 'vitest';
import { LocalControlledPdfRenderer } from '../LocalControlledPdfRenderer';

describe('LocalControlledPdfRenderer', () => {
  it('generates a valid minimal PDF blob with metadata allowlist clean of raw details', async () => {
    const result = await LocalControlledPdfRenderer.renderPdf({
      html: '<html><body>Raw Sensitive Ancestral Content</body></html>',
      title: 'Family Tree Manuscript',
      language: 'ar',
      metadata: {
        templateId: 'classic-book-manuscript',
        treeId: 'tree-999',
        rootPersonId: 'person-secret',
        userRole: 'viewer',
        masked: true,
        scopePersonCount: 15,
        pageEstimate: { unsafe: 'nested' },
        someUnsafeKey: 'raw_val',
      },
    });

    expect(result.mode).toBe('controlled-pdf');
    expect(result.available).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob?.type).toBe('application/pdf');
    expect(result.fileName).toBe('family_tree_manuscript_manuscript.pdf');

    // Verify metadata allowlist rules
    expect(result.requestMetadata).toEqual({
      templateId: 'classic-book-manuscript',
      userRole: 'viewer',
      masked: true,
      scopePersonCount: 15,
    });

    // Enforce that raw personal data and HTML are strictly hidden/excluded from diagnostics metadata
    expect(result.requestMetadata).not.toHaveProperty('html');
    expect(result.requestMetadata).not.toHaveProperty('rootPersonId');
    expect(result.requestMetadata).not.toHaveProperty('treeId');
    expect(result.requestMetadata).not.toHaveProperty('pageEstimate');
    expect(result.requestMetadata).not.toHaveProperty('someUnsafeKey');
  });
});
