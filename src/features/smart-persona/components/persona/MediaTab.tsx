import {
  lazy,
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Person, UserProfile } from '../../../../types';
import { Plus, Image as ImageIcon, X, Mic, Trash2, Cloud, Loader2, Upload } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { useTranslation } from '../../../../context/TranslationContext';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { showToast } from '../../../../utils/showToast';
import { useGallery } from '../../hooks/useGallery';
import { getGalleryImageAsset, getGalleryImageUrl } from '../../../../utils/mediaUtils';
import { logError } from '../../../../utils/errorLogger';
import { usePersonMediaAssetUrls } from '../../../../hooks/utils/usePersonMediaAssetUrls';
import type { PersonMediaAssetRef } from '../../../../types';

type GalleryMediaItem = string | {
  id?: string;
  asset?: PersonMediaAssetRef;
  path?: string;
  url?: string;
  version?: number;
  caption?: string;
  createdAt?: string;
};

interface ResolvedGalleryItem {
  item: GalleryMediaItem;
  sourceIndex: number;
  src: string | null;
}

const MAX_VOICE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_VOICE_DURATION_SECONDS = 10 * 60;
const ACCEPTED_VOICE_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
  'audio/x-m4a',
]);

const createVoiceMemoryFileName = (mimeType = 'audio/webm'): string => {
  const baseMimeType = mimeType.split(';', 1)[0];
  const extension = baseMimeType
    .split('/')[1]
    ?.replace(/^x-/, '')
    .replace(/[^a-z0-9]/gi, '') || 'webm';
  return `voice-memory-${Date.now()}.${extension}`;
};

interface GalleryCaptionInputProps {
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}

const GalleryCaptionInput = memo<GalleryCaptionInputProps>(({
  value,
  placeholder,
  onCommit,
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <input
      type="text"
      aria-label={placeholder}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
      className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 py-1 text-center text-[10px] text-[var(--text-main)] placeholder-[var(--text-dim)] focus:border-[var(--primary-500)] focus:outline-none"
    />
  );
});

const getAudioDurationSeconds = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read audio metadata.'));
    };
    audio.src = objectUrl;
  });

const ImageLightbox = lazy(() =>
  import('../../../../components/ui/ImageLightbox').then((module) => ({ default: module.ImageLightbox }))
);
const VoiceRecorder = lazy(() =>
  import('../../../../components/VoiceRecorder').then((module) => ({ default: module.VoiceRecorder }))
);

interface MediaTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  user: UserProfile | null;
}

