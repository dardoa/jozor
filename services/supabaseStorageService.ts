import { getSupabaseWithAuth } from './supabaseClient';
import imageCompression from 'browser-image-compression';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_MB = 1;

interface UploadParams {
    treeId: string;
    personId: string;
    file: File;
    uid: string;
    email: string;
    token?: string;
}

/**
 * Service to manage Supabase Storage operations for avatars (both tree nodes and user profiles).
 */
export const SupabaseStorageService = {
    /**
     * Uploads and compresses an image for a tree node (person).
     */
    async uploadAndCompressImage({ treeId, personId, file, uid, email, token }: UploadParams): Promise<string> {
        // 1. Initial Validation (File Type)
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
        }

        try {
            // 2. Compress Image
            const options = {
                maxSizeMB: MAX_FILE_SIZE_MB,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
                fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
            };

            const compressedBlob = await imageCompression(file, options);

            // 3. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop() || 'jpg';
            // Path: avatars/{treeId}/{personId}_{timestamp}.{ext}
            const filePath = `${treeId}/${personId}_${Date.now()}.${fileExt}`;

            const client = getSupabaseWithAuth(uid, email, token);

            const { error: uploadError } = await client.storage
                .from('avatars')
                .upload(filePath, compressedBlob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: compressedBlob.type || 'image/jpeg',
                });

            if (uploadError) {
                console.error('Supabase storage upload error:', uploadError);
                throw uploadError;
            }

            // 4. Get Public URL (Doesn't strictly need auth for public URLs but safer to use client)
            const { data: { publicUrl } } = client.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 5. Update Person Record in Supabase
            const { error: dbError } = await client
                .from('people')
                .update({ photo_url: publicUrl })
                .eq('id', personId)
                .eq('tree_id', treeId);

            if (dbError) {
                console.error('Database update error:', dbError);
                throw dbError;
            }

            return publicUrl;
        } catch (error) {
            console.error('Error in uploadAndCompressImage:', error);
            throw error;
        }
    },

    /**
     * Uploads a user profile avatar.
     * Path: avatars/{user_id}/profile.png
     */
    async uploadUserAvatar(userId: string, email: string, file: File, token?: string): Promise<string> {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
        }

        const bucketName = 'avatars';
        const filePath = `${userId}/profile.png`;

        try {
            // Optional: Compress user avatar too
            const options = {
                maxSizeMB: 0.5, // Even smaller for profile pics
                maxWidthOrHeight: 512,
                useWebWorker: true,
                fileType: file.type as any,
            };
            const compressedBlob = await imageCompression(file, options);

            const client = getSupabaseWithAuth(userId, email, token);

            const { error: uploadError } = await client.storage
                .from(bucketName)
                .upload(filePath, compressedBlob, {
                    upsert: true, // Overwrite existing profile pic
                    contentType: compressedBlob.type,
                });

            if (uploadError) {
                throw new Error(`Avatar upload failed: ${uploadError.message}`);
            }

            const { data } = client.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error in uploadUserAvatar:', error);
            throw error;
        }
    },

    /**
     * Deletes user storage contents.
     */
    async deleteUserStorage(userId: string, email: string, token?: string): Promise<void> {
        const client = getSupabaseWithAuth(userId, email, token);
        const bucketName = 'avatars';
        const { data: files } = await client.storage.from(bucketName).list(userId);

        if (files && files.length > 0) {
            const pathsToDelete = files.map(f => `${userId}/${f.name}`);
            await client.storage.from(bucketName).remove(pathsToDelete);
        }
    }
};
