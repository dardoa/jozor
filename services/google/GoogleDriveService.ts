import { Person, DriveFile } from '../../types';
import { FILE_NAME } from '../../constants';
import { validatePerson } from '../../utils/familyLogic';
import { logError } from '../../utils/errorLogger';
import { IGoogleApiService, IGoogleDriveService } from './interfaces';

export class GoogleDriveService implements IGoogleDriveService {
    private apiService: IGoogleApiService;

    constructor(apiService: IGoogleApiService) {
        this.apiService = apiService;
    }

    private async ensureInitialized() {
        if (this.apiService.isInitialized && (window as any).gapi?.client?.drive) {
            return;
        }

        console.log('GoogleDriveService: Initializing through ApiService...');
        await this.apiService.initialize();

        if (!(window as any).gapi?.client?.drive) {
            throw new Error('Google Drive API failed to initialize.');
        }
    }

    public async getOrCreateUserVisibleAppFolderId(): Promise<string> {
        return 'appDataFolder';
    }

    public async findLatestJozorFile(): Promise<string | null> {
        await this.ensureInitialized();
        try {
            const response = await gapi.client.drive.files.list({
                q: `mimeType='application/json' and name='${FILE_NAME}' and trashed = false`,
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

    public async listJozorFiles(): Promise<DriveFile[]> {
        await this.ensureInitialized();
        try {
            const response = await gapi.client.drive.files.list({
                q: `mimeType='application/json' and trashed = false`,
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
            console.error('Error listing Jozor files', e);
            throw e;
        }
    }

    public async deleteFile(fileId: string): Promise<void> {
        await this.ensureInitialized();
        try {
            await gapi.client.drive.files.delete({
                fileId: fileId,
            });
        } catch (e) {
            console.error('Error deleting file', e);
            throw e;
        }
    }

    // Updated return type to any for now to handle migration, or prefer FullState
    public async loadFile(fileId: string): Promise<any> {
        await this.ensureInitialized();
        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media',
            });

            if (!response || !response.result) {
                throw new Error('Empty response from Google Drive');
            }

            const result = response.result;
            const parsed = typeof result === 'string' ? JSON.parse(result) : result;

            // Security: Validate data structure before returning
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid data format from Google Drive');
            }

            // Migration: Check if it's legacy (just people map) or FullState
            if (!parsed.version && !parsed.metadata && Object.values(parsed).some((v: any) => v.id && v.firstName)) {
                const validated: Record<string, Person> = {};
                Object.entries(parsed).forEach(([key, value]) => {
                    validated[key] = validatePerson(value as Person);
                });
                return { people: validated }; // Treat as partial FullState
            }

            // Assume FullState
            return parsed;
        } catch (e: any) {
            console.error('Error loading file from Drive:', e);
            // Provide more specific error message
            if (e.status === 404) {
                throw new Error('File not found in Google Drive');
            } else if (e.status === 403) {
                throw new Error('Permission denied to access file');
            } else if (e.message) {
                throw new Error(e.message);
            } else {
                throw new Error('Failed to load file from Google Drive');
            }
        }
    }

    public async saveFile(
        data: any, // Accepts Record<string, Person> OR FullState
        existingFileId: string | null,
        customFileName?: string,
        forceNew?: boolean
    ): Promise<string> {
        await this.ensureInitialized();

        let fileNameToUse = customFileName || FILE_NAME;
        fileNameToUse = fileNameToUse.trim();

        if (!fileNameToUse || fileNameToUse.toLowerCase().includes('untitled') || fileNameToUse === '') {
            fileNameToUse = FILE_NAME;
        }
        if (!fileNameToUse.endsWith('.json')) {
            fileNameToUse += '.json';
        }

        const content = JSON.stringify(data, null, 2);

        // Emit upload start event
        window.dispatchEvent(new CustomEvent('drive-upload-start'));

        try {
            let targetFileId: string | null = forceNew ? null : existingFileId;

            // 1. Mandatory Verification: If an ID is provided, verify it exists and is reachable
            if (targetFileId) {
                try {
                    const fileCheck = await gapi.client.drive.files.get({
                        fileId: targetFileId,
                        fields: 'id, trashed',
                    });

                    if (fileCheck.result.trashed) {
                        console.warn(`DeltaSync: File ${targetFileId} is trashed. Ghost state detected.`);
                        targetFileId = null;
                        localStorage.removeItem('jozor_gdrive_file_id');
                    }
                } catch (e: any) {
                    const status = e.status || (e.result && e.result.error && e.result.error.code);
                    console.error(`DeltaSync: Ghost State Detected. Verification failed for ${targetFileId}, status: ${status}`);

                    // ONLY PURGE on permanent failure (404, 410) or explicit ghost detection
                    const isPermanentFailure = status === 404 || status === 410;

                    if (isPermanentFailure) {
                        console.warn(`DeltaSync: Permanent failure (${status}) for ${targetFileId}. Purging ID.`);
                        targetFileId = null;
                        localStorage.removeItem('jozor_gdrive_file_id');
                    }

                    if (status === 401) throw e; // Propagate for re-auth
                }
            }

            // 2. Fallback search by name if ID was reset or never provided (and not forcing new)
            if (!targetFileId && !forceNew) {
                try {
                    const searchResponse = await gapi.client.drive.files.list({
                        q: `mimeType='application/json' and name='${fileNameToUse}' and trashed = false`,
                        fields: 'files(id, name)',
                        spaces: 'appDataFolder',
                        pageSize: 1,
                    });
                    const foundFiles = searchResponse.result.files;

                    if (foundFiles && foundFiles.length > 0) {
                        targetFileId = foundFiles[0].id || null;
                    }
                } catch (e: any) {
                    console.error('DeltaSync: Error searching for file by name:', e);
                }
            }

            // 3. Update existing file
            if (targetFileId) {
                try {
                    await gapi.client.request({
                        path: `/upload/drive/v3/files/${targetFileId}`,
                        method: 'PATCH',
                        params: { uploadType: 'media' },
                        body: content,
                    });

                    // Emit upload success event
                    window.dispatchEvent(new CustomEvent('drive-upload-success', {
                        detail: { timestamp: new Date() }
                    }));

                    return targetFileId;
                } catch (e: any) {
                    const status = e.status || (e.result && e.result.error && e.result.error.code);
                    console.error(`DeltaSync: Patch failed for ${targetFileId}, status: ${status}`, e);

                    if (status === 401) throw e;

                    // ONLY RESET if permanent (404, 410)
                    if (status === 404 || status === 410) {
                        console.warn(`DeltaSync: Patch target ${targetFileId} is gone (${status}). Resetting.`);
                        targetFileId = null;
                        localStorage.removeItem('jozor_gdrive_file_id');
                    } else {
                        // For other errors (500, etc), just rethrow and keep the ID for retry
                        throw e;
                    }
                }
            }

            // 4. Create new file if needed
            if (!targetFileId) {
                console.log('DeltaSync: Creating a fresh backup file (Forced Recovery).');
                const fileMetadata = {
                    name: fileNameToUse,
                    mimeType: 'application/json',
                    parents: ['appDataFolder'],
                };

                const createResponse = await gapi.client.request({
                    path: '/drive/v3/files',
                    method: 'POST',
                    body: fileMetadata,
                });

                const res = createResponse.result as { id: string };
                const newId = res.id;

                await gapi.client.request({
                    path: `/upload/drive/v3/files/${newId}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: content,
                });

                window.dispatchEvent(new CustomEvent('drive-upload-success', {
                    detail: { timestamp: new Date() }
                }));

                return newId;
            } else {
                throw new Error('Failed to synchronize file even after forced reset.');
            }
        } catch (e: any) {
            const status = e.status || (e.result && e.result.error && e.result.error.code);
            console.error('❌ DeltaSync: Drive Sync ERROR:', status, e.message);

            // ONLY PURGE ID on permanent failures (404, 410)
            const isPermanentFailure = status === 404 || status === 410;
            if (isPermanentFailure) {
                localStorage.removeItem('jozor_gdrive_file_id');
            }

            window.dispatchEvent(new CustomEvent('drive-upload-error', {
                detail: { message: e.message || 'Sync failed', status: status }
            }));

            throw e;
        }
    }

    public async shareFile(
        fileId: string,
        email: string,
        role: 'reader' | 'writer' | 'owner' = 'writer'
    ): Promise<void> {
        await this.ensureInitialized();
        try {
            await gapi.client.drive.permissions.create({
                fileId: fileId,
                resource: {
                    role: role,
                    type: 'user',
                    emailAddress: email,
                },
                fields: 'id',
            });
        } catch (e) {
            console.error('Error sharing file', e);
            throw e;
        }
    }

    public async unshareFile(fileId: string, email: string): Promise<void> {
        await this.ensureInitialized();
        try {
            // 1. Find permission ID for the email
            const permissionsResponse = await gapi.client.drive.permissions.list({
                fileId: fileId,
                fields: 'permissions(id, emailAddress)',
            });

            const permission = permissionsResponse.result.permissions?.find(
                (p) => p.emailAddress?.toLowerCase() === email.toLowerCase()
            );

            if (permission && permission.id) {
                // 2. Delete the permission
                await gapi.client.drive.permissions.delete({
                    fileId: fileId,
                    permissionId: permission.id,
                });
            } else {
                console.warn(`No permission found for ${email} on file ${fileId}`);
            }
        } catch (e) {
            console.error('Error unsharing file', e);
            throw e;
        }
    }

    public async listSnapshots(treeId: string): Promise<DriveFile[]> {
        await this.ensureInitialized();
        try {
            // Naming convention: snapshot_[treeId]_[timestamp]_[label].json
            const query = `mimeType='application/json' and name contains 'snapshot_${treeId}_' and trashed = false`;

            const response = await gapi.client.drive.files.list({
                q: query,
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
        } catch (e: any) {
            console.warn('GoogleDriveService: Error listing snapshots (handled)', e);
            // If 403 Forbidden, return empty array instead of throwing to prevent freezing the AdminHub
            if (e.status === 403) {
                return [];
            }
            throw e;
        }
    }

    public async saveSnapshot(data: any, treeId: string, label: string): Promise<string> {
        await this.ensureInitialized();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName = `snapshot_${treeId}_${timestamp}_${safeLabel}.json`;

        const content = JSON.stringify(data, null, 2);

        try {
            const fileMetadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: ['appDataFolder'],
            };

            const createResponse = await gapi.client.request({
                path: '/drive/v3/files',
                method: 'POST',
                body: fileMetadata,
            });

            const res = createResponse.result as { id: string };
            const fileId = res.id;

            if (fileId) {
                await gapi.client.request({
                    path: `/upload/drive/v3/files/${fileId}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: content,
                });
                return fileId;
            } else {
                throw new Error('Failed to create snapshot file.');
            }
        } catch (e) {
            console.error('Error saving snapshot', e);
            throw e;
        }
    }

    public async cleanupSnapshots(treeId: string): Promise<void> {
        try {
            const snapshots = await this.listSnapshots(treeId);

            if (snapshots.length > 15) {
                const toDelete = snapshots.slice(15);
                console.log(`Cleaning up ${toDelete.length} old snapshots in parallel...`);

                // Use Promise.all for faster cleanup
                await Promise.all(toDelete.map(file => this.deleteFile(file.id)));
            }
        } catch (e) {
            console.error('Error cleaning up snapshots', e);
        }
    }
}
