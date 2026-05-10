import type { Person } from '../../types';
import { FILE_NAME } from '../../constants';
import { validatePerson } from '../../utils/familyLogic';
import { logError, logInfo, logWarn } from '../../utils/errorLogger';
import type { GoogleDrivePayload } from './interfaces';
import {
    getDriveErrorMessage,
    getDriveErrorStatus,
    isLegacyPeopleMap,
} from './googleDriveServiceUtils';

export class DrivePayloadClient {
    constructor(private readonly ensureInitialized: () => Promise<void>) {}

    async loadFile(fileId: string): Promise<GoogleDrivePayload> {
        await this.ensureInitialized();
        try {
            const response = await gapi.client.drive.files.get({
                fileId,
                alt: 'media',
            });

            if (!response || !response.result) {
                throw new Error('Empty response from Google Drive');
            }

            const result = response.result;
            const parsed: GoogleDrivePayload = typeof result === 'string' ? JSON.parse(result) : result;

            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid data format from Google Drive');
            }

            if (!('version' in parsed) && !('metadata' in parsed) && isLegacyPeopleMap(parsed)) {
                const validated: Record<string, Person> = {};
                Object.entries(parsed).forEach(([key, value]) => {
                    validated[key] = validatePerson(value as Person);
                });
                return { people: validated };
            }

            return parsed;
        } catch (error: unknown) {
            logError('GoogleDriveService loadFile', error, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { fileId, operationType: 'load_drive_file' },
            });

