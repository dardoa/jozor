import { useRef, useState, memo } from 'react';
import { Person, UserProfile } from '../../types';
import { processImageFile } from '../../utils/imageLogic';
import { googleMediaService } from '../../services/googleService'; // Import new service
import { analyzeImage } from '../../services/geminiService';
import { Plus, Image as ImageIcon, X, Mic, Trash2, Cloud, Loader2, ScanEye } from 'lucide-react';
import { VoiceRecorder } from '../VoiceRecorder';
import { Card } from '../ui/Card';
import { useTranslation } from '../../context/TranslationContext';
import { showError, showSuccess } from '../../utils/toast'; // Import toast utilities

interface MediaTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  user: UserProfile | null;
}

export const MediaTab = memo<MediaTabProps>(({ person, isEditing, onUpdate, user }) => {
  const { t } = useTranslation();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [analyzingImgIndex, setAnalyzingImgIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      showError('Login required to upload images to Drive.'); // Use toast
      return;
    }

    try {
      const imageBlob = await processImageFile(file, 600, 0.8); // Get Blob
      const driveUrl = await googleMediaService.uploadFile(
        imageBlob,
        `gallery_${person.id}_${Date.now()}.jpeg`,
        'image/jpeg'
      ); // Upload

      const currentGallery = person.gallery || [];
      onUpdate(person.id, { gallery: [...currentGallery, driveUrl] }); // Store URL
      showSuccess('Image uploaded to Drive successfully!'); // Toast success
    } catch (err) {
      console.error('Gallery upload failed', err);
      showError('Failed to upload image to Drive.'); // Use toast
    }
    e.target.value = '';
  };

  const handleDriveSelect = async () => {
    if (!user || user?.uid.startsWith('mock-')) {
      showError('Drive Picker requires a real Google Login (Demo Mode active).'); // Use toast
      return;
    }

    setIsDriveLoading(true);
    try {
      const driveUrl = await googleMediaService.pickAndDownloadImage(); // Now returns URL
      if (driveUrl) {
        const currentGallery = person.gallery || [];
        onUpdate(person.id, { gallery: [...currentGallery, driveUrl] });
        showSuccess('Image picked from Drive successfully!'); // Toast success
      }
    } catch (err: any) {
      if (err !== 'Cancelled') {
        console.error(err);
        showError('Failed to pick image from Drive.'); // Use toast
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleAnalyzePhoto = async (index: number, src: string) => {
    setAnalyzingImgIndex(index);
    try {
      let base64Image: string;
      if (src.startsWith('data:')) {
        base64Image = src;
      } else {
        // Fetch from Drive URL
        const blob = await googleMediaService.fetchFileAsBlob(src);
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      const analysis = await analyzeImage(base64Image);
      // Append analysis to bio or alert
      if (confirm(`Analysis Result:\n\n${analysis}\n\nAppend to biography?`)) {
        onUpdate(person.id, { bio: (person.bio || '') + `\n\n[Photo Analysis]: ${analysis}` });
        showSuccess('Image analysis appended to biography.'); // Toast success
      }
    } catch (e) {
      showError('Analysis failed.'); // Use toast
    } finally {
      setAnalyzingImgIndex(null);
    }
  };

  const handleVoiceSave = async (audioBlob: Blob) => {
    // Accepts Blob
    if (!user) {
      showError('Login required to save voice notes to Drive.'); // Use toast
      return;
    }
    try {
      const driveUrl = await googleMediaService.uploadFile(
        audioBlob,
        `voice_${person.id}_${Date.now()}.webm`,
        'audio/webm'
      );
      const currentNotes = person.voiceNotes || [];
      onUpdate(person.id, { voiceNotes: [...currentNotes, driveUrl] });
      showSuccess('Voice note uploaded to Drive successfully!'); // Toast success
    } catch (err) {
      console.error('Voice note upload failed', err);
      showError('Failed to upload voice note to Drive.'); // Use toast
    }
  };

  const hasPhotos = person.gallery && person.gallery.length > 0;
  const hasVoiceNotes = person.voiceNotes && person.voiceNotes.length > 0;

  return (
    <div className='space-y-5'>
      {/* --- PHOTOS SECTION --- */}
      <Card title={t.galleryTab}>
        <div className='flex justify-between items-center relative z-10 mb-3'>
          {isEditing && (
            <div className='flex gap-1.5 ms-auto'>
              {user && (
                <button
                  onClick={handleDriveSelect}
                  disabled={isDriveLoading}
                  className='text-xs font-bold text-[var(--primary-600)] hover:underline flex items-center gap-1 disabled:opacity-50 px-2 py-1 rounded-full'
                  title='Import from Google Drive'
                >
                  {isDriveLoading ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Cloud className='w-3.5 h-3.5' />
                  )}
                  <span className='hidden sm:inline'>Drive</span>
                </button>
              )}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className='text-xs font-bold text-[var(--primary-600)] hover:underline flex items-center gap-1 px-2 py-1 rounded-full'
              >
                <Plus className='w-3.5 h-3.5' /> {t.addPhoto}
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
          aria-label={t.uploadPhoto || 'Upload Photo'}
        />

        {!hasPhotos && !isEditing ? (
          <div className='text-center py-4 text-[var(--text-muted)] bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] flex flex-col items-center'>
            <ImageIcon className='w-8 h-8 mb-2 opacity-50' />
            <span className='text-sm'>{t.noPhotos}</span>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-2'>
            {person.gallery.map((src, idx) => (
              <div
                key={idx}
                className='relative group rounded-xl overflow-hidden border border-[var(--border-main)] aspect-square bg-[var(--theme-bg)]'
              >
                <img src={src} alt='' className='w-full h-full object-cover' />

                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5'>
                  <button
                    onClick={() => handleAnalyzePhoto(idx, src)}
                    className='p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full text-white'
                    title='AI Analyze'
                  >
                    {analyzingImgIndex === idx ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <ScanEye className='w-4 h-4' />
                    )}
                  </button>
                  {isEditing && (
                    <button
                      onClick={() => {
                        const newGallery = [...(person.gallery || [])];
                        newGallery.splice(idx, 1);
                        onUpdate(person.id, { gallery: newGallery });
                      }}
                      className='p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full'
                      aria-label={t.delete || 'Delete'}
                    >
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* --- AUDIO SECTION --- */}
      <Card title={t.voiceMemories}>
        <div className='flex justify-between items-center relative z-10 mb-3'>
          {isEditing && <VoiceRecorder onSave={handleVoiceSave} />}
        </div>

        {!hasVoiceNotes && !isEditing ? (
          <div className='text-center py-4 text-[var(--text-muted)] bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] flex flex-col items-center'>
            <Mic className='w-8 h-8 mb-2 opacity-50' />
            <span className='text-sm'>{t.noRecordings}</span>
          </div>
        ) : (
          <div className='space-y-2'>
            {person.voiceNotes?.map((note, idx) => (
              <div
                key={idx}
                className='flex items-center gap-2 p-2 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl shadow-sm'
              >
                <div className='w-8 h-8 rounded-full bg-[var(--primary-600)]/10 flex items-center justify-center text-[var(--primary-600)] shrink-0'>
                  <Mic className='w-4 h-4' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-bold text-[var(--text-main)]'>
                    Recording #{idx + 1}
                  </div>
                  <audio ref={audioRef} src={note} controls className='w-full h-8 mt-1 border-0' />
                </div>
                {isEditing && (
                  <button
                    onClick={() => {
                      const newNotes = [...(person.voiceNotes || [])];
                      newNotes.splice(idx, 1);
                      onUpdate(person.id, { voiceNotes: newNotes });
                    }}
                    className='p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors'
                    aria-label={t.delete || 'Delete'}
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
