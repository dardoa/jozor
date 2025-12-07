"use client";

import React, { memo } from 'react';
import { X, Cloud, HardDriveUpload, HardDriveDownload, AlertTriangle } from 'lucide-react';
import { GoogleSyncChoiceModalProps } from '../types';
import { useTranslation } from '../context/TranslationContext';

export const GoogleSyncChoiceModal: React.FC<GoogleSyncChoiceModalProps> = memo(({
  isOpen,
  onClose,
  onLoadCloud,
  onSaveNewCloud,
  driveFileId, // Destructure driveFileId from props
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-stone-200 dark:border-stone-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                 <Cloud className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-stone-800 dark:text-white">{t.googleDriveSyncTitle}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 bg-white dark:bg-stone-800">
          {/* Warning Message */}
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl text-orange-700 dark:text-orange-300 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t.googleDriveSyncWarning}</span>
          </div>

          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            {t.googleDriveSyncPrompt}
          </p>

          {/* Option 1: Load from Drive */}
          <button 
            onClick={() => onLoadCloud(driveFileId!)} // Pass the driveFileId
            className="group relative w-full py-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-200 dark:hover:border-blue-700 transition-all flex items-center justify-center gap-4 text-start"
          >
            <div className="w-10 h-10 bg-white dark:bg-blue-800 rounded-full flex items-center justify-center shadow-sm text-blue-600 dark:text-blue-200 group-hover:scale-110 transition-transform">
                <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
                <div className="font-bold text-blue-900 dark:text-blue-200">{t.googleDriveLoadExisting}</div>
                <div className="text-sm text-blue-600/80 dark:text-blue-300/80">{t.googleDriveLoadExistingDesc}</div>
            </div>
          </button>

          {/* Option 2: Save as New File */}
          <button 
            onClick={onSaveNewCloud}
            className="group relative w-full py-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all flex items-center justify-center gap-4 text-start"
          >
            <div className="w-10 h-10 bg-white dark:bg-emerald-800 rounded-full flex items-center justify-center shadow-sm text-emerald-600 dark:text-emerald-200 group-hover:scale-110 transition-transform">
                <HardDriveUpload className="w-5 h-5" />
            </div>
            <div>
                <div className="font-bold text-emerald-900 dark:text-emerald-200">{t.googleDriveSaveNewFile}</div>
                <div className="text-sm text-emerald-600/80 dark:text-emerald-300/80">{t.googleDriveSaveNewFileDesc}</div>
            </div>
          </button>

          {/* Cancel Button */}
          <button 
            onClick={onClose}
            className="w-full py-3 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-[0.98] mt-4"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
});