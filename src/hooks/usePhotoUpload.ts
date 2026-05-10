import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTreeActions } from './useTreeActions';
import { showToast } from '../utils/showToast';
import { logError } from '../utils/errorLogger';

interface UsePhotoUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  handleUpload: (file: File, personId: string) => Promise<void>;
  handleDelete: (personId: string) => Promise<void>;
}

export const usePhotoUpload = (): UsePhotoUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadingRef = useRef<Set<string>>(new Set());

  const user = useAppStore((state) => state.user);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const treeActions = useTreeActions();

  const handleUpload = useCallback(async (file: File, personId: string) => {
    if (!user?.uid || !currentTreeId) {
      showToast.error('You must be logged in and inside a tree to upload photos.');
      return;
    }

    if (uploadingRef.current.has(personId)) {
      showToast.info('An upload is already in progress for this person.');
      return;
    }

    // Validate file type (frontend check for immediate feedback, service has backend check too)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast.error('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    try {
      uploadingRef.current.add(personId);
      setIsUploading(true);
      setUploadProgress(10);

      const { SupabaseStorageService } = await import('../services/supabaseStorageService');
      const currentPerson = useAppStore.getState().people[personId];
      const uploadResult = await SupabaseStorageService.uploadAndCompressImage({
        treeId: currentTreeId,
        personId,
        file,
        uid: user.uid,
        email: user.email || '',
        token: (user as any).supabaseToken,
        currentVersion: currentPerson?.photoVersion || 0,
        onProgress: (p) => setUploadProgress(p)
      });

      // Update local state and trigger sync side-effects
      treeActions.updatePerson(personId, { 
        photoUrl: uploadResult.publicUrl,
        photoPath: uploadResult.photoPath,
        photoVersion: uploadResult.photoVersion
      });

      showToast.success('Photo uploaded successfully');
    } catch (error: unknown) {
      logError('PHOTO_UPLOAD_FAILED', error, { showToast: false, metadata: { personId, treeId: currentTreeId } });
      const msg = error instanceof Error ? error.message : 'Unknown error';
      showToast.error(`Failed to upload photo: ${msg}`);
    } finally {
      uploadingRef.current.delete(personId);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user, currentTreeId, treeActions]);

  const handleDelete = useCallback(async (personId: string) => {
    if (!user?.uid || !currentTreeId) return;

    try {
      setIsUploading(true);
      const { SupabaseStorageService } = await import('../services/supabaseStorageService');
      
      // 1. Physical delete from Storage
      await SupabaseStorageService.deletePersonPhoto(
        currentTreeId, 
        personId, 
        user.uid, 
        user.email || '', 
        (user as any).supabaseToken
      );

      // 2. Metadata delete from DB
      treeActions.updatePerson(personId, { 
        photoUrl: '', 
        photoPath: '', 
        photoVersion: 0
      });

      showToast.success('photoRemoved');
    } catch (error: unknown) {
      logError('PHOTO_DELETE_FAILED', error, { showToast: false, metadata: { personId, treeId: currentTreeId } });
      showToast.error('Failed to remove photo from server');
    } finally {
      setIsUploading(false);
    }
  }, [user, currentTreeId, treeActions]);

  return {
    isUploading,
    uploadProgress,
    handleUpload,
    handleDelete,
  };
};
