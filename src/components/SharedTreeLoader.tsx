import React from 'react';

import { AuthProps, Person } from '../types';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';
import { EMPTY_STRING } from '../constants';
import { useTranslation } from '../context/TranslationContext';
import { useSharedTreeLoadFlow } from '../hooks/useSharedTreeLoadFlow';

interface SharedTreeLoaderProps {
  ownerUid: string;
  fileId: string;
  auth: AuthProps;
  onLoadComplete: (
    data: Record<string, Person>,
    fileId: string,
    isDbTree: boolean,
    role: 'owner' | 'editor' | 'viewer',
    treeName?: string
  ) => void;
  onCancel: () => void;
  isDbTree?: boolean;
}

export const SharedTreeLoader: React.FC<SharedTreeLoaderProps> = ({
  ownerUid,
  fileId,
  auth,
  onLoadComplete,
  onCancel,
  isDbTree: isDbTreeProp,
}) => {
  const { t } = useTranslation();
  const { status, errorMsg, statusDetail } = useSharedTreeLoadFlow({
    ownerUid,
    fileId,
    auth,
    isDbTree: isDbTreeProp,
    onLoadComplete,
    text: {
      acceptingInvitation: (t.sharedLoader as Record<string, string> | undefined)?.acceptingInvitation,
      invitationAccepted: (t.sharedLoader as Record<string, string> | undefined)?.invitationAccepted,
    },
  });
  const currentPathWithSearch = `${window.location.pathname}${window.location.search}`;

  if (status === 'unauthorized') {
    return (
      <div className='flex flex-col items-center justify-center h-screen bg-stone-50 dark:bg-stone-950 p-4 text-center'>
        <div className='bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-xl max-w-md w-full border border-stone-200 dark:border-stone-800'>
          <div className='w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400'>
            <LogIn className='w-8 h-8' />
          </div>
          <h2 className='text-2xl font-bold mb-2 text-stone-800 dark:text-gray-100'>
            {t.sharedLoader.loginRequired}
          </h2>
          <p className='text-stone-600 dark:text-stone-400 mb-8'>
            {t.sharedLoader.loginPrompt}
          </p>
          <button
            onClick={() => auth.onOpenLoginModal(currentPathWithSearch)}
            className='w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2'
          >
            <LogIn className='w-5 h-5' />
            {t.sharedLoader.loginWithGoogle}
          </button>
          <button
            onClick={onCancel}
            className='mt-4 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline'
          >
            {t.sharedLoader.goToHome}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className='flex flex-col items-center justify-center h-screen bg-stone-50 dark:bg-stone-950 p-4 text-center'>
        <div className='bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-200 dark:border-red-900/50'>
          <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400'>
            <AlertCircle className='w-8 h-8' />
          </div>
          <h2 className='text-2xl font-bold mb-2 text-stone-800 dark:text-gray-100'>
            {t.sharedLoader.accessDenied}
          </h2>
          <p className='text-red-600 dark:text-red-400 mb-6 font-medium'>{errorMsg}</p>
          <p className='text-stone-500 text-sm mb-8'>
            {t.sharedLoader.invitationCheck.replace('{email}', auth.user?.email || EMPTY_STRING)}
          </p>
          <button
            onClick={onCancel}
            className='px-6 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-lg font-bold transition-colors'
          >
            {t.sharedLoader.backToHome}
          </button>
        </div>
      </div>
    );
  }

  // specific layout for 'init' | 'checking_auth' | 'loading_file'
  return (
    <div className='fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--theme-bg)] animate-in fade-in duration-500'>
      <style>
        {`
          @keyframes jozor-pulse {
            0%, 100% { transform: scale(0.9); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          .animate-jozor-pulse {
            animation: jozor-pulse 2s ease-in-out infinite;
          }
        `}
      </style>
      <img 
        src="/jozor-icon.svg" 
        alt="Loading..." 
        className="w-[120px] h-[120px] animate-jozor-pulse object-contain"
      />
    </div>
  );
};
