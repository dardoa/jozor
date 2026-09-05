import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Person, PersonMediaAssetRef } from '../../../../../types';
import { NodeImageBlock } from '../NodeImageBlock';

vi.mock('../../../../ui/SmartAvatar', () => ({
  SmartAvatar: ({ person }: { person: Person }) => (
    <div
      data-testid="smart-avatar"
      data-has-private-asset={person.photoAsset ? 'true' : 'false'}
    />
  ),
}));

const privateAsset: PersonMediaAssetRef = {
  schemaVersion: 1,
  provider: 'supabase-private',
  bucket: 'person-media',
  assetId: '11111111-1111-4111-8111-111111111111',
  kind: 'profile-photo',
  objectPath: 'tree-1/profile-photo/11111111-1111-4111-8111-111111111111.jpg',
  mimeType: 'image/jpeg',
  byteLength: 256,
  version: 1,
  createdAt: '2026-09-05T00:00:00.000Z',
};

const person: Person = {
  id: 'person-1',
  title: '',
  firstName: 'Amina',
  middleName: '',
  lastName: 'Saleh',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'female',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  photoUrl: '',
  photoAsset: privateAsset,
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
  partnerDetails: {},
};

const renderImageBlock = (shouldRenderPhoto: boolean) => render(
  <NodeImageBlock
    isLOD={false}
    imageBlockHeightPx={120}
    borderColor="#000"
    monogramBg="#fff"
    person={person}
    shouldRenderPhoto={shouldRenderPhoto}
    photoAlt="Amina Saleh"
    photoSource={null}
    privacyMode={false}
    isDeceased={false}
    showGender={false}
    onFocusPerson={vi.fn()}
    showParentNavigation={false}
    privacyPlaceholder={{ Icon: () => null, ariaLabel: 'Private person' }}
  />
);

describe('NodeImageBlock private media visibility', () => {
  it('removes the private asset from the fallback avatar when photos are hidden', () => {
    renderImageBlock(false);

    expect(screen.getByTestId('smart-avatar')).toHaveAttribute('data-has-private-asset', 'false');
  });

  it('keeps the private asset when photo rendering is enabled', () => {
    renderImageBlock(true);

    expect(screen.getByTestId('smart-avatar')).toHaveAttribute('data-has-private-asset', 'true');
  });
});
