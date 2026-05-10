import { getSupabaseFull } from './supabaseClient';
import { processImageFile } from '../utils/imageLogic';

export interface GalleryItem {
  id: string;
  path: string;
  version: number;
  caption?: string;
  createdAt: string;
}

export const SupabaseGalleryService = {
  /**
   * Uploads an image to the person's gallery in Supabase Storage.
   * Path: avatars/{treeId}/{personId}/gallery/{fileId}.webp
   */
  async uploadToGallery({
    treeId,
    personId,
    file,
    uid,
    email,
    token
  }: {
    treeId: string;
    personId: string;
    file: File;
    uid: string;
    email: string;
    token?: string;
  }): Promise<GalleryItem> {
    const client = getSupabaseFull(uid, email, token);
    const fileId = crypto.randomUUID();
    const filePath = `${treeId}/${personId}/gallery/${fileId}.webp`;

    // 1. Process and compress the image
    const compressedBlob = await processImageFile(file, 1200, 0.7); // Higher res for gallery

    // 2. Upload to Storage
    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(filePath, compressedBlob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 3. Return the gallery item object
    return {
      id: fileId,
      path: filePath,
      version: 1,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Physically deletes a gallery image from Supabase Storage.
   */
  async deleteGalleryItem({
    path,
    uid,
    email,
    token,
  }: {
    path: string;
    uid: string;
    email: string;
    token?: string;
  }): Promise<void> {
    const client = getSupabaseFull(uid, email, token);
    const { error } = await client.storage
      .from('avatars')
      .remove([path]);

    if (error) {
      console.error('[SupabaseGalleryService] Delete error:', error);
      throw error;
    }
  }
};
