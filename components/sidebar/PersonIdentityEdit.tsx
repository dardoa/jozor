import { memo, useRef, useState } from 'react';
import { Person } from '../../types';
import { FormField } from '../ui/FormField';
import { Card } from '../ui/Card';
import { Camera, X, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { extractPersonData } from '../../services/geminiService';
import { useTranslation } from '../../context/TranslationContext';
import { showError, showSuccess } from '../../utils/toast'; // Import toast utilities
import { usePhotoUpload } from '../../hooks/usePhotoUpload';

interface PersonIdentityEditProps {
  person: Person;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const PersonIdentityEdit = memo<PersonIdentityEditProps>(({ person, onUpdate }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [smartText, setSmartText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showMoreIdentityFields, setShowMoreIdentityFields] = useState(false);

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const { isUploading, handleUpload } = usePhotoUpload();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleUpload(file, person.id);

    // Reset input
    e.target.value = '';
  };

  const handleSmartExtract = async () => {
    if (!smartText.trim()) return;
    setIsExtracting(true);
    try {
      const extracted = await extractPersonData(smartText);
      const updates: any = {};
      (Object.keys(extracted) as Array<keyof Person>).forEach((key) => {
        if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== '') {
          updates[key] = extracted[key];
        }
      });
      onUpdate(person.id, updates);
      setShowSmartModal(false);
      setSmartText('');
      showSuccess('Data extracted and autofilled successfully!'); // Toast success
    } catch (e) {
      showError('Failed to extract data.'); // Use toast
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <>
      <div className='flex items-start gap-4 relative mb-4'>
        <div className='shrink-0 space-y-1.5'>
          <div
            onClick={() => fileInputRef.current?.click()}
            className='w-24 h-24 rounded-xl border-2 border-dashed border-[var(--border-main)] hover:border-[var(--primary-500)] bg-[var(--theme-bg)]/50 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group transition-all'
          >
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            {person.photoUrl ? (
              <>
                <img
                  src={person.photoUrl}
                  alt=''
                  className='w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity'
                />
                {!isUploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChange('photoUrl', '');
                      showSuccess('Profile photo removed.');
                    }} // Toast success
                    className='absolute top-1 right-1 p-0.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                    title={t.removePhoto}
                    aria-label={t.removePhoto}
                  >
                    <X className='w-3 h-3' />
                  </button>
                )}
              </>
            ) : (
              <Camera className='w-8 h-8 text-[var(--text-dim)] group-hover:text-[var(--primary-500)] transition-colors' />
            )}
          </div>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleImageUpload}
            aria-label={t.uploadPhoto || 'Upload Photo'}
          />
        </div>

        <div className='flex flex-col items-start gap-y-1'>
          <button
            onClick={() => setShowSmartModal(true)}
            className='py-1 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5'
          >
            <Sparkles className='w-3.5 h-3.5' /> {t.smartFill}
          </button>
          <p className='text-[9px] text-[var(--text-muted)] mt-0.5'>
            {t.smartFillDescription}
          </p>
        </div>
      </div>

      <Card title={t.identity}>
        <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
          <FormField
            label={t.firstName}
            value={person.firstName}
            onCommit={(v: string) => handleChange('firstName', v)}
            labelWidthClass='w-24'
          />
          <FormField
            label={t.middleName}
            value={person.middleName}
            onCommit={(v: string) => handleChange('middleName', v)}
            labelWidthClass='w-24'
          />

          <div className='flex items-center gap-2'>
            <div className='flex-1'>
              <FormField
                label={t.lastName}
                value={person.lastName}
                onCommit={(v: string) => handleChange('lastName', v)}
                labelWidthClass='w-24'
              />
            </div>
            <button
              onClick={() => setShowMoreIdentityFields(!showMoreIdentityFields)}
              className='w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-dim)] hover:bg-[var(--theme-bg)] transition-colors'
              title={t.moreNames || 'More Names'}
              aria-label={t.moreNames || 'More Names'}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showMoreIdentityFields ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showMoreIdentityFields && (
            <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
              <FormField
                label={t.birthName}
                value={person.birthName}
                onCommit={(v: string) => handleChange('birthName', v)}
                labelWidthClass='w-24'
              />
              <FormField
                label={t.nickName}
                value={person.nickName}
                onCommit={(v: string) => handleChange('nickName', v)}
                labelWidthClass='w-24'
              />
              <div className='flex gap-2'>
                <div className='flex-1'>
                  <FormField
                    label={t.title}
                    value={person.title}
                    onCommit={(v: string) => handleChange('title', v)}
                    labelWidthClass='w-24'
                  />
                </div>
                <div className='flex-1'>
                  <FormField
                    label={t.suffix}
                    value={person.suffix}
                    onCommit={(v: string) => handleChange('suffix', v)}
                    labelWidthClass='w-24'
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Smart Extract Modal */}
      {showSmartModal && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
          <div className='bg-[var(--card-bg)] rounded-2xl shadow-2xl max-w-md w-full p-4 border border-[var(--border-main)] flex flex-col gap-3'>
            <div className='flex justify-between items-center'>
              <h3 className='font-bold flex items-center gap-2 text-[var(--text-main)]'>
                <Sparkles className='w-4 h-4 text-purple-500' />
                AI Data Extractor
              </h3>
              <button
                onClick={() => setShowSmartModal(false)}
                aria-label='Close'
                className='p-1 hover:bg-[var(--theme-bg)] rounded-full'
              >
                <X className='w-4 h-4 text-[var(--text-muted)]' />
              </button>
            </div>
            <textarea
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              placeholder='Paste text here...'
              className='w-full h-32 p-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--border-main)] text-sm focus:ring-2 focus:ring-purple-500/20 outline-none resize-none'
            />
            <button
              onClick={handleSmartExtract}
              disabled={isExtracting || !smartText.trim()}
              className='w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all'
            >
              {isExtracting ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Autofill Details'}
            </button>
          </div>
        </div>
      )}
    </>
  );
});
