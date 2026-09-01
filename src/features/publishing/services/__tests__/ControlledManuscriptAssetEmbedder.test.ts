import { describe, expect, it, vi } from 'vitest';

import { embedControlledManuscriptAssets } from '../ControlledManuscriptAssetEmbedder';

const FONT_BYTES = new Uint8Array([0, 1, 0, 0, 10, 20]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);

describe('ControlledManuscriptAssetEmbedder', () => {
  it('embeds the Arabic font and profile image without preserving storage URLs', async () => {
    const loadBytes = vi.fn(async (source: string) => (
      source.includes('Amiri') ? FONT_BYTES : PNG_BYTES
    ));
    const result = await embedControlledManuscriptAssets(`<!doctype html><html><head><style>
      @font-face { font-family: JozorArabic; src: url("/fonts/Amiri-Regular.ttf"); }
    </style></head><body><img class="person-card__photo" src="https://storage.example.test/private/photo.png"></body></html>`, {
      loadBytes,
    });

    expect(result.fontEmbedded).toBe(true);
    expect(result.embeddedImageCount).toBe(1);
    expect(result.omittedImageCount).toBe(0);
    expect(result.html).toContain('data:font/ttf;base64,');
    expect(result.html).toContain('data:image/png;base64,');
    expect(result.html).not.toContain('storage.example.test');
    expect(result.html).toContain('Content-Security-Policy');
  });

  it('removes failed images and executable elements as a safe fallback', async () => {
    const result = await embedControlledManuscriptAssets(`<!doctype html><html><head></head><body>
      <script>alert(1)</script><img src="https://storage.example.test/missing.jpg" onerror="alert(2)">
    </body></html>`, {
      loadBytes: vi.fn().mockRejectedValue(new Error('load failed')),
    });

    expect(result.embeddedImageCount).toBe(0);
    expect(result.omittedImageCount).toBe(1);
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('onerror');
    expect(result.html).not.toContain('storage.example.test');
  });
});
