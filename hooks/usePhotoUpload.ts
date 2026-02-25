import { useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTreeActions } from './useTreeActions';
import { SupabaseStorageService } from '../services/SupabaseStorageService';
import { showError, showSuccess } from '../utils/toast';

interface UsePhotoUploadReturn {
  isUploading: boolean;
  handleUpload: (file: File, personId: string) => Promise<void>;
}

export const usePhotoUpload = (): UsePhotoUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);

  const user = useAppStore((state) => state.user);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const treeActions = useTreeActions();

  const handleUpload = useCallback(async (file: File, personId: string) => {
    if (!user?.uid || !currentTreeId) {
      showError('You must be logged in and inside a tree to upload photos.');
      return;
    }

    // Validate file type (frontend check for immediate feedback, service has backend check too)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    try {
      setIsUploading(true);

      const downloadURL = await SupabaseStorageService.uploadAndCompressImage({
        treeId: currentTreeId,
        personId,
        file,
        uid: user.uid,
        email: user.email || '',
        token: user.supabaseToken
      });

      // Update local state and trigger sync side-effects
      treeActions.updatePerson(personId, { photoUrl: downloadURL });

      showSuccess('Photo uploaded successfully');
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      const msg = error?.message || 'Unknown error';
      showError(`Failed to upload photo: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  }, [user, currentTreeId, treeActions]);

  return {
    isUploading,
    handleUpload,
  };
};
