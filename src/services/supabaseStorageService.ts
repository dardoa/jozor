import { getSupabaseFull } from './supabaseClient';
import imageCompression, { type Options as ImageCompressionOptions } from 'browser-image-compression';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 1;

interface UploadParams {
    treeId: string;
    personId: string;
    file: File;
    uid: string;
    email: string;
    token?: string;
    currentVersion?: number;
    onProgress?: (progress: number) => void;
}

export interface UploadResult {
    publicUrl: string;
    photoPath: string;
    photoVersion: number;
}

/**
 * Service to manage Supabase Storage operations (V2 - Path-based Architecture).
 */
export const SupabaseStorageService = {
    /**
     * Uploads and compresses an image for a tree node (person).
     * Uses deterministic paths: {treeId}/{personId}.webp
     */
    async uploadAndCompressImage({ 
        treeId, 
        personId, 
        file, 
        uid, 
        email, 
        token,
        currentVersion = 0,
        onProgress
    }: UploadParams): Promise<UploadResult> {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
        }

        try {
            // 1. Compress Image (Standardizing on WebP for the new system)
            const options: ImageCompressionOptions = {
                maxSizeMB: MAX_FILE_SIZE_MB,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
                fileType: 'image/webp',
            };

            const compressedBlob = await imageCompression(file, options);
            if (onProgress) onProgress(40); // 40% after compression

            // 2. Deterministic Path: avatars/{treeId}/{personId}.webp
            const filePath = `${treeId}/${personId}.webp`;
            const nextVersion = currentVersion + 1;

            const client = getSupabaseFull(uid, email, token);

            // 3. Upload with upsert=true
            const { error: uploadError } = await client.storage
                .from('avatars')
                .upload(filePath, compressedBlob, {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: 'image/webp',
                });

            if (onProgress) onProgress(90); // 90% after storage upload

            if (uploadError) {
                console.error('Supabase storage upload error:', uploadError);
                throw uploadError;
            }

            // 4. Get Public URL
            const { data: { publicUrl } } = client.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 5. Update DB media fields using secure RPC.
            const { error: dbError } = await client.rpc('update_person_photo', {
                p_person_id: personId,
                p_tree_id: treeId,
                p_photo_url: publicUrl,
                p_photo_path: filePath,
                p_photo_version: nextVersion
            });

            if (dbError) {
                console.error('Database update error:', dbError);
                throw dbError;
            }

            return {
                publicUrl: `${publicUrl}?v=${nextVersion}`,
                photoPath: filePath,
                photoVersion: nextVersion
            };
        } catch (error) {
            if (onProgress) onProgress(0);
            console.error('Error in uploadAndCompressImage:', error);
            throw error;
        } finally {
            if (onProgress) onProgress(100);
        }
    },

    /**
     * Uploads a user profile avatar.
     * Path: avatars/users/{user_id}/profile.webp
     */
    async uploadUserAvatar(userId: string, email: string, file: File, token?: string, currentVersion = 0): Promise<UploadResult> {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
        }

        const bucketName = 'avatars';
        const filePath = `users/${userId}/profile.webp`;
        const nextVersion = currentVersion + 1;

        try {
            const options: ImageCompressionOptions = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 512,
                useWebWorker: true,
                fileType: 'image/webp',
            };
            const compressedBlob = await imageCompression(file, options);

            const client = getSupabaseFull(userId, email, token);

            const { error: uploadError } = await client.storage
                .from(bucketName)
                .upload(filePath, compressedBlob, {
                    upsert: true,
                    contentType: 'image/webp',
                });

            if (uploadError) {
                throw new Error(`Avatar upload failed: ${uploadError.message}`);
            }

            const { data } = client.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // Update user profile in DB using secure RPC
            const { error: dbError } = await client.rpc('update_user_avatar', {
                p_photo_url: data.publicUrl,
                p_photo_path: filePath,
                p_photo_version: nextVersion
            });

            if (dbError) {
                throw new Error(`Profile update failed: ${dbError.message}`);
            }

            return {
                publicUrl: `${data.publicUrl}?v=${nextVersion}`,
                photoPath: filePath,
                photoVersion: nextVersion
            };
        } catch (error) {
            console.error('Error in uploadUserAvatar:', error);
            throw error;
        }
    },

    /**
     * Physically deletes a person's photo from Supabase Storage.
     */
    async deletePersonPhoto(treeId: string, personId: string, userId: string, email: string, token?: string): Promise<void> {
        const client = getSupabaseFull(userId, email, token);
        const filePath = `${treeId}/${personId}.webp`;
        await client.storage.from('avatars').remove([filePath]);
    },

    /**
     * Deletes user storage contents.
     */
    async deleteUserStorage(userId: string, email: string, token?: string): Promise<void> {
        const client = getSupabaseFull(userId, email, token);
        const bucketName = 'avatars';
        // Cleanup the specific users folder
        const { data: files } = await client.storage.from(bucketName).list(`users/${userId}`);

        if (files && files.length > 0) {
            const pathsToDelete = files.map(f => `users/${userId}/${f.name}`);
            await client.storage.from(bucketName).remove(pathsToDelete);
        }
    }
};
