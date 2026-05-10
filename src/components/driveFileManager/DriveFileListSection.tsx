import { AlertTriangle, Cloud, FolderOpen, Info, Loader2, Save, Trash2 } from 'lucide-react';
import { memo } from 'react';
import type { DriveFileManagerFile, DriveFileManagerTextProps } from './driveFileManagerTypes';

interface DriveFileListSectionProps extends DriveFileManagerTextProps {
  files: DriveFileManagerFile[];
  currentActiveFileId: string | null;
  confirmOverwriteId: string | null;
  confirmDeleteId: string | null;
  isSaving: boolean;
  isDeleting: boolean;
  isListing: boolean;
  formatDate: (isoString: string) => string;
  onConfirmOverwriteChange: (fileId: string | null) => void;
  onConfirmDeleteChange: (fileId: string | null) => void;
  onOverwrite: (fileId: string) => void | Promise<void>;
  onDelete: (fileId: string) => void | Promise<void>;
  onLoad: (fileId: string) => void | Promise<void>;
}

export const DriveFileListSection = memo<DriveFileListSectionProps>(
  ({
    t,
    files,
    currentActiveFileId,
    confirmOverwriteId,
    confirmDeleteId,
    isSaving,
    isDeleting,
    isListing,
    formatDate,
    onConfirmOverwriteChange,
    onConfirmDeleteChange,
    onOverwrite,
    onDelete,
    onLoad,
  }) => (
    <section className='relative'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400'>
            <FolderOpen className='w-4 h-4' />
          </div>
          <h4 className='text-sm font-bold text-stone-700 dark:text-stone-200 uppercase tracking-tight'>
            {t.existingDriveFiles}
          </h4>
        </div>
        {files.length > 0 && (
          <span className='text-[10px] font-bold px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full border border-stone-200 dark:border-stone-700'>
            {files.length} {t.backups}
          </span>
        )}
      </div>

      {isListing ? (
        <div className='flex flex-col items-center justify-center py-16 text-stone-400 bg-white/50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700'>
          <Loader2 className='w-10 h-10 animate-spin mb-4 text-blue-500' />
          <p className='text-sm font-medium'>{t.loadingFiles}</p>
        </div>
      ) : files.length === 0 ? (
        <div className='text-center py-16 text-stone-400 dark:text-stone-500 bg-white/50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center px-8'>
          <div className='p-4 bg-stone-100 dark:bg-stone-800 rounded-full mb-4'>
            <Info className='w-8 h-8 opacity-40' />
          </div>
          <h5 className='text-stone-600 dark:text-stone-300 font-bold mb-1'>{t.noBackups}</h5>
          <p className='text-xs max-w-xs leading-relaxed'>{t.noDriveFiles}</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4'>
          {files.map((file) => {
            const isActive = file.id === currentActiveFileId;

            return (
              <div
                key={file.id}
                className={`group relative bg-white dark:bg-stone-800 p-4 rounded-2xl border transition-all duration-300 ${isActive
                  ? 'border-blue-500 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 shadow-md ring-1 ring-blue-500/20'
                  : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-lg'
                  }`}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <span className='font-bold text-stone-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                        {file.name}
                      </span>
                      {isActive && (
                        <span className='flex items-center gap-1 text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm animate-pulse'>
                          <Cloud className='w-2.5 h-2.5' /> {t.active}
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400'>
                      <span className='flex items-center gap-1 font-medium'>
                        {formatDate(file.modifiedTime)}
                      </span>
                      <span className='w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600' />
                      <span className='opacity-80'>{t.backupFile}</span>
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <div className='flex transition-all duration-300'>
                      {confirmOverwriteId === file.id ? (
                        <button
                          onClick={() => onOverwrite(file.id)}
                          className='px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 animate-in slide-in-from-right-2'
                        >
                          <AlertTriangle className='w-3.5 h-3.5' />
                          {t.confirmOverwrite}
                        </button>
                      ) : (
                        <button
                          onClick={() => onConfirmOverwriteChange(file.id)}
                          disabled={isSaving || isActive}
                          className='p-2.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all disabled:opacity-30'
                          title={t.overwrite}
                        >
                          <Save className='w-4 h-4' />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onLoad(file.id)}
                      disabled={isSaving || isDeleting || isActive}
                      className='px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-200 dark:disabled:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:shadow-none'
                    >
                      <FolderOpen className='w-4 h-4' />
                      {t.load}
                    </button>

                    <div className='flex'>
                      {confirmDeleteId === file.id ? (
                        <button
                          onClick={() => onDelete(file.id)}
                          className='px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-500/20 animate-in slide-in-from-right-2'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                          {t.confirmDelete}
                        </button>
                      ) : (
                        <button
                          onClick={() => onConfirmDeleteChange(file.id)}
                          disabled={isDeleting || isActive}
                          className='p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-30'
                          title={t.delete}
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  )
);
