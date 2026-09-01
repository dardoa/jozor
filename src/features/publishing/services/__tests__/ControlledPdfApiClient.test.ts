import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ControlledPdfApiClient } from '../ControlledPdfApiClient';

vi.mock('../../../../services/supabaseClient', () => ({
  getSupabaseSessionAccessToken: vi.fn().mockResolvedValue('session-access-token'),
}));

describe('ControlledPdfApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a Blob on successful PDF generation', async () => {
    const mockBlob = new Blob(['%PDF-1.7\npdf-data'], { type: 'application/pdf' });
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => (key === 'content-type' ? 'application/pdf' : null),
      },
      blob: async () => mockBlob,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await ControlledPdfApiClient.renderManuscriptPdf({
      html: '<html></html>',
      title: 'Test',
      language: 'en',
    });

    expect(result).toBe(mockBlob);
    expect(global.fetch).toHaveBeenCalledWith('/api/publishing/render-manuscript-pdf', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer session-access-token' }),
      body: expect.stringContaining('Content-Security-Policy'),
    }));
  });

  it('throws a safe error when server returns 501', async () => {
    const mockResponse = {
      ok: false,
      status: 501,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await expect(ControlledPdfApiClient.renderManuscriptPdf({
      html: '<html>Sensitive Data</html>',
      title: 'Sensitive Title',
    })).rejects.toThrow('Controlled PDF export is not configured yet.');
  });

  it('throws a safe error when server returns a non-PDF mime type', async () => {
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => (key === 'content-type' ? 'text/html' : null),
      },
      blob: async () => new Blob(['not-pdf'], { type: 'text/html' }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await expect(ControlledPdfApiClient.renderManuscriptPdf({
      html: '<html>Sensitive Data</html>',
      title: 'Sensitive Title',
    })).rejects.toThrow('Controlled PDF renderer returned invalid PDF');
  });

  it('throws a safe error when server returns empty blob', async () => {
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => (key === 'content-type' ? 'application/pdf' : null),
      },
      blob: async () => new Blob([], { type: 'application/pdf' }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await expect(ControlledPdfApiClient.renderManuscriptPdf({
      html: '<html>Sensitive Data</html>',
      title: 'Sensitive Title',
    })).rejects.toThrow('Controlled PDF renderer returned invalid PDF');
  });

  it('throws a safe error when server returns 503', async () => {
    const mockResponse = {
      ok: false,
      status: 503,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await expect(ControlledPdfApiClient.renderManuscriptPdf({
      html: '<html>Sensitive Data</html>',
      title: 'Sensitive Title',
    })).rejects.toThrow('Controlled PDF export is not configured yet.');
  });

  it('throws a safe error when server returns 502', async () => {
    const mockResponse = {
      ok: false,
      status: 502,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await expect(ControlledPdfApiClient.renderManuscriptPdf({
      html: '<html>Sensitive Data</html>',
      title: 'Sensitive Title',
    })).rejects.toThrow('Controlled PDF renderer unavailable');
  });

  it('uses a lightweight authenticated GET for readiness', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    await expect(ControlledPdfApiClient.checkReadiness()).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith('/api/publishing/render-manuscript-pdf', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer session-access-token',
      },
    });
  });

  it('rejects a PDF MIME response without a valid PDF signature', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      blob: async () => new Blob(['not-a-pdf'], { type: 'application/pdf' }),
    }));

    await expect(ControlledPdfApiClient.renderManuscriptPdf({
      html: '<html></html>',
      title: 'Invalid binary',
    })).rejects.toThrow('Controlled PDF renderer returned invalid PDF');
  });
});
