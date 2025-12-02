
import React, { useRef } from 'react';
import { Person } from '../../types';
import { processImageFile } from '../../utils/imageLogic';
import { Plus, Image as ImageIcon, X } from 'lucide-react';

interface GalleryTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  t: any;
}

export const GalleryTab: React.FC<GalleryTabProps> = ({ person, isEditing, onUpdate, t }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-3">
        <div className="flex justify-between items-center mb-1">
            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.gallery}</h3>
            {isEditing && (
                <button 
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    <Plus className="w-3 h-3"/> {t.addPhoto}
                </button>
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
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-[10px]">{t.noPhotos}</span>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-2">
                {person.gallery.map((src, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-100 dark:bg-gray-900">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {isEditing && (
                            <button 
                                onClick={() => {
                                    const newGallery = [...(person.gallery || [])];
                                    newGallery.splice(idx, 1);
                                    onUpdate(person.id, { gallery: newGallery });
                                }}
                                className="absolute top-1 end-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
