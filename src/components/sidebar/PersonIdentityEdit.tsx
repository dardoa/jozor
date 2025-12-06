import React, { memo, useRef, useState } from 'react';
import { Person } from '../../types';
import { FormField } from '../ui/FormField';
import { Card } from '../ui/Card';
import { Camera, X, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { processImageFile } from '../../utils/imageLogic';
import { extractPersonData } from '../../../services/geminiService'; // Corrected import path
import { useTranslation } from '../../context/TranslationContext';

interface PersonIdentityEditProps {
  person: Person;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const PersonIdentityEdit: React.FC<PersonIdentityEditProps> = memo(({ person, onUpdate }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [smartText, setSmartText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showMoreIdentityFields, setShowMoreIdentityFields] = useState(false);

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const dataUrl = await processImageFile(file, 300);
        onUpdate(person.id, { photoUrl: dataUrl });
    } catch (err) {
        console.error("Image processing failed", err);
    }
    e.target.value = '';
  };

  const handleSmartExtract = async () => {
    if (!smartText.trim()) return;
    setIsExtracting(true);
    try {
        const extracted = await extractPersonData(smartText);
        const updates: any = {};
        (Object.keys(extracted) as Array<keyof Person>).forEach(key => {
            if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== '') {
                updates[key] = extracted[key];
            }
        });
        onUpdate(person.id, updates);
        setShowSmartModal(false);
        setSmartText('');
    } catch (e) {
        alert("Failed to extract data.");
    } finally {
        setIsExtracting(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-4 relative mb-4">
        <div className="shrink-0 space-y-1.5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-teal-400 dark:hover:border-teal-400 bg-stone-50 dark:bg-stone-800 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group transition-all"
          >
            {person.photoUrl ? (
              <>
                <img src={person.photoUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleChange('photoUrl', ''); }}
                  className="absolute top-1 right-1 p-0.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t.removePhoto}
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <Camera className="w-8 h-8 text-stone-300 dark:text-stone-500 group-hover:text-teal-400 transition-colors" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="flex flex-col items-start gap-y-1">
          <button
            onClick={() => setShowSmartModal(true)}
            className="py-1 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> {t.smartFill}
          </button>
          <p className="text-[9px] text-stone-500 dark:text-stone-400 mt-0.5">{t.smartFillDescription}</p>
        </div>
      </div>

      <Card title={t.identity}>
        <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <FormField label={t.firstName} value={person.firstName} onCommit={(v) => handleChange('firstName', v)} labelWidthClass="w-24" />
          <FormField label={t.middleName} value={person.middleName} onCommit={(v) => handleChange('middleName', v)} labelWidthClass="w-24" />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <FormField label={t.lastName} value={person.lastName} onCommit={(v) => handleChange('lastName', v)} labelWidthClass="w-24" />
            </div>
            <button
              onClick={() => setShowMoreIdentityFields(!showMoreIdentityFields)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              title={t.moreNames || 'More Names'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showMoreIdentityFields ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showMoreIdentityFields && (
            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <FormField label={t.birthName} value={person.birthName} onCommit={(v) => handleChange('birthName', v)} labelWidthClass="w-24" />
              <FormField label={t.nickName} value={person.nickName} onCommit={(v) => handleChange('nickName', v)} labelWidthClass="w-24" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <FormField label={t.title} value={person.title} onCommit={(v) => handleChange('title', v)} labelWidthClass="w-24" />
                </div>
                <div className="flex-1">
                  <FormField label={t.suffix} value={person.suffix} onCommit={(v) => handleChange('suffix', v)} labelWidthClass="w-24" />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Smart Extract Modal */}
      {showSmartModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-md w-full p-4 border border-stone-100 dark:border-stone-700 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2 text-stone-800 dark:text-white">
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI Data Extractor
              </h3>
              <button onClick={() => setShowSmartModal(false)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
            <textarea
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              placeholder="Paste text here..."
              className="w-full h-32 p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none resize-none"
            />
            <button
              onClick={handleSmartExtract}
              disabled={isExtracting || !smartText.trim()}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autofill Details'}
            </button>
          </div>
        </div>
      )}
    </>
  );
});