import { memo, useRef, useState } from 'react';
import { Person, PersonUpdateHandler } from '../../../../types';
import { FormField } from '../../../../components/ui/FormField';
import { Card } from '../../../../components/ui/Card';
import { Camera, X, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';
import { showToast } from '../../../../utils/showToast';
import { usePhotoUpload } from '../../../../hooks/utils/usePhotoUpload';
import { getPersonPhoto, hasPersonPhoto } from '../../../../utils/mediaUtils';
import { SmartAvatar } from '../../../../components/ui/SmartAvatar';

interface PersonIdentityEditProps {
  person: Person;
  onUpdate: PersonUpdateHandler;
}

export const PersonIdentityEdit = memo<PersonIdentityEditProps>(({ person, onUpdate }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [smartText, setSmartText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showMoreIdentityFields, setShowMoreIdentityFields] = useState(false);

  const handleChange = (field: keyof Person, value: Person[keyof Person]) => {
    onUpdate(person.id, { [field]: value });
  };

  const { isUploading, handleUpload, handleDelete } = usePhotoUpload();

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
      const { extractPersonData } = await import('../../../../services/geminiService');
      const extracted = await extractPersonData(smartText);
      const updates: Partial<Person> = {};
      (Object.keys(extracted) as Array<keyof Person>).forEach((key) => {
        if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== '') {
          (updates as Record<string, unknown>)[key] = extracted[key];
        }
      });
      onUpdate(person.id, updates);
      setShowSmartModal(false);
      setSmartText('');
      showToast.success('extractSuccess');
    } catch {
      showToast.error('extractError');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <>
      <div className='ds-persona-section flex items-start gap-4 relative mb-4 p-4'>
        <div className='shrink-0 space-y-1.5'>
          <div className='w-24 h-24 relative group'>
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label={t.uploadPhoto}
              aria-busy={isUploading}
              className='w-full h-full rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-soft)] hover:border-[var(--primary-500)] bg-[var(--surface-subtle)] flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]'
            >
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              {hasPersonPhoto(person) ? (
                <SmartAvatar
                  person={{ ...person, photoUrl: getPersonPhoto(person) || person.photoUrl }}
                  size={96}
                  className='rounded-[var(--radius-md)] opacity-80 transition-opacity group-hover:opacity-100'
                />
              ) : (
                <Camera className='w-8 h-8 text-[var(--text-dim)] group-hover:text-[var(--primary-500)] transition-colors' />
              )}
            </button>
            {hasPersonPhoto(person) && !isUploading && (
              <button
                type='button'
                onClick={() => handleDelete(person.id)}
                className='absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] transition-opacity'
                title={t.removePhoto}
                aria-label={t.removePhoto}
              >
                <X className='w-3 h-3' />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            className='hidden'
            onChange={handleImageUpload}
            aria-label={t.uploadPhoto}
          />
        </div>

        <div className='flex flex-col items-start gap-y-1'>
          <button
            onClick={() => setShowSmartModal(true)}
            className='py-1 px-4 bg-[var(--color-info-500)] text-white text-xs font-bold rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:brightness-110 hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5'
          >
            <Sparkles className='w-3.5 h-3.5' /> {t.smartFill}
          </button>
          <p className='text-[11px] text-[var(--text-muted)] mt-0.5'>
            {t.smartFillDescription}
          </p>
        </div>
      </div>

      <div
        data-smart-persona-field="identity"
        tabIndex={-1}
        className="scroll-mt-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50"
      >
        <Card title={t.identity} tone='flat'>
          <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
          <FormField
            label={t.firstName}
            value={person.firstName}
            onCommit={(v) => handleChange('firstName', v as string)}
            labelWidthClass='w-24'
          />
          <FormField
            label={t.middleName}
            value={person.middleName}
            onCommit={(v) => handleChange('middleName', v as string)}
            labelWidthClass='w-24'
          />

          <div className='flex items-center gap-2'>
            <div className='flex-1'>
              <FormField
                label={t.lastName}
                value={person.lastName}
                onCommit={(v) => handleChange('lastName', v as string)}
                labelWidthClass='w-24'
              />
            </div>
            <button
              onClick={() => setShowMoreIdentityFields(!showMoreIdentityFields)}
              className='w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-dim)] hover:bg-[var(--theme-bg)] transition-colors'
              title={t.moreNames}
              aria-label={t.moreNames}
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
                onCommit={(v) => handleChange('birthName', v as string)}
                labelWidthClass='w-24'
              />
              <FormField
                label={t.nickName}
                value={person.nickName}
                onCommit={(v) => handleChange('nickName', v as string)}
                labelWidthClass='w-24'
              />
              <div className='flex gap-2'>
                <div className='flex-1'>
                  <FormField
                    label={t.title}
                    value={person.title}
                    onCommit={(v) => handleChange('title', v as string)}
                    labelWidthClass='w-24'
                  />
                </div>
                <div className='flex-1'>
                  <FormField
                    label={t.suffix}
                    value={person.suffix}
                    onCommit={(v) => handleChange('suffix', v as string)}
                    labelWidthClass='w-24'
                  />
                </div>
              </div>
            </div>
          )}
          </div>
        </Card>
      </div>

      {/* Smart Extract Modal */}
      {showSmartModal && (
        <div className='ds-overlay-backdrop fixed inset-0 z-[var(--z-index-overlay)] flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='ds-overlay-card max-w-md w-full p-4 flex flex-col gap-3'>
            <div className='flex justify-between items-center'>
              <h3 className='font-bold flex items-center gap-2 text-[var(--text-main)]'>
                <Sparkles className='w-4 h-4 text-purple-500' />
                {t.aiDataExtractor}
              </h3>
              <button
                onClick={() => setShowSmartModal(false)}
                aria-label={t.close}
                className='p-1 hover:bg-[var(--surface-subtle)] rounded-full'
              >
                <X className='w-4 h-4 text-[var(--text-muted)]' />
              </button>
            </div>
            <textarea
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              placeholder={t.pasteTextHere}
              className='ds-input w-full h-32 p-3 text-sm resize-none'
            />
            <button
              onClick={handleSmartExtract}
              disabled={isExtracting || !smartText.trim()}
              className='w-full py-2 bg-[var(--color-info-500)] hover:brightness-110 disabled:opacity-40 text-white rounded-[var(--radius-md)] font-bold text-sm flex items-center justify-center gap-2 transition-all'
            >
              {isExtracting ? <Loader2 className='w-4 h-4 animate-spin' /> : t.autofillDetails}
            </button>
          </div>
        </div>
      )}
    </>
  );
});
