import { memo, useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  FolderOpen,
  Save,
  Trash2,
  Loader2,
  AlertTriangle,
  FileText,
  Info,
  Upload,
} from 'lucide-react';
import { DriveFileManagerModalProps } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { showError, showSuccess } from '../utils/toast';
import { format } from 'date-fns';

export const DriveFileManagerModal = memo<DriveFileManagerModalProps>(
  ({
    isOpen,
    onClose,
    files,
    currentActiveFileId,
    onLoadFile,
    onSaveAsNewFile,
    onOverwriteExistingFile,
    onDeleteFile,
    refreshDriveFiles,
    isSaving,
    isDeleting,
    isListing,
    onImportLocalFile,
  }) => {
    const { t, language } = useTranslation();
    const [newFileName, setNewFileName] = useState('');
    const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isOpen) {
        if (newFileName !== '') setTimeout(() => setNewFileName(''), 0);
        if (confirmOverwriteId !== null) setTimeout(() => setConfirmOverwriteId(null), 0);
        if (confirmDeleteId !== null) setTimeout(() => setConfirmDeleteId(null), 0);
        refreshDriveFiles();
      }
    }, [isOpen, refreshDriveFiles, newFileName, confirmOverwriteId, confirmDeleteId]);

    if (!isOpen) return null;

    const handleSaveAsNew = async () => {
      if (!newFileName.trim()) {
        showError(t.googleDriveFileNameRequired);
        return;
      }
      await onSaveAsNewFile(newFileName.trim());
      setNewFileName('');
      onClose();
    };

    const handleImportClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as unknown;

        // Delegate to parent so it can call loadFullState/useAppStore
        await onImportLocalFile(data);

        showSuccess('File imported successfully!');
        onClose();
      } catch (error) {
        console.error('Import error:', error);
        showError('Failed to import file. Please check the file format.');
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleOverwrite = async (fileId: string) => {
      await onOverwriteExistingFile(fileId);
      setConfirmOverwriteId(null);
      onClose();
    };

    const handleDelete = async (fileId: string) => {
      await onDeleteFile(fileId);
      setConfirmDeleteId(null);
    };

    const handleLoad = async (fileId: string) => {
      await onLoadFile(fileId);
      onClose();
    };

    const formatDate = (isoString: string) => {
      try {
        return format(
          new Date(isoString),
          language === 'ar' ? 'dd/MM/yyyy HH:mm' : 'MMM dd, yyyy HH:mm'
        );
      } catch {
        return isoString;
      }
    };

    return (
      <div className='fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
        <div className='bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scale-in border border-stone-200 dark:border-stone-700'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50'>
            <div className='flex items-center gap-2'>
              <div className='p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400'>
                <Cloud className='w-5 h-5' />
              </div>
              <h3 className='text-lg font-bold text-stone-800 dark:text-white'>
                {t.manageDriveFiles}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label={t.close || 'Close'}
              className='p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='p-6 space-y-8 flex-1 overflow-y-auto scrollbar-thin bg-stone-50/30 dark:bg-stone-900/30'>
            {/* Create New Backup Section */}
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
                      onChange={(e) => setNewFileName(e.target.value)}
                      className='w-full ps-10 pe-4 py-3 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-stone-900 dark:text-white transition-all'
                      disabled={isSaving}
                    />
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={handleSaveAsNew}
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
                      onClick={handleImportClick}
                      disabled={isSaving}
                      className='p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-[0.95] flex items-center justify-center'
                      title='Import local JSON'
                    >
                      <Upload className='w-5 h-5' />
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.json'
                  onChange={handleFileImport}
                  className='hidden'
                />
              </div>
            </section>

            {/* Existing Backups Section */}
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
                    {files.length} {t.backups || 'Backups'}
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
                  <h5 className='text-stone-600 dark:text-stone-300 font-bold mb-1'>{t.noBackups || 'No Backups Found'}</h5>
                  <p className='text-xs max-w-xs leading-relaxed'>{t.noDriveFiles}</p>
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-4'>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`group relative bg-white dark:bg-stone-800 p-4 rounded-2xl border transition-all duration-300 ${file.id === currentActiveFileId
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
                            {file.id === currentActiveFileId && (
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
                            <span className='opacity-80'>{t.backupFile || 'Backup File'}</span>
                          </div>
                        </div>

                        <div className='flex items-center gap-2'>
                          <div className='flex transition-all duration-300'>
                            {confirmOverwriteId === file.id ? (
                              <button
                                onClick={() => handleOverwrite(file.id)}
                                className='px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 animate-in slide-in-from-right-2'
                              >
                                <AlertTriangle className='w-3.5 h-3.5' />
                                {t.confirmOverwrite}
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmOverwriteId(file.id)}
                                disabled={isSaving || file.id === currentActiveFileId}
                                className='p-2.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all disabled:opacity-30'
                                title={t.overwrite}
                              >
                                <Save className='w-4 h-4' />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handleLoad(file.id)}
                            disabled={isSaving || isDeleting || file.id === currentActiveFileId}
                            className='px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-200 dark:disabled:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:shadow-none'
                          >
                            <FolderOpen className='w-4 h-4' />
                            {t.load}
                          </button>

                          <div className='flex'>
                            {confirmDeleteId === file.id ? (
                              <button
                                onClick={() => handleDelete(file.id)}
                                className='px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-500/20 animate-in slide-in-from-right-2'
                              >
                                <Trash2 className='w-3.5 h-3.5' />
                                {t.confirmDelete}
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(file.id)}
                                disabled={isDeleting || file.id === currentActiveFileId}
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
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className='p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 flex justify-end'>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-[0.98]'
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
