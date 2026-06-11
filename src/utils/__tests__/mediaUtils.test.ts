import { describe, expect, it } from 'vitest';
import { getPersonPhoto, getGalleryImageUrl } from '../mediaUtils';
import { supabaseUrl } from '../../services/supabaseConfig';
import { Person } from '../../types';

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
  });
});