            const status = getDriveErrorStatus(error);
            if (status === 404) {
                throw new Error('File not found in Google Drive');
            } else if (status === 403) {
                throw new Error('Permission denied to access file');
            } else if (error instanceof Error && error.message) {
                throw new Error(error.message);
            } else {
                throw new Error('Failed to load file from Google Drive');
            }
        }
    }

    async saveFile(
        data: GoogleDrivePayload,
        existingFileId: string | null,
        customFileName?: string,
        forceNew?: boolean
    ): Promise<string> {
        await this.ensureInitialized();

        const fileNameToUse = this.normalizeFileName(customFileName);
        const content = JSON.stringify(data, null, 2);

        window.dispatchEvent(new CustomEvent('drive-upload-start'));

        try {
            let targetFileId: string | null = forceNew ? null : existingFileId;

            if (targetFileId) {
                targetFileId = await this.verifyExistingFile(targetFileId);
            }

            if (!targetFileId && !forceNew) {
                targetFileId = await this.findFileByName(fileNameToUse);
            }

            if (targetFileId) {
                try {
                    await this.patchFileContent(targetFileId, content);
                    this.emitUploadSuccess();
                    return targetFileId;
                } catch (error: unknown) {
                    const status = getDriveErrorStatus(error);
                    logError('GoogleDriveService saveFile patch', error, {
                        category: status === 401 ? 'AUTH' : 'NETWORK',
                        severity: 'MEDIUM',
                        metadata: { fileId: targetFileId, status, operationType: 'save_drive_file' },
                    });

                    if (status === 401) throw error;

                    if (status === 404 || status === 410) {
                        logWarn('GoogleDriveService saveFile patch', 'Drive file disappeared during patch. Resetting stored file id.', {
                            category: 'SYNC',
                            metadata: { fileId: targetFileId, status, operationType: 'save_drive_file' },
                        });
                        targetFileId = null;
                        localStorage.removeItem('jozor_gdrive_file_id');
                    } else {
                        throw error;
                    }
                }
            }

            if (!targetFileId) {
                const newId = await this.createFileWithContent(fileNameToUse, content, forceNew);
                this.emitUploadSuccess();
                return newId;
            }

            throw new Error('Failed to synchronize file even after forced reset.');
        } catch (error: unknown) {
            const status = getDriveErrorStatus(error);
            logError('GoogleDriveService saveFile', error, {
                category: status === 401 ? 'AUTH' : status === 403 ? 'PERMISSION' : 'NETWORK',
                severity: 'HIGH',
                metadata: { fileId: existingFileId, status, operationType: 'save_drive_file', forceNew: Boolean(forceNew) },
            });

            if (status === 404 || status === 410) {
                localStorage.removeItem('jozor_gdrive_file_id');
            }

            window.dispatchEvent(new CustomEvent('drive-upload-error', {
                detail: { message: getDriveErrorMessage(error, 'Sync failed'), status },
            }));

            throw error;
        }
    }

    private normalizeFileName(customFileName?: string): string {
        let fileNameToUse = customFileName || FILE_NAME;
        fileNameToUse = fileNameToUse.trim();

        if (!fileNameToUse || fileNameToUse.toLowerCase().includes('untitled')) {
            fileNameToUse = FILE_NAME;
        }
        if (!fileNameToUse.endsWith('.json')) {
            fileNameToUse += '.json';
        }
        return fileNameToUse;
    }

    private async verifyExistingFile(fileId: string): Promise<string | null> {
        try {
            const fileCheck = await gapi.client.drive.files.get({
                fileId,
                fields: 'id, trashed',
            });

            if (fileCheck.result.trashed) {
                logWarn('GoogleDriveService saveFile verification', 'Drive file is trashed. Resetting stored file id.', {
                    category: 'SYNC',
                    metadata: { fileId, operationType: 'save_drive_file' },
                });
                localStorage.removeItem('jozor_gdrive_file_id');
                return null;
            }
            return fileId;
        } catch (error: unknown) {
            const status = getDriveErrorStatus(error);
            logWarn('GoogleDriveService saveFile verification', 'Drive file verification failed before save.', {
                category: status === 401 ? 'AUTH' : 'SYNC',
                metadata: { fileId, status, operationType: 'save_drive_file' },
            });

            if (status === 404 || status === 410) {
                logWarn('GoogleDriveService saveFile verification', 'Permanent verification failure. Purging stored Drive file id.', {
                    category: 'SYNC',
                    metadata: { fileId, status, operationType: 'save_drive_file' },
                });
                localStorage.removeItem('jozor_gdrive_file_id');
                return null;
            }

            if (status === 401) throw error;
            return fileId;
        }
    }

    private async findFileByName(fileName: string): Promise<string | null> {
        try {
            const searchResponse = await gapi.client.drive.files.list({
                q: `mimeType='application/json' and name='${fileName}' and trashed = false`,
                fields: 'files(id, name)',
                spaces: 'appDataFolder',
                pageSize: 1,
            });
            const foundFiles = searchResponse.result.files;
            return foundFiles && foundFiles.length > 0 ? foundFiles[0].id || null : null;
        } catch {
            logWarn('GoogleDriveService saveFile searchFallback', 'Searching Drive by file name failed.', {
                category: 'NETWORK',
                metadata: { fileName, operationType: 'save_drive_file' },
            });
            return null;
        }
    }

    private async patchFileContent(fileId: string, content: string): Promise<void> {
        await gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            body: content,
        });
    }

    private async createFileWithContent(fileName: string, content: string, forceNew?: boolean): Promise<string> {
        logInfo('GoogleDriveService saveFile createFallback', 'Creating a fresh Drive backup file after recovery.', {
            operationType: 'save_drive_file',
            forceNew: Boolean(forceNew),
        });

        const createResponse = await gapi.client.request({
            path: '/drive/v3/files',
            method: 'POST',
            body: {
                name: fileName,
                mimeType: 'application/json',
                parents: ['appDataFolder'],
            },
        });

        const newId = (createResponse.result as { id: string }).id;
        await this.patchFileContent(newId, content);
        return newId;
    }

    private emitUploadSuccess(): void {
        window.dispatchEvent(new CustomEvent('drive-upload-success', {
            detail: { timestamp: new Date() },
        }));
    }
}
