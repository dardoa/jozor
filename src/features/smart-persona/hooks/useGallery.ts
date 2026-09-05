import { useCallback, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useTreeActions } from '../../../hooks/tree/useTreeActions';
import { showToast } from '../../../utils/showToast';
import { logError } from '../../../utils/errorLogger';
import { canEditTreeContext } from '../../../domain/treePermissionPolicy';
import {
  isPersonMediaAssetRef,
  isPersonMediaImageMimeType,
  type GalleryItem,
} from '../../../types';
import {
  deferPersonMediaObjectCleanup,
  removePersonMediaObjectOrEnqueue,
  type PersonMediaStorageTarget,
} from '../../../services/personMediaCleanupQueue';

interface UseGalleryReturn {
  isUploading: boolean;
  addPhoto: (file: File, personId: string) => Promise<void>;
  removePhoto: (personId: string, itemId: string) => Promise<void>;
}

const isSameEditableTreeSession = (treeId: string, userId: string): boolean => {
  const state = useAppStore.getState();
  return state.currentTreeId === treeId
    && state.user?.uid === userId
    && canEditTreeContext({ currentTreeId: state.currentTreeId, role: state.currentUserRole });
};

const getGalleryCleanupTarget = (
  treeId: string,
  item: GalleryItem
): PersonMediaStorageTarget | null => {
  if (isPersonMediaAssetRef(item.asset)) {
    return {
      bucket: item.asset.bucket,
      objectPath: item.asset.objectPath,
      assetId: item.asset.assetId,
    };
  }
  if (!item.path) return null;
  const objectPath = item.path.startsWith('avatars/')
    ? item.path.slice('avatars/'.length)
    : item.path;
  if (!objectPath.startsWith(`${treeId}/`)) return null;
  return {
    bucket: 'avatars',
    objectPath,
    assetId: item.id || 'legacy-gallery-photo',
  };
};

export const useGallery = (): UseGalleryReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const treeActions = useTreeActions();

  const addPhoto = useCallback(async (file: File, personId: string) => {
    const state = useAppStore.getState();
    const user = state.user;
    const currentTreeId = state.currentTreeId;

    if (!user?.uid || !currentTreeId) {
      showToast.error('loginRequired');
      return;
    }
    if (!canEditTreeContext({ currentTreeId, role: state.currentUserRole })) {
      showToast.error('readOnly');
      return;
    }
    if (!isPersonMediaImageMimeType(file.type)) {
      showToast.error('galleryPhotoUploadError');
      return;
    }
    const sessionToken = user.supabaseToken || undefined;

    let rollbackUploadedObject: (() => Promise<void>) | undefined;
    try {
      setIsUploading(true);
      const { SupabaseGalleryService } = await import('../services/supabaseGalleryService');

      const newItem = await SupabaseGalleryService.uploadToGallery({
        treeId: currentTreeId,
        personId,
        file,
        uid: user.uid,
        email: user.email,
        token: sessionToken,
      });

      const cleanupContext = {
        treeId: currentTreeId,
        userId: user.uid,
        token: sessionToken,
      };
      const uploadedTarget = getGalleryCleanupTarget(currentTreeId, newItem);

      rollbackUploadedObject = async () => {
        if (!uploadedTarget) return;
        await removePersonMediaObjectOrEnqueue(cleanupContext, uploadedTarget);
      };

      if (!isSameEditableTreeSession(currentTreeId, user.uid)) {
        const rollback = rollbackUploadedObject;
        rollbackUploadedObject = undefined;
        await rollback();
        showToast.error('galleryPhotoUploadError');
        return;
      }

      const person = useAppStore.getState().people[personId];
      const currentGallery = Array.isArray(person?.gallery) ? person.gallery : [];

      const updateResult = await treeActions.updatePerson(personId, {
        gallery: [...currentGallery, newItem],
      });
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Gallery record update failed.');
      }
      rollbackUploadedObject = undefined;

      showToast.success('galleryPhotoAdded');
    } catch (error: unknown) {
      if (rollbackUploadedObject) {
        await rollbackUploadedObject();
      }
      logError('GALLERY_UPLOAD_FAILED', error, { metadata: { personId, treeId: currentTreeId } });
      showToast.error('galleryPhotoUploadError');
    } finally {
      setIsUploading(false);
    }
  }, [treeActions]);

  const removePhoto = useCallback(async (personId: string, itemId: string) => {
    const state = useAppStore.getState();
    const user = state.user;
    const currentTreeId = state.currentTreeId;

    if (!user?.uid || !currentTreeId) return;
    if (!canEditTreeContext({ currentTreeId, role: state.currentUserRole })) {
      showToast.error('readOnly');
      return;
    }
    const sessionToken = user.supabaseToken || undefined;

    try {
      setIsUploading(true);

      if (!isSameEditableTreeSession(currentTreeId, user.uid)) {
        showToast.error('galleryPhotoRemoveError');
        return;
      }

      const person = useAppStore.getState().people[personId];
      if (!person || !Array.isArray(person.gallery)) return;

      const itemToRemove = person.gallery.find((item) =>
        typeof item === 'object' && item.id === itemId
      );

      if (!itemToRemove) return;

      const newGallery = person.gallery.filter((item) =>
        !(typeof item === 'object' && item.id === itemId)
      );

      const updateResult = await treeActions.updatePerson(personId, {
        gallery: newGallery,
      });
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Gallery record update failed.');
      }

      if (typeof itemToRemove === 'object') {
        const target = getGalleryCleanupTarget(currentTreeId, itemToRemove);
        if (target) {
          await deferPersonMediaObjectCleanup({
            treeId: currentTreeId,
            userId: user.uid,
            token: sessionToken,
          }, target);
        }
      }

      showToast.success('galleryPhotoRemoved');
    } catch (error: unknown) {
      logError('GALLERY_DELETE_FAILED', error, { metadata: { personId, treeId: currentTreeId } });
      showToast.error('galleryPhotoRemoveError');
    } finally {
      setIsUploading(false);
    }
  }, [treeActions]);

  return {
    isUploading,
    addPhoto,
    removePhoto,
  };
};
