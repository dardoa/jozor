import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPersonMediaAssetRef,
  type Person,
  type UserProfile,
} from '../../../../../types';
import { createPerson } from '../../../../../utils/familyLogic';
import { MediaTab } from '../MediaTab';

const {
  addPhotoMock,
  removePhotoMock,
  uploadFileMock,
  usePersonMediaAssetUrlsMock,
} = vi.hoisted(() => ({
  addPhotoMock: vi.fn(),
  removePhotoMock: vi.fn(),
  uploadFileMock: vi.fn(),
  usePersonMediaAssetUrlsMock: vi.fn(),
}));

vi.mock('../../../hooks/useGallery', () => ({
  useGallery: () => ({
    isUploading: false,
    addPhoto: addPhotoMock,
    removePhoto: removePhotoMock,
  }),
}));

vi.mock('../../../../../hooks/utils/usePersonMediaAssetUrls', () => ({
  usePersonMediaAssetUrls: usePersonMediaAssetUrlsMock,
}));

vi.mock('../../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      addPhoto: 'Add photo',
      audioFileTooLarge: 'Audio too large',
      audioFileTooLong: 'Audio too long',
      audioReadError: 'Audio read error',
      automaticCloudStorage: 'Automatic cloud storage',
      automaticCloudStorageDescription: 'Cloud description',
      closeGallery: 'Close gallery',
      delete: 'Delete',
      downloadGalleryImage: 'Download image',
      galleryCloseHint: 'Press Escape to close',
      galleryTab: 'Gallery',
      guestMediaDescription: 'Guest description',
      guestMediaTitle: 'Guest media',
      nextGalleryImage: 'Next image',
      noPhotos: 'No photos',
      noRecordings: 'No recordings',
      openGalleryImage: (index: number) => `Open gallery image ${index}`,
      photoCaptionPlaceholder: 'Add a photo caption...',
      previousGalleryImage: 'Previous image',
      settings: { recording: 'Recording' },
      unsupportedAudioType: 'Unsupported audio',
      uploadAudio: 'Upload audio',
      voiceMemories: 'Voice memories',
    },
  }),
}));

vi.mock('../../../../../components/ui/ImageLightbox', () => ({
  ImageLightbox: ({ images, currentIndex }: {
    images: string[];
    currentIndex: number;
  }) => (
    <div
      role="dialog"
      data-current-index={currentIndex}
      data-images={JSON.stringify(images)}
    />
  ),
}));

vi.mock('../../../../../components/VoiceRecorder', () => ({
  VoiceRecorder: ({ onSave }: { onSave: (blob: Blob) => void }) => (
    <button type="button" onClick={() => onSave(new Blob(['voice'], { type: 'audio/webm;codecs=opus' }))}>
      Save voice memory
    </button>
  ),
}));

vi.mock('../../../../../services/googleService', () => ({
  googleMediaService: {
    uploadFile: uploadFileMock,
  },
}));

vi.mock('../../../../../utils/showToast', () => ({
  showToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const user: UserProfile = {
  uid: 'user-1',
  displayName: 'Owner',
  email: 'owner@example.test',
  photoURL: '',
};

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  ...createPerson(),
  id: 'raw-person-id-must-not-enter-filenames',
  firstName: 'Mariam',
  lastName: 'Saleh',
  gallery: [],
  voiceNotes: [],
  ...overrides,
});

describe('MediaTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadFileMock.mockResolvedValue('https://drive.example.test/voice-note');
    usePersonMediaAssetUrlsMock.mockReturnValue({
      urlsByAssetId: {},
      isLoading: false,
    });
  });

  it('uses the filtered gallery index when an invalid record precedes a valid image', async () => {
    const person = makePerson({
      gallery: [
        { id: 'invalid', path: '', version: 1, createdAt: '' },
        'https://images.example.test/valid.webp',
      ],
    });

    render(<MediaTab person={person} isEditing={false} onUpdate={vi.fn()} user={user} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open gallery image 1' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-current-index', '0');
    expect(JSON.parse(dialog.getAttribute('data-images') || '[]')).toEqual([
      'https://images.example.test/valid.webp',
    ]);
  });

  it('shows the empty state when gallery records do not resolve to images', () => {
    const person = makePerson({
      gallery: [{ id: 'invalid', path: '', version: 1, createdAt: '' }],
    });

    render(<MediaTab person={person} isEditing={false} onUpdate={vi.fn()} user={user} />);

    expect(screen.getByText('No photos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open gallery image/ })).not.toBeInTheDocument();
  });

  it('commits a localized caption only when the field loses focus', () => {
    const onUpdate = vi.fn();
    const person = makePerson({ gallery: ['https://images.example.test/photo.webp'] });
    render(<MediaTab person={person} isEditing onUpdate={onUpdate} user={user} />);

    const caption = screen.getByRole('textbox', { name: 'Add a photo caption...' });
    fireEvent.change(caption, { target: { value: 'Family gathering' } });
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.blur(caption);

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith(person.id, {
      gallery: [expect.objectContaining({
        caption: 'Family gathering',
        url: 'https://images.example.test/photo.webp',
      })],
    });
  });

  it('uses an opaque generated filename for a recorded voice memory', async () => {
    const onUpdate = vi.fn();
    const person = makePerson();
    render(<MediaTab person={person} isEditing onUpdate={onUpdate} user={user} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Save voice memory' }));

    await waitFor(() => expect(uploadFileMock).toHaveBeenCalledOnce());
    const generatedName = uploadFileMock.mock.calls[0][1] as string;
    expect(generatedName).toMatch(/^voice-memory-\d+\.webm$/);
    expect(generatedName).not.toContain(person.id);
    expect(onUpdate).toHaveBeenCalledWith(person.id, {
      voiceNotes: ['https://drive.example.test/voice-note'],
    });
  });

  it('renders a private gallery asset only through its resolved blob URL', () => {
    const asset = createPersonMediaAssetRef({
      treeId: 'tree-1',
      assetId: '223e4567-e89b-42d3-a456-426614174000',
      kind: 'gallery-photo',
      mimeType: 'image/webp',
      byteLength: 256,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    usePersonMediaAssetUrlsMock.mockReturnValue({
      urlsByAssetId: { [asset.assetId]: 'blob:private-gallery-photo' },
      isLoading: false,
    });
    const person = makePerson({
      gallery: [{
        id: 'gallery-item-1',
        asset,
        version: 1,
        createdAt: '2026-09-05T00:00:00.000Z',
      }],
    });

    const { container } = render(
      <MediaTab person={person} isEditing={false} onUpdate={vi.fn()} user={user} />
    );

    expect(screen.getByRole('img', { name: 'Mariam Saleh — Gallery 1' })).toHaveAttribute(
      'src',
      'blob:private-gallery-photo'
    );
    expect(container.innerHTML).not.toContain(asset.objectPath);
    expect(container.innerHTML).not.toContain(asset.assetId);
    expect(container.innerHTML).not.toContain('person-media');
  });
});
