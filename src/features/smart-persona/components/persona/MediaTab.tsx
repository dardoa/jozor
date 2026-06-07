import { lazy, memo, Suspense, useRef, useState, type ChangeEvent } from 'react';
import { Person, UserProfile } from '../../../../types';
import { Plus, Image as ImageIcon, X, Mic, Trash2, Cloud, Loader2 } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { useTranslation } from '../../../../context/TranslationContext';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { showToast } from '../../../../utils/showToast';
import { useGallery } from '../../hooks/useGallery';
import { getGalleryImageUrl } from '../../../../utils/mediaUtils';

type GalleryMediaItem = string | {
  id?: string;
  path?: string;
  url?: string;
  version?: number;
  caption?: string;
  createdAt?: string;
};

type MediaTabTranslations = {
  addPhoto?: string;
};

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
  const mediaText = t as typeof t & MediaTabTranslations;
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);
  const isGuest = !user || user?.uid.startsWith('mock-');

  const { isUploading, addPhoto, removePhoto } = useGallery();

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await addPhoto(file, person.id);
    e.target.value = '';
  };

  const handleDriveSelect = async () => {
    if (!user || user?.uid.startsWith('mock-')) {
      showToast.error('demoModeNote');
      return;
    }

    setIsDriveLoading(true);
    try {
      const { googleMediaService } = await import('../../../../services/googleService');
      const driveUrl = await googleMediaService.pickAndDownloadImage();
      if (driveUrl) {
        const currentGallery = Array.isArray(person.gallery) ? person.gallery : [];
        onUpdate(person.id, { gallery: [...currentGallery, driveUrl] });
        showToast.success('messages.success.uploadSuccess');
      }
    } catch (error: unknown) {
      if (error !== 'Cancelled') {
        console.error(error);
        showToast.error('messages.error.import');
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleVoiceSave = async (audioBlob: Blob) => {
    if (!user) {
      showToast.error('loginRequired');
      return;
    }
    try {
      const { googleMediaService } = await import('../../../../services/googleService');
      const driveUrl = await googleMediaService.uploadFile(
        audioBlob,
        `voice_${person.id}_${Date.now()}.webm`,
        'audio/webm'
      );
      const currentNotes = person.voiceNotes || [];
      onUpdate(person.id, { voiceNotes: [...currentNotes, driveUrl] });
      showToast.success('messages.success.uploadSuccess');
    } catch (err) {
      console.error('Voice note upload failed', err);
      showToast.error('messages.error.import');
    }
  };

  const gallery: GalleryMediaItem[] = Array.isArray(person.gallery)
    ? person.gallery as unknown as GalleryMediaItem[]
    : [];
  const voiceNotes = person.voiceNotes || [];
  const hasPhotos = gallery.length > 0;
  const hasVoiceNotes = voiceNotes.length > 0;

  const personFullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const galleryUrls = gallery.map(item => getGalleryImageUrl(item)).filter(Boolean) as string[];

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
              المعرض والذكريات الصوتية مقفلة للزوار
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              لحفظ صور عائلتك وشهادات الأجداد الصوتية بشكل آمن مدى الحياة وتجنب فقدانها عند مسح كاش المتصفح، يرجى تسجيل الدخول بحسابك السحابي.
            </p>
          </div>
          <div className="bg-[var(--surface-subtle)] border border-[var(--border-soft)] rounded-2xl p-3 max-w-sm mx-auto flex items-center gap-3 text-start mt-4">
            <div className="w-8 h-8 rounded-full bg-[var(--color-info-500)]/10 flex items-center justify-center text-[var(--color-info-500)] shrink-0">
              <ImageIcon className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-[var(--text-main)]">ميزة الحفظ السحابي التلقائي</h4>
              <p className="text-[9px] text-[var(--text-dim)] mt-0.5">مساحة آمنة لحفظ ألبومات عائلتك مباشرة على حساب Google Drive الخاص بك.</p>
            </div>
          </div>
        </div>
      )}
      {/* --- PHOTOS SECTION --- */}
      <Card title={t.galleryTab} tone='flat'>
        <div className='flex justify-between items-center relative z-10 mb-3'>
          {isEditing && !isGuest && (
            <div className='flex gap-1.5 ms-auto'>
              {user && (
                <button
                  onClick={handleDriveSelect}
                  disabled={isDriveLoading || isUploading}
                className='text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 disabled:opacity-50 px-2 py-1 rounded-full transition-colors'
                  title={t.settings.importDrive}
                >
                  {isDriveLoading ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Cloud className='w-3.5 h-3.5' />
                  )}
                  <span className='hidden sm:inline'>{t.settings.drive || 'Google Drive'}</span>
                </button>
              )}
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploading}
                className='text-xs font-bold text-[var(--primary-600)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 px-2 py-1 rounded-full transition-colors disabled:opacity-50 border border-[var(--primary-100)]'
              >
                {isUploading ? (
                   <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                   <Plus className='w-3.5 h-3.5' />
                )}
                {mediaText.addPhoto || 'Add Photo'}
              </button>
            </div>
          )}
        </div>
        <input
          ref={galleryInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={handleImageUpload}
          aria-label={mediaText.addPhoto || 'Add Photo'}
        />

        {!hasPhotos && !isEditing ? (
          <EmptyState
            icon={<ImageIcon className='w-8 h-8' />}
            title={t.noPhotos}
          />
        ) : (
          <div className='grid grid-cols-2 gap-3'>
            {gallery.map((item, idx) => {
              const src = getGalleryImageUrl(item);
              if (!src) return null;
              const imgAlt = personFullName ? `${personFullName} — ${t.galleryTab} ${idx + 1}` : `Gallery image ${idx + 1}`;

              return (
                <div key={(item as any).id || idx} className='flex flex-col gap-1.5 animate-in fade-in duration-200'>
                <div
                  /* thumbnail wrapper */
                  className='relative group rounded-xl overflow-hidden border border-[var(--border-soft)] aspect-square bg-[var(--surface-subtle)] shadow-[var(--shadow-sm)] cursor-zoom-in'
                  onClick={() => setSelectedImgIndex(idx)}
                >
                  <img 
                    src={src} 
                    alt={imgAlt} 
                    className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110' 
                    loading="lazy" 
                  />

                  <div className='absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2'>
                    {isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof item === 'object' && (item as any).id) {
                            removePhoto(person.id, (item as any).id);
                          } else {
                            const newGallery = [...gallery];
                            newGallery.splice(idx, 1);
                            onUpdate(person.id, { gallery: newGallery as Person['gallery'] });
                          }
                        }}
                        className='p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110'
                        aria-label={t.delete}
                      >
                        <X className='w-4 h-4' />
                      </button>
                    )}
                  </div>
                  {!isEditing && (item as any).caption && (
                    <div className='absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 truncate backdrop-blur-sm'>
                      {(item as any).caption}
                    </div>
                  )}
                  </div>

                  {isEditing && !isGuest && (
                    <input
                      type='text'
                      placeholder='أضف وصفاً للصورة...'
                      value={(item as any).caption || ''}
                      onChange={(e) => {
                        const newCaption = e.target.value;
                        const newGallery = [...gallery];
                        if (typeof item === 'object') {
                          newGallery[idx] = { ...item, caption: newCaption };
                        } else {
                          newGallery[idx] = { url: item, caption: newCaption };
                        }
                        onUpdate(person.id, { gallery: newGallery as Person['gallery'] });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className='w-full text-[10px] px-2 py-1 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary-500)] text-center'
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
            altPrefix={personFullName}
            onNavigate={setSelectedImgIndex}
            onClose={() => setSelectedImgIndex(null)}
          />
        </Suspense>
      )}

      {/* --- AUDIO SECTION --- */}
      <Card title={t.voiceMemories} tone='flat'>
        <div className='flex justify-between items-center relative z-10 mb-3'>
          {isEditing && !isGuest && (
            <Suspense fallback={null}>
              <VoiceRecorder onSave={handleVoiceSave} />
            </Suspense>
          )}
        </div>

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
