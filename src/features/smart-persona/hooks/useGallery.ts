import { useCallback, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useTreeActions } from '../../../hooks/tree/useTreeActions';
import { showToast } from '../../../utils/showToast';
import { logError } from '../../../utils/errorLogger';
import type { GalleryItem } from '../services/supabaseGalleryService';

interface UseGalleryReturn {
  isUploading: boolean;
  addPhoto: (file: File, personId: string) => Promise<void>;
  removePhoto: (personId: string, itemId: string) => Promise<void>;
}

export const useGallery = (): UseGalleryReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const user = useAppStore((state) => state.user);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const treeActions = useTreeActions();

  const addPhoto = useCallback(async (file: File, personId: string) => {
    if (!user?.uid || !currentTreeId) {
      showToast.error('loginRequired');
      return;
    }

    try {
      setIsUploading(true);
      const { SupabaseGalleryService } = await import('../services/supabaseGalleryService');

      const newItem = await SupabaseGalleryService.uploadToGallery({
        treeId: currentTreeId,
        personId,
        file,
        uid: user.uid,
        email: user.email,
        token: (useAppStore.getState() as any).supabaseToken || undefined,
      });

      const person = useAppStore.getState().people[personId];
      const currentGallery = Array.isArray(person?.gallery) ? person.gallery : [];

      treeActions.updatePerson(personId, {
        gallery: [...currentGallery, newItem] as any,
      });

      showToast.success('Photo added to gallery');
    } catch (error: unknown) {
      logError('GALLERY_UPLOAD_FAILED', error, { metadata: { personId, treeId: currentTreeId } });
      showToast.error('Failed to upload to gallery');
    } finally {
      setIsUploading(false);
    }
  }, [user, currentTreeId, treeActions]);

  const removePhoto = useCallback(async (personId: string, itemId: string) => {
    if (!user?.uid || !currentTreeId) return;

    try {
      const person = useAppStore.getState().people[personId];
      if (!person || !Array.isArray(person.gallery)) return;

      const itemToRemove = person.gallery.find((item: any) =>
        typeof item === 'object' && item.id === itemId
      );

      if (!itemToRemove) return;

      setIsUploading(true);
      const { SupabaseGalleryService } = await import('../services/supabaseGalleryService');

      if ((itemToRemove as any).path) {
        await SupabaseGalleryService.deleteGalleryItem({
          path: (itemToRemove as any).path,
          uid: user.uid,
          email: user.email,
          token: (useAppStore.getState() as any).supabaseToken || undefined,
        });
      }

      const newGallery = person.gallery.filter((item: any) =>
        !(typeof item === 'object' && item.id === itemId)
      );

      treeActions.updatePerson(personId, {
        gallery: newGallery,
      });

      showToast.success('Photo removed from gallery');
    } catch (error: unknown) {
      logError('GALLERY_DELETE_FAILED', error, { metadata: { personId, treeId: currentTreeId } });
      showToast.error('Failed to remove photo');
    } finally {
      setIsUploading(false);
    }
  }, [user, currentTreeId, treeActions]);

  return {
    isUploading,
    addPhoto,
    removePhoto,
  };
};
