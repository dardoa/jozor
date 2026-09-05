import { getSupabaseFull } from '../../../services/supabaseClient';
import { processImageFile } from '../../../utils/imageLogic';
import { logError } from '../../../utils/errorLogger';
import {
  isPersonMediaImageMimeType,
  isPersonMediaAssetRef,
  type GalleryItem,
  type PersonMediaAssetRef,
} from '../../../types';
import { SupabaseStorageService } from '../../../services/supabaseStorageService';

export const SupabaseGalleryService = {
  /**
   * Uploads an image to the person's gallery in Supabase Storage.
   * New uploads use an opaque path in the private person-media bucket.
   */
  async uploadToGallery({
    treeId,
    personId,
    file,
    uid,
    email,
    token,
  }: {
    treeId: string;
    personId: string;
    file: File;
    uid: string;
    email: string;
    token?: string;
  }): Promise<GalleryItem> {
    if (!personId) throw new Error('Gallery upload requires a person ID');
    if (!isPersonMediaImageMimeType(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }
    const compressedBlob = await processImageFile(file, 1200, 0.7);
    if (!isPersonMediaImageMimeType(compressedBlob.type)) {
      throw new Error('Gallery image processing returned an unsupported file type.');
    }
    const asset = await SupabaseStorageService.uploadPersonMediaBlob({
      treeId,
      personId,
      blob: compressedBlob,
      kind: 'gallery-photo',
      uid,
      email,
      token,
    });

    return {
      id: asset.assetId,
      asset,
      version: 1,
      createdAt: asset.createdAt,
    };
  },

  /**
   * Physically deletes a gallery image from Supabase Storage.
   */
  async deleteGalleryItem({
    asset,
    path,
    uid,
    email,
    token,
  }: {
    asset?: PersonMediaAssetRef;
    path?: string;
    uid: string;
    email: string;
    token?: string;
  }): Promise<void> {
    const privateAsset = isPersonMediaAssetRef(asset) ? asset : null;
    const objectPath = privateAsset?.objectPath
      || (path?.startsWith('avatars/') ? path.slice('avatars/'.length) : path);
    if (!objectPath) return;
    const client = getSupabaseFull(uid, email, token);
    const { error } = await client.storage
      .from(privateAsset?.bucket || 'avatars')
      .remove([objectPath]);

    if (error) {
      logError('GALLERY_STORAGE_DELETE_FAILED', error, { showToast: false });
      throw error;
    }
  },
};
