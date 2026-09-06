import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createPersonMediaAssetRef, type Person } from '../../../types';
import { SmartAvatar } from '../SmartAvatar';
import { useCachedImage } from '../../../hooks/utils/useCachedImage';

const { usePersonMediaAssetUrlMock } = vi.hoisted(() => ({
  usePersonMediaAssetUrlMock: vi.fn(),
}));

vi.mock('../../../hooks/utils/useCachedImage', () => ({
  useCachedImage: vi.fn().mockImplementation(() => ({
    cachedUrl: null,
    isLoading: false,
    error: null,
  })),
}));

vi.mock('../../../hooks/utils/usePersonMediaAssetUrls', () => ({
  usePersonMediaAssetUrl: usePersonMediaAssetUrlMock,
}));

const basePerson: Pick<Person, 'id' | 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'photoUrl' | 'photoAsset' | 'parents' | 'children' | 'spouses'> = {
  id: 'person-123',
  firstName: 'Noura',
  lastName: 'Jozor',
  gender: 'female',
  birthDate: '1984-05-01',
  parents: [],
  children: [],
  spouses: [],
};

describe('SmartAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePersonMediaAssetUrlMock.mockReturnValue(null);
    vi.mocked(useCachedImage).mockImplementation(() => ({
      cachedUrl: null,
      isLoading: false,
      error: null,
    }));
  });

  it('renders the person image first and falls back to the deterministic SVG on load error', () => {
    render(<SmartAvatar person={{ ...basePerson, photoUrl: 'https://example.com/avatar.jpg' }} size={48} className="rounded-full" />);

    const image = screen.getByRole('img', { name: 'Noura Jozor' });
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');

    fireEvent.error(image);

    expect(screen.getByRole('img', { name: 'Noura Jozor' })).toHaveAttribute('data-age-band', 'adult');
  });

  it('uses the same deterministic background for the same person id', () => {
    const { rerender } = render(<SmartAvatar person={basePerson} size={40} />);
    const firstBackground = screen.getByRole('img', { name: 'Noura Jozor' }).getAttribute('style');

    rerender(<SmartAvatar person={{ ...basePerson, firstName: 'Changed' }} size={40} />);

    expect(screen.getByRole('img', { name: 'Changed Jozor' }).getAttribute('style')).toBe(firstBackground);
  });

  it('resets failure state when photoUrl changes after an image load error', () => {
    const { rerender } = render(<SmartAvatar person={{ ...basePerson, photoUrl: 'https://example.com/avatar1.jpg' }} size={48} />);

    const image1 = screen.getByRole('img', { name: 'Noura Jozor' });
    expect(image1).toHaveAttribute('src', 'https://example.com/avatar1.jpg');

    // Fail the first image
    fireEvent.error(image1);

    // Fallback is rendered
    expect(screen.getByRole('img', { name: 'Noura Jozor' })).toHaveAttribute('data-age-band', 'adult');

    // Change photoUrl
    rerender(<SmartAvatar person={{ ...basePerson, photoUrl: 'https://example.com/avatar2.jpg' }} size={48} />);

    // New image should be rendered
    const image2 = screen.getByRole('img', { name: 'Noura Jozor' });
    expect(image2).toHaveAttribute('src', 'https://example.com/avatar2.jpg');
  });

  it('renders local cached URL when resolved by useCachedImage hook', () => {
    vi.mocked(useCachedImage).mockReturnValue({
      cachedUrl: 'blob:cached-url-xyz',
      isLoading: false,
      error: null,
    });

    render(<SmartAvatar person={{ ...basePerson, photoUrl: 'https://example.com/original.jpg' }} size={48} />);
    const image = screen.getByRole('img', { name: 'Noura Jozor' });
    expect(image).toHaveAttribute('src', 'blob:cached-url-xyz');
  });

  it('renders private media through a blob URL without exposing its storage reference', () => {
    const photoAsset = createPersonMediaAssetRef({
      treeId: 'tree-1',
      assetId: '123e4567-e89b-42d3-a456-426614174000',
      kind: 'profile-photo',
      mimeType: 'image/webp',
      byteLength: 128,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    usePersonMediaAssetUrlMock.mockReturnValue('blob:private-profile-photo');

    const { container } = render(
      <SmartAvatar person={{ ...basePerson, photoAsset }} size={48} />
    );

    expect(screen.getByRole('img', { name: 'Noura Jozor' })).toHaveAttribute(
      'src',
      'blob:private-profile-photo'
    );
    expect(container.innerHTML).not.toContain(photoAsset.objectPath);
    expect(container.innerHTML).not.toContain(photoAsset.assetId);
    expect(container.innerHTML).not.toContain('person-media');
  });

  it('does not fetch or render a legacy private Storage URL, even with a previous cached blob', () => {
    const photoUrl = 'https://project.supabase.co/storage/v1/object/private-photo-sentinel';
    vi.mocked(useCachedImage).mockReturnValue({ cachedUrl: 'blob:previous-person', isLoading: false, error: null });
    const { container } = render(<SmartAvatar person={{ ...basePerson, photoUrl }} size={48} />);

    expect(useCachedImage).toHaveBeenCalledWith(undefined, { width: 48, height: 48 });
    expect(screen.getByRole('img', { name: 'Noura Jozor' })).toHaveAttribute('data-age-band', 'adult');
    expect(container.innerHTML).not.toContain(photoUrl);
    expect(container.innerHTML).not.toContain('blob:previous-person');
  });
  it('retries the same private asset when a fresh object URL replaces a failed one', () => {
    const photoAsset = createPersonMediaAssetRef({
      treeId: 'tree-1', assetId: '123e4567-e89b-42d3-a456-426614174000',
      kind: 'profile-photo', mimeType: 'image/webp', byteLength: 128,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    const person = { ...basePerson, photoAsset };
    usePersonMediaAssetUrlMock.mockReturnValue('blob:expired');
    const hook = render(<SmartAvatar person={person} size={48} />);
    fireEvent.error(screen.getByRole('img', { name: 'Noura Jozor' }));
    expect(hook.container.querySelector('img')).toBeNull();
    usePersonMediaAssetUrlMock.mockReturnValue('blob:reacquired');
    hook.rerender(<SmartAvatar person={{ ...person }} size={48} />);
    expect(screen.getByRole('img', { name: 'Noura Jozor' })).toHaveAttribute('src', 'blob:reacquired');
  });

  it('never falls back to legacy or cached bytes while a private asset is unresolved', () => {
    const photoAsset = createPersonMediaAssetRef({
      treeId: 'tree-1', assetId: '123e4567-e89b-42d3-a456-426614174000',
      kind: 'profile-photo', mimeType: 'image/webp', byteLength: 128,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    vi.mocked(useCachedImage).mockReturnValue({ cachedUrl: 'blob:previous-person', isLoading: false, error: null });
    const { container } = render(
      <SmartAvatar person={{ ...basePerson, photoAsset, photoUrl: 'https://legacy.test/photo.jpg' }} size={48} />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('legacy.test');
    expect(container.innerHTML).not.toContain('blob:previous-person');
  });
});

