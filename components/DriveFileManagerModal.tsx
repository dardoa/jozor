"use client";

import React, { memo, useState, useEffect } from 'react';
import { X, Cloud, FolderOpen, Save, Trash2, Loader2, AlertTriangle, FileText, Info } from 'lucide-react';
import { DriveFileManagerModalProps } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { showError } from '../utils/toast';
import { format } from 'date-fns';

export const DriveFileManagerModal: React.FC<DriveFileManagerModalProps> = memo(({
  isOpen,
  onClose,
  files,
  currentActiveFileId,
  onLoadFile,
  onSaveAsNewFile,
  onOverwriteExistingFile,
  onDeleteFile,
  isSaving,
  isDeleting,
  isListing,
}) => {
  const { t, language } = useTranslation();
  const [newFileName, setNewFileName] = useState('');
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      console.log("DriveFileManagerModal is open!"); // Added log
      setNewFileName('');
      setConfirmOverwriteId(null);
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

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
      return format(new Date(isoString), language === 'ar' ? 'dd/MM/yyyy HH:mm' : 'MMM dd, yyyy HH:mm');
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-stone-200 dark:border-stone-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                 <Cloud className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-stone-800 dark:text-white">{t.manageDriveFiles}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-thin bg-white dark:bg-stone-800">
          {/* Save Current Tree Section */}
          <div className="bg-white dark:bg-stone-900 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-3 relative">
            <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-900 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.saveCurrentTree}</h3>
            
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-400 shrink-0" />
              <input 
                type="text" 
                placeholder={t.googleDriveFileName}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-900 dark:text-white"
                disabled={isSaving}
              />
              <button 
                onClick={handleSaveAsNew}
                disabled={isSaving || !newFileName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t.saveAsNewFile}
              </button>
            </div>
          </div>

          {/* Existing Files Section */}
          <div className="bg-white dark:bg-stone-900 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-3 relative">
            <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-900 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.existingDriveFiles}</h3>
            
            {isListing ? (
              <div className="flex flex-col items-center justify-center py-8 text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                <p className="text-sm">{t.loadingFiles}</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">{t.noDriveFiles}</span>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
                {files.map((file) => (
                  <div key={file.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                    <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="font-bold text-sm text-stone-800 dark:text-white truncate">{file.name}</span>
                        {file.id === currentActiveFileId && (
                          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold shrink-0">{t.active}</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 ms-6">{t.lastModified}: {formatDate(file.modifiedTime)}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:ms-4">
                      {confirmOverwriteId === file.id ? (
                        <button 
                          onClick={() => handleOverwrite(file.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-md text-xs font-bold flex items-center gap-1"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {t.confirmOverwrite}
                        </button>
                      ) : (
                        <button 
                          onClick={() => setConfirmOverwriteId(file.id)}
                          disabled={isSaving || file.id === currentActiveFileId}
                          className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition-colors rounded-md text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" /> {t.overwrite}
                        </button>
                      )}

                      <button 
                        onClick={() => handleLoad(file.id)}
                        disabled={isSaving || isDeleting || file.id === currentActiveFileId}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors rounded-md text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> {t.load}
                      </button>

                      {confirmDeleteId === file.id ? (
                        <button 
                          onClick={() => handleDelete(file.id)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-md text-xs font-bold flex items-center gap-1"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          {t.confirmDelete}
                        </button>
                      ) : (
                        <button 
                          onClick={() => setConfirmDeleteId(file.id)}
                          disabled={isDeleting || file.id === currentActiveFileId}
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors rounded-md text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t.delete}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
});