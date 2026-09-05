import { getSupabaseFull } from './supabaseClient';
import imageCompression, { type Options as ImageCompressionOptions } from 'browser-image-compression';
import {
    createPersonMediaAssetRef,
    detectPersonMediaImageMimeType,
    isPersonMediaImageMimeType,
    PERSON_MEDIA_MAX_IMAGE_BYTES,
    type PersonMediaAssetKind,
    type PersonMediaAssetRef,
} from '../types';
import { logError } from '../utils/errorLogger';
import { readBlobBytes } from '../utils/blobBytes';

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

export interface UserAvatarUploadResult {
    publicUrl: string;
    photoPath: string;
    photoVersion: number;
}

export interface PersonPhotoUploadResult {
    asset: PersonMediaAssetRef;
    photoVersion: number;
}

interface PersonMediaBlobUploadParams {
    treeId: string;
    personId: string;
    blob: Blob;
    kind: PersonMediaAssetKind;
    uid: string;
    email: string;
    token?: string;
    currentVersion?: number;
}

const uploadPersonMediaBlob = async ({
    treeId,
    personId,
    blob,
    kind,
    uid,
    email,
    token,
    currentVersion = 0,
}: PersonMediaBlobUploadParams): Promise<PersonMediaAssetRef> => {
    if (!treeId || !personId) throw new Error('Person media upload requires a tree and person ID');
    if (blob.size <= 0 || blob.size > PERSON_MEDIA_MAX_IMAGE_BYTES) {
        throw new Error('Person media upload has an invalid image size');
    }
    const bytes = await readBlobBytes(blob, 'Person media upload could not read image content');
    const mimeType = detectPersonMediaImageMimeType(bytes);
    if (!mimeType) throw new Error('Person media upload has unsupported image content');
    if (blob.type && blob.type !== mimeType) {
        throw new Error('Person media upload MIME type does not match its content');
    }
    const asset = createPersonMediaAssetRef({
        treeId,
        assetId: crypto.randomUUID(),
        kind,
        mimeType,
        byteLength: bytes.byteLength,
        version: currentVersion + 1,
    });
    const normalizedBlob = new Blob([bytes.buffer], { type: mimeType });
    const client = getSupabaseFull(uid, email, token);
    const { error } = await client.storage.from(asset.bucket).upload(
        asset.objectPath,
        normalizedBlob,
        { cacheControl: '3600', upsert: false, contentType: mimeType }
    );
    if (error) throw error;
    return asset;
};

/**
 * Service to manage Supabase Storage operations.
 */
export const SupabaseStorageService = {
    uploadPersonMediaBlob,

    /**
     * Uploads and compresses an image for a tree node (person).
     * Uses an immutable, opaque object path in the private person-media bucket.
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
    }: UploadParams): Promise<PersonPhotoUploadResult> {
        if (!personId) throw new Error('Person photo upload requires a person ID');
        if (!isPersonMediaImageMimeType(file.type)) {
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
            if (compressedBlob.type !== 'image/webp' || compressedBlob.size <= 0) {
                throw new Error('Person photo processing did not produce a valid WebP image.');
            }
            if (onProgress) onProgress(40); // 40% after compression

            // 2. Opaque immutable asset path. Person identity is kept in the
            // record boundary and is not encoded into the storage object name.
            const asset = await uploadPersonMediaBlob({
                treeId,
                personId,
                blob: compressedBlob,
                kind: 'profile-photo',
                uid,
                email,
                token,
                currentVersion,
            });
            const nextVersion = currentVersion + 1;

            if (onProgress) onProgress(90); // 90% after storage upload

            if (onProgress) onProgress(100);
            return {
                asset,
                photoVersion: nextVersion
            };
        } catch (error) {
            if (onProgress) onProgress(0);
            logError('PERSON_PHOTO_UPLOAD_FAILED', error, {
                showToast: false,
                metadata: { treeId },
            });
            throw error;
        }
    },

    /**
     * Uploads a user profile avatar.
     * Path: avatars/users/{user_id}/profile.webp
     */
    async uploadUserAvatar(userId: string, email: string, file: File, token?: string, currentVersion = 0): Promise<UserAvatarUploadResult> {
        if (!isPersonMediaImageMimeType(file.type)) {
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
            logError('USER_AVATAR_UPLOAD_FAILED', error, { showToast: false });
            throw error;
        }
    },

    async deletePersonMediaAsset(
        asset: PersonMediaAssetRef,
        userId: string,
        email: string,
        token?: string
    ): Promise<void> {
        const client = getSupabaseFull(userId, email, token);
        const { error } = await client.storage.from(asset.bucket).remove([asset.objectPath]);
        if (error) throw error;
    },

    async deleteLegacyPersonMediaPath(
        path: string,
        userId: string,
        email: string,
        token?: string
    ): Promise<void> {
        const cleanPath = path.startsWith('avatars/') ? path.slice('avatars/'.length) : path;
        const client = getSupabaseFull(userId, email, token);
        const { error } = await client.storage.from('avatars').remove([cleanPath]);
        if (error) throw error;
    },

    /**
     * Physically deletes a person's photo from Supabase Storage.
     */
    async deletePersonPhoto(treeId: string, personId: string, userId: string, email: string, token?: string): Promise<void> {
        await this.deleteLegacyPersonMediaPath(`${treeId}/${personId}.webp`, userId, email, token);
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
