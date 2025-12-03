import React, { useRef, useState, memo } from 'react';
import { Person, UserProfile } from '../../types';
import { processImageFile } from '../../utils/imageLogic';
import { pickAndDownloadImage } from '../../services/googleService';
import { analyzeImage } from '../../services/geminiService';
import { Plus, Image as ImageIcon, X, Mic, Play, Trash2, Cloud, Loader2, Sparkles, ScanEye } from 'lucide-react';
import { VoiceRecorder } from '../VoiceRecorder';

interface MediaTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  t: any;
  user: UserProfile | null;
}

export const MediaTab: React.FC<MediaTabProps> = memo(({ person, isEditing, onUpdate, t, user }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [analyzingImgIndex, setAnalyzingImgIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const dataUrl = await processImageFile(file, 600, 0.8);
        const currentGallery = person.gallery || [];
        onUpdate(person.id, { gallery: [...currentGallery, dataUrl] });
    } catch (err) {
        console.error("Gallery upload failed", err);
    }
    e.target.value = '';
  };

  const handleDriveSelect = async () => {
      if (user?.uid.startsWith('mock-')) {
          alert("Drive Picker requires a real Google Login (Demo Mode active).");
          return;
      }

      setIsDriveLoading(true);
      try {
          const dataUrl = await pickAndDownloadImage();
          if (dataUrl) {
              const currentGallery = person.gallery || [];
              onUpdate(person.id, { gallery: [...currentGallery, dataUrl] });
          }
      } catch (err: any) {
          if (err !== "Cancelled") {
              console.error(err);
              alert("Failed to pick image from Drive.");
          }
      } finally {
          setIsDriveLoading(false);
      }
  };

  const handleAnalyzePhoto = async (index: number, src: string) => {
      setAnalyzingImgIndex(index);
      try {
          const analysis = await analyzeImage(src);
          // Append analysis to bio or alert
          if(confirm(`Analysis Result:\n\n${analysis}\n\nAppend to biography?`)) {
              onUpdate(person.id, { bio: (person.bio || '') + `\n\n[Photo Analysis]: ${analysis}` });
          }
      } catch (e) {
          alert("Analysis failed.");
      } finally {
          setAnalyzingImgIndex(null);
      }
  };

  const handleVoiceSave = (base64: string) => {
      const currentNotes = person.voiceNotes || [];
      onUpdate(person.id, { voiceNotes: [...currentNotes, base64] });
  };

  return (
    <div className="space-y-5"> {/* Reduced space-y-6 to space-y-5 */}
        {/* --- PHOTOS SECTION --- */}
        <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative">
            <div className="flex justify-between items-center relative z-10 mb-3">
                <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.gallery}</h3>
                {isEditing && (
                    <div className="flex gap-1.5 ms-auto"> {/* Added ms-auto to push to right */}
                        {user && (
                            <button 
                                onClick={handleDriveSelect}
                                disabled={isDriveLoading}
                                className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-50 px-1.5 py-0.5 rounded-full"
                                title="Import from Google Drive"
                            > {/* Reduced text-[9px] to text-[8px], px-2 py-1 to px-1.5 py-0.5 */}
                                {isDriveLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <Cloud className="w-2.5 h-2.5"/>} {/* Reduced w-3 h-3 to w-2.5 h-2.5 */}
                                <span className="hidden sm:inline">Drive</span>
                            </button>
                        )}
                        <button 
                            onClick={() => galleryInputRef.current?.click()}
                            className="text-[8px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                        > {/* Reduced text-[9px] to text-[8px], px-2 py-1 to px-1.5 py-0.5 */}
                            <Plus className="w-2.5 h-2.5"/> {t.addPhoto} {/* Reduced w-3 h-3 to w-2.5 h-2.5 */}
                        </button>
                    </div>
                )}
            </div>
            <input 
                ref={galleryInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
            />

            {(!person.gallery || person.gallery.length === 0) ? (
                <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center"> {/* Reduced py-6 to py-4 */}
                    <ImageIcon className="w-6 h-6 mb-2 opacity-50" /> {/* Reduced w-7 h-7 to w-6 h-6 */}
                    <span className="text-sm">{t.noPhotos}</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2"> {/* Reduced gap-3 to gap-2 */}
                    {person.gallery.map((src, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 aspect-square bg-stone-100 dark:bg-stone-900">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5"> {/* Reduced gap-2 to gap-1.5 */}
                                <button
                                    onClick={() => handleAnalyzePhoto(idx, src)}
                                    className="p-1 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full text-white"
                                    title="AI Analyze"
                                > {/* Reduced p-1.5 to p-1 */}
                                    {analyzingImgIndex === idx ? <Loader2 className="w-3 h-3 animate-spin"/> : <ScanEye className="w-3 h-3"/>} {/* Reduced w-3.5 h-3.5 to w-3 h-3 */}
                                </button>
                                {isEditing && (
                                    <button 
                                        onClick={() => {
                                            const newGallery = [...(person.gallery || [])];
                                            newGallery.splice(idx, 1);
                                            onUpdate(person.id, { gallery: newGallery });
                                        }}
                                        className="p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full"
                                    > {/* Reduced p-1.5 to p-1 */}
                                        <X className="w-3 h-3" /> {/* Reduced w-3.5 h-3.5 to w-3 h-3 */}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* --- AUDIO SECTION --- */}
        <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative">
            <div className="flex justify-between items-center relative z-10 mb-3">
                <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.voiceMemories}</h3>
                {isEditing && <VoiceRecorder onSave={handleVoiceSave} t={t} />}
            </div>

            {(!person.voiceNotes || person.voiceNotes.length === 0) ? (
                 <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center"> {/* Reduced py-6 to py-4 */}
                    <Mic className="w-6 h-6 mb-2 opacity-50" /> {/* Reduced w-7 h-7 to w-6 h-6 */}
                    <span className="text-sm">No recordings yet.</span>
                </div>
            ) : (
                <div className="space-y-2"> {/* Reduced space-y-3 to space-y-2 */}
                    {person.voiceNotes.map((note, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-700 rounded-xl shadow-sm"> {/* Reduced p-3 to p-2 and gap-3 to gap-2 */}
                            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"> {/* Reduced w-8 h-8 to w-7 h-7 */}
                                <Mic className="w-3.5 h-3.5" /> {/* Reduced w-4 h-4 to w-3.5 h-3.5 */}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-stone-700 dark:text-stone-300">Recording #{idx + 1}</div>
                                <audio ref={audioRef} src={note} controls className="w-full h-7 mt-1" /> {/* Reduced h-8 to h-7 */}
                            </div>
                            {isEditing && (
                                <button 
                                    onClick={() => {
                                        const newNotes = [...(person.voiceNotes || [])];
                                        newNotes.splice(idx, 1);
                                        onUpdate(person.id, { voiceNotes: newNotes });
                                    }}
                                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                > {/* Reduced p-2 to p-1.5 */}
                                    <Trash2 className="w-3.5 h-3.5" /> {/* Reduced w-4 h-4 to w-3.5 h-3.5 */}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
});