import type { DriveFile } from '../../types';
import { FILE_NAME } from '../../constants';
import { logError } from '../../utils/errorLogger';
import { JSON_MIME_TYPE } from './googleDriveServiceUtils';

export class DriveFilesClient {
    constructor(private readonly ensureInitialized: () => Promise<void>) {}

    async findLatestJozorFile(): Promise<string | null> {
        await this.ensureInitialized();
        try {
            const response = await gapi.client.drive.files.list({
                q: `mimeType='${JSON_MIME_TYPE}' and name='${FILE_NAME}' and trashed = false`,
                fields: 'files(id, name, modifiedTime)',
                spaces: 'appDataFolder',
                orderBy: 'modifiedTime desc',
                pageSize: 1,
            });
            const files = response.result.files;
            return files && files.length > 0 ? files[0].id || null : null;
        } catch (e) {
            logError('GoogleDriveService findLatestJozorFile', e, { showToast: false });
            return null;
        }
    }

    async listJozorFiles(): Promise<DriveFile[]> {
        await this.ensureInitialized();
        try {
            const response = await gapi.client.drive.files.list({
                q: `mimeType='${JSON_MIME_TYPE}' and trashed = false`,
                fields: 'files(id, name, modifiedTime)',
                spaces: 'appDataFolder',
                orderBy: 'modifiedTime desc',
                pageSize: 100,
            });

            return (
                response.result.files?.map((f) => ({
                    id: f.id || '',
                    name: f.name || '',
                    modifiedTime: f.modifiedTime || '',
                })) || []
            );
        } catch (e) {
            logError('GoogleDriveService listJozorFiles', e, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { operationType: 'list_drive_files' },
            });
            throw e;
        }
    }

    async deleteFile(fileId: string): Promise<void> {
        await this.ensureInitialized();
        try {
            await gapi.client.drive.files.delete({ fileId });
        } catch (e) {
            logError('GoogleDriveService deleteFile', e, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { fileId, operationType: 'delete_drive_file' },
            });
            throw e;
        }
    }

    async renameFile(fileId: string, newName: string): Promise<void> {
        await this.ensureInitialized();
        try {
            await gapi.client.drive.files.update({
                fileId,
                resource: { name: newName },
            });
        } catch (error: unknown) {
            logError('GoogleDriveService renameFile', error, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { fileId, newName, operationType: 'rename_drive_file' },
            });
            throw error;
        }
    }
}
