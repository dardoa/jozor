import { describe, expect, it } from 'vitest';
import {
  getGalleryImageAsset,
  getGalleryImageUrl,
  getPersonPhoto,
  getPersonPhotoAsset,
  hasPersonPhoto,
} from '../mediaUtils';
import { supabaseUrl } from '../../services/supabaseConfig';
import { createPersonMediaAssetRef, Person } from '../../types';

const privatePhotoAsset = createPersonMediaAssetRef({
  treeId: 'tree-1',
  assetId: '123e4567-e89b-42d3-a456-426614174000',
  kind: 'profile-photo',
  mimeType: 'image/webp',
  byteLength: 512,
  createdAt: '2026-09-05T00:00:00.000Z',
});

describe('mediaUtils', () => {
  describe('getPersonPhoto', () => {
    it('returns null for null, undefined, or empty person', () => {
      expect(getPersonPhoto(null)).toBeNull();
      expect(getPersonPhoto(undefined)).toBeNull();
      expect(getPersonPhoto({})).toBeNull();
    });

    it('resolves storage URLs correctly when photoPath is provided', () => {
      // With avatars/ prefix
      expect(getPersonPhoto({ photoPath: 'avatars/user-pic.png' } as Person)).toBe(
        `${supabaseUrl}/storage/v1/object/public/avatars/user-pic.png`
      );
      // Without avatars/ prefix
      expect(getPersonPhoto({ photoPath: 'user-pic.png' } as Person)).toBe(
        `${supabaseUrl}/storage/v1/object/public/avatars/user-pic.png`
      );
    });

    it('appends photoVersion to the URL if provided', () => {
      expect(getPersonPhoto({ photoPath: 'user-pic.png', photoVersion: 5 } as Person)).toBe(
        `${supabaseUrl}/storage/v1/object/public/avatars/user-pic.png?v=5`
      );
    });

    it('falls back to photoUrl if photoPath is not present', () => {
      expect(getPersonPhoto({ photoUrl: 'https://example.com/external.jpg' } as Person)).toBe(
        'https://example.com/external.jpg'
      );
      expect(getPersonPhoto({ photoPath: '', photoUrl: 'https://example.com/external.jpg' } as Person)).toBe(
        'https://example.com/external.jpg'
      );
    });

    it('returns null if both photoPath and photoUrl are missing or empty', () => {
      expect(getPersonPhoto({ photoPath: '', photoUrl: '' } as Person)).toBeNull();
    });

    it('never converts a canonical private asset into a public URL', () => {
      const person = {
        photoAsset: privatePhotoAsset,
        photoPath: 'tree-1/person-1.webp',
        photoUrl: 'https://legacy.example/person-1.webp',
      } as Person;

      expect(getPersonPhoto(person)).toBeNull();
      expect(getPersonPhotoAsset(person)).toEqual(privatePhotoAsset);
      expect(hasPersonPhoto(person)).toBe(true);
    });
  });

  describe('getGalleryImageUrl', () => {
    it('returns null for null, undefined, or empty items', () => {
      expect(getGalleryImageUrl(null)).toBeNull();
      expect(getGalleryImageUrl(undefined)).toBeNull();
    });

    it('returns the string directly if input is a string', () => {
      expect(getGalleryImageUrl('https://example.com/gallery.jpg')).toBe(
        'https://example.com/gallery.jpg'
      );
      expect(getGalleryImageUrl('')).toBeNull(); // empty string is falsy -> returns null
    });

    it('resolves url field from GalleryImageItem if present and not empty', () => {
      expect(getGalleryImageUrl({ url: 'https://example.com/item.jpg' })).toBe(
        'https://example.com/item.jpg'
      );
      expect(getGalleryImageUrl({ url: '   ' })).toBeNull();
      expect(getGalleryImageUrl({ url: '' })).toBeNull();
    });

    it('resolves path field from GalleryImageItem if no url is present', () => {
      expect(getGalleryImageUrl({ path: 'avatars/photo.jpg' })).toBe(
        `${supabaseUrl}/storage/v1/object/public/avatars/photo.jpg`
      );
      expect(getGalleryImageUrl({ path: 'photo.jpg' })).toBe(
        `${supabaseUrl}/storage/v1/object/public/avatars/photo.jpg`
      );
    });

    it('appends version to path-based URL if provided', () => {
      expect(getGalleryImageUrl({ path: 'photo.jpg', version: 42 })).toBe(
        `${supabaseUrl}/storage/v1/object/public/avatars/photo.jpg?v=42`
      );
    });

    it('returns null if neither url nor path are valid in GalleryImageItem', () => {
      expect(getGalleryImageUrl({})).toBeNull();
      expect(getGalleryImageUrl({ url: '', path: '' })).toBeNull();
      expect(getGalleryImageUrl({ url: '  ', path: '   ' })).toBeNull();
    });

    it('prefers a canonical private gallery asset over stale legacy fields', () => {
      const galleryAsset = createPersonMediaAssetRef({
        treeId: 'tree-1',
        assetId: '223e4567-e89b-42d3-a456-426614174000',
        kind: 'gallery-photo',
        mimeType: 'image/webp',
        byteLength: 768,
        createdAt: '2026-09-05T00:00:00.000Z',
      });
      const item = {
        asset: galleryAsset,
        url: 'https://legacy.example/gallery.webp',
        path: 'tree-1/person-1/gallery.webp',
      };

      expect(getGalleryImageUrl(item)).toBeNull();
      expect(getGalleryImageAsset(item)).toEqual(galleryAsset);
    });
  });
});