export const MediaTab = memo<MediaTabProps>(({ person, isEditing, onUpdate, user }) => {
  const { t } = useTranslation();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);
  const isGuest = !user || user?.uid.startsWith('mock-');

  const { isUploading, addPhoto, removePhoto } = useGallery();

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await addPhoto(file, person.id);
    e.target.value = '';
  };

  const handleVoiceSave = async (audioBlob: Blob, fileName?: string, mimeType?: string) => {
    if (!user) {
      showToast.error('loginRequired');
      return;
    }
    try {
      const { googleMediaService } = await import('../../../../services/googleService');
      const uploadMimeType = mimeType || audioBlob.type || 'audio/webm';
      const driveUrl = await googleMediaService.uploadFile(
        audioBlob,
        fileName || createVoiceMemoryFileName(uploadMimeType),
        uploadMimeType
      );
      const currentNotes = person.voiceNotes || [];
      onUpdate(person.id, { voiceNotes: [...currentNotes, driveUrl] });
      showToast.success('messages.success.uploadSuccess');
    } catch (err) {
      logError('VOICE_NOTE_UPLOAD_FAILED', err, { showToast: false });
      showToast.error('messages.error.import');
    }
  };

  const handleVoiceFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_VOICE_TYPES.has(file.type)) {
      showToast.error(t.unsupportedAudioType);
      return;
    }

    if (file.size > MAX_VOICE_FILE_SIZE_BYTES) {
      showToast.error(t.audioFileTooLarge);
      return;
    }

    try {
      const duration = await getAudioDurationSeconds(file);
      if (duration > MAX_VOICE_DURATION_SECONDS) {
        showToast.error(t.audioFileTooLong);
        return;
      }

      await handleVoiceSave(file, file.name || createVoiceMemoryFileName(file.type), file.type);
    } catch (error) {
      logError('VOICE_NOTE_VALIDATION_FAILED', error, { showToast: false });
      showToast.error(t.audioReadError);
    }
  };

  const gallery = useMemo<GalleryMediaItem[]>(
    () => Array.isArray(person.gallery)
      ? person.gallery as unknown as GalleryMediaItem[]
      : [],
    [person.gallery]
  );
  const privateGalleryDescriptors = useMemo(() => gallery.flatMap((item) => {
    const asset = getGalleryImageAsset(item);
    return asset ? [{ personId: person.id, asset }] : [];
  }), [gallery, person.id]);
  const { urlsByAssetId, isLoading: isResolvingPrivateGallery } = usePersonMediaAssetUrls(
    privateGalleryDescriptors
  );
  const resolvedGallery = useMemo<ResolvedGalleryItem[]>(() => (
    gallery.flatMap((item, sourceIndex) => {
      const asset = getGalleryImageAsset(item);
      if (asset) {
        return [{
          item,
          sourceIndex,
          src: urlsByAssetId[asset.assetId] ?? null,
        }];
      }
      const src = getGalleryImageUrl(item);
      return src ? [{ item, sourceIndex, src }] : [];
    })
  ), [gallery, urlsByAssetId]);
  const voiceNotes = person.voiceNotes || [];
  const hasPhotos = resolvedGallery.length > 0;
  const hasVoiceNotes = voiceNotes.length > 0;
  const uploadAudioLabel = t.uploadAudio;

  const personFullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const readyGallery = useMemo(
    () => resolvedGallery.filter((entry): entry is ResolvedGalleryItem & { src: string } => Boolean(entry.src)),
    [resolvedGallery]
  );
  const galleryUrls = readyGallery.map(({ src }) => src);

  useEffect(() => {
    if (selectedImgIndex !== null && selectedImgIndex >= galleryUrls.length) {
      setSelectedImgIndex(null);
    }
  }, [galleryUrls.length, selectedImgIndex]);

  return (
    <div className='space-y-5'>
      {isGuest && (
        <div className="rounded-[28px] border border-[var(--border-soft)] bg-[var(--surface-panel)]/40 backdrop-blur-md p-6 text-center shadow-[var(--shadow-sm)] animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="relative mx-auto w-16 h-16 bg-[var(--primary-600)]/10 rounded-full flex items-center justify-center animate-pulse">
            <Cloud className="w-8 h-8 text-[var(--primary-600)] animate-bounce duration-1000" />
            <div className="absolute -top-0.5 -end-0.5 bg-red-500 text-white p-1 rounded-full border-2 border-[var(--surface-panel)] shadow-sm">
              <X className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="max-w-md mx-auto space-y-2 mt-4">
            <h3 className="text-base font-extrabold text-[var(--text-main)]">
              {t.guestMediaTitle}
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {t.guestMediaDescription}
            </p>
          </div>
          <div className="bg-[var(--surface-subtle)] border border-[var(--border-soft)] rounded-2xl p-3 max-w-sm mx-auto flex items-center gap-3 text-start mt-4">
            <div className="w-8 h-8 rounded-full bg-[var(--color-info-500)]/10 flex items-center justify-center text-[var(--color-info-500)] shrink-0">
              <ImageIcon className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-[var(--text-main)]">{t.automaticCloudStorage}</h4>
              <p className="text-[9px] text-[var(--text-dim)] mt-0.5">{t.automaticCloudStorageDescription}</p>
            </div>
          </div>
        </div>
      )}
      {/* --- PHOTOS SECTION --- */}
      <Card title={t.galleryTab} tone='flat'>
        <div className='flex justify-between items-center relative z-10 mb-3'>
          {isEditing && !isGuest && (
            <div className='flex gap-1.5 ms-auto'>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploading}
                className='text-xs font-bold text-[var(--primary-600)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 px-2 py-1 rounded-full transition-colors disabled:opacity-50 border border-[var(--primary-100)]'
              >
                {isUploading ? (
                   <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                   <Plus className='w-3.5 h-3.5' />
                )}
                {t.addPhoto}
              </button>
            </div>
          )}
        </div>
        <input
          ref={galleryInputRef}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          className='hidden'
          onChange={handleImageUpload}
          aria-label={t.addPhoto}
        />

        {!hasPhotos && !isEditing ? (
          <EmptyState
            icon={<ImageIcon className='w-8 h-8' />}
            title={t.noPhotos}
          />
        ) : (
          <div className='grid grid-cols-2 gap-3'>
            {resolvedGallery.map(({ item, sourceIndex, src }, galleryIndex) => {
              const imgAlt = personFullName
                ? `${personFullName} — ${t.galleryTab} ${galleryIndex + 1}`
                : t.openGalleryImage(galleryIndex + 1);
              const isObj = typeof item === 'object';
              const itemId = isObj ? item.id : String(sourceIndex);
              const caption = isObj ? item.caption : undefined;
              const lightboxIndex = src
                ? readyGallery.findIndex((entry) => entry.sourceIndex === sourceIndex)
                : -1;

              return (
                <div
                  key={`${itemId || 'gallery-item'}-${sourceIndex}`}
                  className='animate-in fade-in flex flex-col gap-1.5 duration-200'
                >
                  <div className='group relative aspect-square'>
                    {src ? (
                      <button
                        type="button"
                        aria-label={t.openGalleryImage(galleryIndex + 1)}
                        className='h-full w-full cursor-zoom-in overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]'
                        onClick={() => lightboxIndex >= 0 && setSelectedImgIndex(lightboxIndex)}
                      >
                        <img
                          src={src}
                          alt={imgAlt}
                          className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                          loading="lazy"
                        />
                        {!isEditing && caption && (
                          <span className='absolute inset-x-0 bottom-0 truncate bg-black/60 p-1 text-[10px] text-white backdrop-blur-sm'>
                            {caption}
                          </span>
                        )}
                      </button>
                    ) : (
                      <div
                        role="img"
                        aria-label={imgAlt}
                        className='flex h-full w-full items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-dim)]'
                      >
                        {isResolvingPrivateGallery
                          ? <Loader2 className='h-5 w-5 animate-spin' />
                          : <ImageIcon className='h-6 w-6' />}
                      </div>
                    )}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isObj && item.id) {
                            void removePhoto(person.id, item.id);
                          } else {
                            const newGallery = [...gallery];
                            newGallery.splice(sourceIndex, 1);
                            onUpdate(person.id, { gallery: newGallery as Person['gallery'] });
                          }
                        }}
                        className='absolute end-2 top-2 rounded-full bg-red-600/90 p-1.5 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity hover:bg-red-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100'
                        aria-label={t.delete}
                      >
                        <X className='w-4 h-4' />
                      </button>
                    )}
                  </div>

                  {isEditing && !isGuest && (
                    <GalleryCaptionInput
                      value={caption || ''}
                      placeholder={t.photoCaptionPlaceholder}
                      onCommit={(newCaption) => {
                        const newGallery = [...gallery];
                        if (isObj) {
                          newGallery[sourceIndex] = { ...item, caption: newCaption };
                        } else {
                          newGallery[sourceIndex] = {
                            id: `gallery-legacy-${sourceIndex}`,
                            url: item,
                            version: 1,
                            caption: newCaption,
                            createdAt: new Date().toISOString(),
                          };
                        }
                        onUpdate(person.id, { gallery: newGallery as Person['gallery'] });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Lightbox for viewing images */}
      {selectedImgIndex !== null && (
        <Suspense fallback={null}>
          <ImageLightbox
            images={galleryUrls}
            currentIndex={selectedImgIndex}
            altPrefix={personFullName || t.galleryTab}
            labels={{
              download: t.downloadGalleryImage,
              close: t.closeGallery,
              previous: t.previousGalleryImage,
              next: t.nextGalleryImage,
              closeHint: t.galleryCloseHint,
            }}
            onNavigate={setSelectedImgIndex}
            onClose={() => setSelectedImgIndex(null)}
          />
        </Suspense>
      )}

      {/* --- AUDIO SECTION --- */}
      <Card title={t.voiceMemories} tone='flat'>
        <div className='flex justify-between items-center relative z-10 mb-3'>
          {isEditing && !isGuest && (
            <div className="flex flex-wrap items-center gap-2 ms-auto">
              <button
                type="button"
                onClick={() => voiceInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-subtle)] text-[var(--text-main)] rounded-full text-xs font-bold hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border-soft)]"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadAudioLabel}
              </button>
              <Suspense fallback={null}>
                <VoiceRecorder onSave={(blob) => handleVoiceSave(blob)} />
              </Suspense>
            </div>
          )}
        </div>
        <input
          ref={voiceInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/mp4,audio/wav,audio/webm,audio/ogg,audio/aac,audio/x-m4a"
          className="hidden"
          onChange={handleVoiceFileUpload}
          aria-label={uploadAudioLabel}
        />

        {!hasVoiceNotes && !isEditing ? (
          <EmptyState
            icon={<Mic className='w-8 h-8' />}
            title={t.noRecordings}
          />
        ) : (
          <div className='space-y-2'>
            {voiceNotes.map((note, idx) => (
              <div
                key={idx}
                className='flex items-center gap-2 p-2 bg-[var(--surface-panel)] border border-[var(--border-soft)] rounded-xl shadow-[var(--shadow-sm)]'
              >
                <div className='w-8 h-8 rounded-full bg-[var(--primary-600)]/10 flex items-center justify-center text-[var(--primary-600)] shrink-0'>
                  <Mic className='w-4 h-4' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-bold text-[var(--text-main)]'>
                    {t.settings.recording} #{idx + 1}
                  </div>
                  <audio ref={audioRef} src={note} controls className='w-full h-8 mt-1 border-0' />
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      const newNotes = [...voiceNotes];
                      newNotes.splice(idx, 1);
                      onUpdate(person.id, { voiceNotes: newNotes });
                    }}
                    className='p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors'
                    aria-label={t.delete}
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});
