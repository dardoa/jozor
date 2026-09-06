import { describe, expect, it } from 'vitest';
import { getLegacyPersonMediaUrl } from '../legacyPersonMediaUrl';
import { getGalleryImageUrl, getPersonPhoto } from '../mediaUtils';

describe('legacy person media URL boundary', () => {
  it.each([
    'https://example.test/photo.jpg',
    'https://project.supabase.co/storage/v1/object/public/avatars/tree/photo.webp?v=2',
    'https://media.example.test/storage/v1/render/image/public/avatars/photo.webp?width=64',
    'https://example.test/storage/v1/object/public/family/photo.jpg',
    'blob:https://jozor.test/local-photo',
    'data:image/png;base64,AAAA',
    '/assets/photo.webp',
  ])('preserves a supported legacy or local image: %s', (url) => {
    expect(getLegacyPersonMediaUrl(url)).toBe(url);
    expect(getPersonPhoto({ photoUrl: url })).toBe(url);
    expect(getGalleryImageUrl(url)).toBe(url);
    expect(getGalleryImageUrl({ url })).toBe(url);
  });

  it.each([
    'https://project.supabase.co/storage/v1/object/private-photo-sentinel',
    'https://project.supabase.co/storage/v1/object/authenticated/person-media/photo.webp',
    'https://project.supabase.co/storage/v1/object/sign/avatars/photo.webp?token=secret',
    'https://project.supabase.co/storage/v1/render/image/authenticated/avatars/photo.webp',
    'https://media.example.test/storage/v1/object/person-media/photo.webp',
    'https://project.supabase.co/storage/v1/object/public/person-media/photo.webp',
    'https://project.supabase.co/storage/v1/%6fbject/authenticated/person-media/photo.webp',
    'https://project.supabase.co/storage/v1/object/public/avatars/../person-media/photo.webp',
    '/storage/v1/object/sign/avatars/photo.webp',
    'https://user:secret@example.test/photo.jpg',
    'https://example.test/photo.jpg?access_token=secret',
    'https://example.test/photo.jpg?%74oken=secret',
    'javascript:alert(1)',
    'file:///private/photo.jpg',
    'data:text/html;base64,AAAA',
    'not a URL',
    'https://example.test/%invalid',
    '',
  ])('rejects the unsafe source before profile or gallery rendering: %s', (url) => {
    expect(getLegacyPersonMediaUrl(url)).toBeNull();
    expect(getPersonPhoto({ photoUrl: url })).toBeNull();
    expect(getGalleryImageUrl(url)).toBeNull();
    expect(getGalleryImageUrl({ url })).toBeNull();
  });
});
