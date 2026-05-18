import { FileText, Save, Upload, Cloud, Loader2 } from 'lucide-react';
import { memo, type ChangeEvent, type RefObject } from 'react';
import type { DriveFileManagerTextProps } from './driveFileManagerTypes';

interface DriveFileSaveSectionProps extends DriveFileManagerTextProps {
  newFileName: string;
  isSaving: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileNameChange: (value: string) => void;
  onSaveAsNew: () => void | Promise<void>;
  onImportClick: () => void;
  onFileImport: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const DriveFileSaveSection = memo<DriveFileSaveSectionProps>(
  ({
    t,
    newFileName,
    isSaving,
    fileInputRef,
    onFileNameChange,
    onSaveAsNew,
    onImportClick,
    onFileImport,
  }) => (
    <section className='relative'>
      <div className='flex items-center gap-2 mb-4'>
        <div className='w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400'>
          <Save className='w-4 h-4' />
        </div>
        <h4 className='text-sm font-bold text-stone-700 dark:text-stone-200 uppercase tracking-tight'>
          {t.saveCurrentTree}
        </h4>
      </div>

      <div className='bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm transition-all hover:shadow-md'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='flex-1 relative group'>
            <FileText className='absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors' />
            <input
              type='text'
              placeholder={t.googleDriveFileName}
              value={newFileName}
              onChange={(event) => onFileNameChange(event.target.value)}
              className='w-full ps-10 pe-4 py-3 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-stone-900 dark:text-white transition-all'
              disabled={isSaving}
            />
          </div>
          <div className='flex gap-2'>
            <button
              onClick={onSaveAsNew}
              disabled={isSaving || !newFileName.trim()}
              className='flex-1 sm:flex-initial px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2'
            >
              {isSaving ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Cloud className='w-4 h-4' />
              )}
              {t.saveAsNewFile}
            </button>
            <button
              onClick={onImportClick}
              disabled={isSaving}
              className='p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-[0.95] flex items-center justify-center'
              title={t.importLocalJson}
            >
              <Upload className='w-5 h-5' />
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type='file'
          accept='.json'
          onChange={onFileImport}
          className='hidden'
        />
      </div>
    </section>
  )
);

DriveFileSaveSection.displayName = 'DriveFileSaveSection';
