import React, { useEffect, useState } from 'react';

import { AuthProps, Person } from '../types';
import { initializeGoogleApi } from '../services/googleService';
import { loadSharedFile } from '../services/proxyService';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';

interface SharedTreeLoaderProps {
  ownerUid: string;
  fileId: string;
  auth: AuthProps;
  onLoadComplete: (data: Record<string, Person>, fileId: string, isDbTree: boolean, role: 'owner' | 'editor' | 'viewer') => void;
  onCancel: () => void;
}

export const SharedTreeLoader: React.FC<SharedTreeLoaderProps> = ({
  ownerUid,
  fileId,
  auth,
  onLoadComplete,
  onCancel,
}) => {

  const [status, setStatus] = useState<
    'init' | 'checking_auth' | 'loading_file' | 'error' | 'unauthorized'
  >('init');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      // 1. Check Auth
      if (!auth.user) {
        setStatus('unauthorized');
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const isDbTree = urlParams.get('type') === 'db' || urlParams.get('treeId') !== null;

      if (!isDbTree) {
        await initializeGoogleApi();
      }

      // 2. Load File via Proxy
      setStatus('loading_file');
      try {
        // Use proxy service to fetch data through backend
        const data = await loadSharedFile(fileId, isDbTree, auth.user!.supabaseToken);

        let role: 'owner' | 'editor' | 'viewer' = 'viewer';
        if (isDbTree && auth.user?.email) {
          // Check role in DB
          const { getSupabaseWithAuth: getAuthClient } = await import('../services/supabaseClient');
          const client = getAuthClient(auth.user.uid, auth.user.email, auth.user.supabaseToken);
          const { data: share } = await client
            .from('tree_shares')
            .select('collaborators, owner_uid')
            .eq('tree_id', fileId)
            .single();

          if (share) {
            if (share.owner_uid === auth.user.uid) {
              role = 'owner';
            } else {
              const collab = share.collaborators?.find(
                (c: any) => c.email.toLowerCase() === auth.user!.email!.toLowerCase()
              );
              role = collab?.role || 'viewer';
            }
          }
        }

        onLoadComplete(data, fileId, isDbTree, role);
      } catch (err: unknown) {
        console.error('Failed to load shared tree', err);
        setStatus('error');
        const msg = err instanceof Error ? err.message : 'Failed to access the shared file.';
        setErrorMsg(msg);
      }
    };
    load();
  }, [ownerUid, fileId, auth.user]);

  if (status === 'unauthorized') {
    return (
      <div className='flex flex-col items-center justify-center h-screen bg-stone-50 dark:bg-stone-950 p-4 text-center'>
        <div className='bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-xl max-w-md w-full border border-stone-200 dark:border-stone-800'>
          <div className='w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400'>
            <LogIn className='w-8 h-8' />
          </div>
          <h2 className='text-2xl font-bold mb-2 text-stone-800 dark:text-gray-100'>
            Login Required
          </h2>
          <p className='text-stone-600 dark:text-stone-400 mb-8'>
            You need to be logged in to access this shared family tree.
          </p>
          <button
            onClick={() => auth.onOpenLoginModal()}
            className='w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2'
          >
            <LogIn className='w-5 h-5' />
            Login with Google
          </button>
          <button
            onClick={onCancel}
            className='mt-4 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline'
          >
            Go to Home
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
            Access Denied
          </h2>
          <p className='text-red-600 dark:text-red-400 mb-6 font-medium'>{errorMsg}</p>
          <p className='text-stone-500 text-sm mb-8'>
            Make sure the owner has invited your email address ({auth.user?.email}) to view this
            tree.
          </p>
          <button
            onClick={onCancel}
            className='px-6 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-lg font-bold transition-colors'
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // specific layout for 'init' | 'checking_auth' | 'loading_file'
  return (
    <div className='flex flex-col items-center justify-center h-screen bg-stone-50 dark:bg-stone-950'>
      <div className='flex flex-col items-center gap-4 animate-pulse'>
        <Loader2 className='w-12 h-12 text-blue-600 animate-spin' />
        <p className='text-stone-500 font-medium'>Loading shared tree...</p>
      </div>
    </div>
  );
};
