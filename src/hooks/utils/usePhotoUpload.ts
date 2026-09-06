import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTreeActions } from '../tree/useTreeActions';
import { showToast } from '../../utils/showToast';
import { logError } from '../../utils/errorLogger';
import { canEditTreeContext } from '../../domain/treePermissionPolicy';
import {
  isPersonMediaAssetRef,
  isPersonMediaImageMimeType,
  type PersonMediaAssetRef,
} from '../../types';
import {
  deferPersonMediaObjectCleanup,
  removePersonMediaObjectOrEnqueue,
  type PersonMediaStorageTarget,
} from '../../services/personMediaCleanupQueue';

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

  const isSameEditableSession = useCallback((treeId: string, userId: string) => {
    const state = useAppStore.getState();
    return state.currentTreeId === treeId
      && state.user?.uid === userId
      && canEditTreeContext({ currentTreeId: state.currentTreeId, role: state.currentUserRole });
  }, []);

  const toPrivateTarget = useCallback((asset: PersonMediaAssetRef): PersonMediaStorageTarget => ({
    bucket: asset.bucket,
    objectPath: asset.objectPath,
    assetId: asset.assetId,
  }), []);

  const toLegacyTarget = useCallback((treeId: string, path: string): PersonMediaStorageTarget | null => {
    const objectPath = path.startsWith('avatars/') ? path.slice('avatars/'.length) : path;
    if (!objectPath.startsWith(`${treeId}/`)) return null;
    return {
      bucket: 'avatars',
      objectPath,
      assetId: `legacy-profile-${treeId}`,
    };
  }, []);

  const handleUpload = useCallback(async (file: File, personId: string) => {
    if (!user?.uid || !currentTreeId) {
      showToast.error('You must be logged in and inside a tree to upload photos.');
      return;
    }
    if (!canEditTreeContext({
      currentTreeId,
      role: useAppStore.getState().currentUserRole,
    })) {
      showToast.error('readOnly');
      return;
    }

    if (uploadingRef.current.has(personId)) {
      showToast.info('An upload is already in progress for this person.');
      return;
    }

    // Validate file type (frontend check for immediate feedback, service has backend check too)
    if (!isPersonMediaImageMimeType(file.type)) {
      showToast.error('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    let rollbackUploadedObject: (() => Promise<void>) | undefined;
    try {
      uploadingRef.current.add(personId);
      setIsUploading(true);
      setUploadProgress(10);

      const { SupabaseStorageService } = await import('../../services/supabaseStorageService');
      const currentPerson = useAppStore.getState().people[personId];
      const previousAsset = isPersonMediaAssetRef(currentPerson?.photoAsset)
        ? currentPerson.photoAsset
        : null;
      const previousLegacyPath = currentPerson?.photoPath?.trim() || null;
      const sessionToken = user.supabaseToken || undefined;
      const uploadResult = await SupabaseStorageService.uploadAndCompressImage({
        treeId: currentTreeId,
        personId,
        file,
        uid: user.uid,
        email: user.email || '',
        token: sessionToken,
        currentVersion: previousAsset?.version || currentPerson?.photoVersion || 0,
        onProgress: (p) => setUploadProgress(p)
      });

      const cleanupContext = {
        treeId: currentTreeId,
        userId: user.uid,
        token: sessionToken,
      };
      const uploadedTarget = toPrivateTarget(uploadResult.asset);
      rollbackUploadedObject = () => removePersonMediaObjectOrEnqueue(
        cleanupContext,
        uploadedTarget
      );

      if (!isSameEditableSession(currentTreeId, user.uid)) {
        const rollback = rollbackUploadedObject;
        rollbackUploadedObject = undefined;
        await rollback();
        showToast.error('readOnly');
        return;
      }

      // The record becomes authoritative before obsolete storage is removed.
      const updateResult = await treeActions.updatePerson(personId, {
        photoAsset: uploadResult.asset,
        photoUrl: '',
        photoPath: '',
        photoVersion: uploadResult.photoVersion
      });
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Photo record update failed.');
      }
      rollbackUploadedObject = undefined;

      if (previousAsset && previousAsset.assetId !== uploadResult.asset.assetId) {
        await deferPersonMediaObjectCleanup(cleanupContext, toPrivateTarget(previousAsset));
      }
      if (previousLegacyPath) {
        const legacyTarget = toLegacyTarget(currentTreeId, previousLegacyPath);
        if (legacyTarget) {
          await deferPersonMediaObjectCleanup(cleanupContext, legacyTarget);
        }
      }

      showToast.success('messages.success.uploadSuccess');
    } catch (error: unknown) {
      if (rollbackUploadedObject) {
        await rollbackUploadedObject();
      }
      logError('PHOTO_UPLOAD_FAILED', error, { showToast: false, metadata: { personId, treeId: currentTreeId } });
      showToast.error('galleryPhotoUploadError');
    } finally {
      uploadingRef.current.delete(personId);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [
    currentTreeId,
    isSameEditableSession,
    toLegacyTarget,
    toPrivateTarget,
    treeActions,
    user,
  ]);

  const handleDelete = useCallback(async (personId: string) => {
    if (!user?.uid || !currentTreeId) return;
    if (!canEditTreeContext({
      currentTreeId,
      role: useAppStore.getState().currentUserRole,
    })) {
      showToast.error('readOnly');
      return;
    }

    try {
      setIsUploading(true);
      if (!isSameEditableSession(currentTreeId, user.uid)) return;

      const person = useAppStore.getState().people[personId];
      if (!person) return;
      const previousAsset = isPersonMediaAssetRef(person.photoAsset) ? person.photoAsset : null;
      const previousLegacyPath = person.photoPath?.trim() || null;
      const cleanupContext = {
        treeId: currentTreeId,
        userId: user.uid,
        token: user.supabaseToken || undefined,
      };

      const updateResult = await treeActions.updatePerson(personId, {
        photoAsset: null,
        photoUrl: '',
        photoPath: '',
        photoVersion: 0
      });
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Photo record update failed.');
      }

      if (previousAsset) {
        await deferPersonMediaObjectCleanup(cleanupContext, toPrivateTarget(previousAsset));
      }
      if (previousLegacyPath) {
        const legacyTarget = toLegacyTarget(currentTreeId, previousLegacyPath);
        if (legacyTarget) {
          await deferPersonMediaObjectCleanup(cleanupContext, legacyTarget);
        }
      }

      showToast.success('photoRemoved');
    } catch (error: unknown) {
      logError('PHOTO_DELETE_FAILED', error, { showToast: false, metadata: { personId, treeId: currentTreeId } });
      showToast.error('galleryPhotoRemoveError');
    } finally {
      setIsUploading(false);
    }
  }, [
    currentTreeId,
    isSameEditableSession,
    toLegacyTarget,
    toPrivateTarget,
    treeActions,
    user,
  ]);

  return {
    isUploading,
    uploadProgress,
    handleUpload,
    handleDelete,
  };
};
