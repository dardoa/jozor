"use client";

import React, { useState } from 'react';
import { Language, UserProfile } from '../types';
import { X, Share2, Copy, Globe, Info } from 'lucide-react'; // Removed UserPlus, Mail, Shield, Check, Trash2
import { useTranslation } from '../context/TranslationContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  user: UserProfile | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, language, user }) => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  
  if (!isOpen) return null;

  const copyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-stone-200 dark:border-stone-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                 <Share2 className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-stone-800 dark:text-white">{t.shareTree}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Link Sharing */}
            <div className="p-3 bg-stone-50 dark:bg-stone-900/50 rounded-lg border border-dashed border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 overflow-hidden">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">https://jozor.app/tree/{user?.uid?.substring(0,8) || 'demo'}</span>
                </div>
                <button onClick={copyLink} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1">
                    {isCopied ? <Info className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? t.copied : t.copyLink}
                </button>
            </div>

            {/* Coming Soon for Collaborators */}
            <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-2 relative">
                <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.collaborators}</h3>
                <div className="text-center py-8 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
                    <Info className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">{t.comingSoon}</span>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {t.inviteCollaborator} {t.requiresBackend}
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};