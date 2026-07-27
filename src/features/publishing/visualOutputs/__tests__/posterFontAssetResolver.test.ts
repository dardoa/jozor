import { describe, expect, it, vi } from 'vitest';

import {
  createPosterFontAssetResolver,
  getPosterSvgFontResources,
} from '../posterFontAssetResolver';

const VALID_TTF_BYTES = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x41, 0x42, 0x43, 0x44]);

describe('posterFontAssetResolver', () => {
  it('converts the bundled TrueType asset to an embedded SVG font resource', async () => {
    const loadBytes = vi.fn(async () => VALID_TTF_BYTES);
    const resolver = createPosterFontAssetResolver({ loadBytes });
    const asset = await resolver.resolveArabicFont();

    expect(loadBytes).toHaveBeenCalledWith('/fonts/Amiri-Regular.ttf');
    expect(asset.id).toBe('amiri');
    expect(asset.familyName).toBe('JozorPosterArabic');
    expect(asset.format).toBe('truetype');
    expect(asset.source).toBe('bundled');
    expect(asset.byteLength).toBe(VALID_TTF_BYTES.byteLength);
    expect(asset.dataUri).toBe('data:font/ttf;base64,AAEAAEFCQ0Q=');
    expect(getPosterSvgFontResources(asset)).toEqual({
      embeddedArabicFontDataUri: asset.dataUri,
      embeddedArabicFontFormat: 'truetype',
      embeddedArabicFontFamily: 'amiri',
    });
  });

  it('resolves and caches each bundled Arabic font family independently', async () => {
    const loadBytes = vi.fn(async () => VALID_TTF_BYTES);
    const resolver = createPosterFontAssetResolver({ loadBytes });

    const sans = await resolver.resolveArabicFont('noto-sans-arabic');
    const kufi = await resolver.resolveArabicFont('noto-kufi-arabic');
    const sansAgain = await resolver.resolveArabicFont('noto-sans-arabic');

    expect(loadBytes).toHaveBeenNthCalledWith(1, '/fonts/NotoSansArabic-Variable.ttf');
    expect(loadBytes).toHaveBeenNthCalledWith(2, '/fonts/NotoKufiArabic-Variable.ttf');
    expect(sans.id).toBe('noto-sans-arabic');
    expect(kufi.id).toBe('noto-kufi-arabic');
    expect(sansAgain).toBe(sans);
    expect(loadBytes).toHaveBeenCalledTimes(2);
  });

  it('caches the resolved asset for preview and derived export formats', async () => {
    const loadBytes = vi.fn(async () => VALID_TTF_BYTES);
    const resolver = createPosterFontAssetResolver({ loadBytes });

    const [first, second] = await Promise.all([
      resolver.resolveArabicFont(),
      resolver.resolveArabicFont(),
    ]);

    expect(first).toBe(second);
    expect(loadBytes).toHaveBeenCalledTimes(1);
  });

  it('rejects empty, oversized, and invalid font payloads', async () => {
    await expect(createPosterFontAssetResolver({
      loadBytes: async () => new Uint8Array(),
    }).resolveArabicFont()).rejects.toThrow('empty');

    await expect(createPosterFontAssetResolver({
      maxBytes: 4,
      loadBytes: async () => VALID_TTF_BYTES,
    }).resolveArabicFont()).rejects.toThrow('size limit');

    await expect(createPosterFontAssetResolver({
      loadBytes: async () => new Uint8Array([0x4f, 0x54, 0x54, 0x4f]),
    }).resolveArabicFont()).rejects.toThrow('valid TrueType');
  });

  it('rejects external, protocol-relative, traversal, and file-system paths', () => {
    const loadBytes = async () => VALID_TTF_BYTES;

    expect(() => createPosterFontAssetResolver({ assetPath: 'https://fonts.example/amiri.ttf', loadBytes })).toThrow('bundled');
    expect(() => createPosterFontAssetResolver({ assetPath: '//fonts.example/amiri.ttf', loadBytes })).toThrow('bundled');
    expect(() => createPosterFontAssetResolver({ assetPath: '/../private/amiri.ttf', loadBytes })).toThrow('bundled');
    expect(() => createPosterFontAssetResolver({ assetPath: 'C:\\fonts\\amiri.ttf', loadBytes })).toThrow('bundled');
  });
});
