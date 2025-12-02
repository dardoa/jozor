
import React, { useRef, useState } from 'react';
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

export const MediaTab: React.FC<MediaTabProps> = ({ person, isEditing, onUpdate, t, user }) => {
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
    <div className="space-y-6">
        {/* --- PHOTOS SECTION --- */}
        <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.gallery}</h3>
                {isEditing && (
                    <div className="flex gap-2">
                        {user && (
                            <button 
                                onClick={handleDriveSelect}
                                disabled={isDriveLoading}
                                className="text-[9px] font-bold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                                title="Import from Google Drive"
                            >
                                {isDriveLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Cloud className="w-3 h-3"/>} 
                                <span className="hidden sm:inline">Drive</span>
                            </button>
                        )}
                        <button 
                            onClick={() => galleryInputRef.current?.click()}
                            className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3"/> {t.addPhoto}
                        </button>
                    </div>
                )}
                <input 
                    ref={galleryInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                />
            </div>

            {(!person.gallery || person.gallery.length === 0) ? (
                <div className="text-center py-6 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center">
                    <ImageIcon className="w-6 h-6 mb-2 opacity-50" />
                    <span className="text-[10px]">{t.noPhotos}</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {person.gallery.map((src, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-100 dark:bg-gray-900">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => handleAnalyzePhoto(idx, src)}
                                    className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full text-white"
                                    title="AI Analyze"
                                >
                                    {analyzingImgIndex === idx ? <Loader2 className="w-4 h-4 animate-spin"/> : <ScanEye className="w-4 h-4"/>}
                                </button>
                                {isEditing && (
                                    <button 
                                        onClick={() => {
                                            const newGallery = [...(person.gallery || [])];
                                            newGallery.splice(idx, 1);
                                            onUpdate(person.id, { gallery: newGallery });
                                        }}
                                        className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* --- AUDIO SECTION --- */}
        <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.voiceMemories}</h3>
                {isEditing && <VoiceRecorder onSave={handleVoiceSave} t={t} />}
            </div>

            {(!person.voiceNotes || person.voiceNotes.length === 0) ? (
                 <div className="text-center py-6 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center">
                    <Mic className="w-6 h-6 mb-2 opacity-50" />
                    <span className="text-[10px]">No recordings yet.</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {person.voiceNotes.map((note, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <Mic className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Recording #{idx + 1}</div>
                                <audio ref={audioRef} src={note} controls className="w-full h-6 mt-1" />
                            </div>
                            {isEditing && (
                                <button 
                                    onClick={() => {
                                        const newNotes = [...(person.voiceNotes || [])];
                                        newNotes.splice(idx, 1);
                                        onUpdate(person.id, { voiceNotes: newNotes });
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
