import { FILE_NAME } from '../../constants';
import { validatePerson } from '../../utils/familyLogic';
import { logError, logInfo, logWarn } from '../../utils/errorLogger';
const getDriveErrorStatus = (error) => {
    if (typeof error !== 'object' || error === null)
        return undefined;
    const driveError = error;
    return driveError.status ?? driveError.result?.error?.code;
};
const getDriveErrorMessage = (error, fallback) => {
    if (error instanceof Error && error.message)
        return error.message;
    return fallback;
};
const isLegacyPeopleMap = (value) => {
    return Object.values(value).some((entry) => validatePerson(entry).id !== undefined);
};
export class GoogleDriveService {
    constructor(apiService) {
        this.apiService = apiService;
    }
    async ensureInitialized() {
        if (this.apiService.isInitialized && window.gapi?.client?.drive) {
            return;
        }
        logInfo('GoogleDriveService ensureInitialized', 'Initializing Google Drive API service.');
        await this.apiService.initialize();
        if (!window.gapi?.client?.drive) {
            throw new Error('Google Drive API failed to initialize.');
        }
    }
    async getOrCreateUserVisibleAppFolderId() {
        return 'appDataFolder';
    }
    async findLatestJozorFile() {
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
        }
        catch (e) {
            logError('GoogleDriveService findLatestJozorFile', e, { showToast: false });
            return null;
        }
    }
    async listJozorFiles() {
        await this.ensureInitialized();
        try {
            const response = await gapi.client.drive.files.list({
                q: `mimeType='application/json' and trashed = false`,
                fields: 'files(id, name, modifiedTime)',
                spaces: 'appDataFolder',
                orderBy: 'modifiedTime desc',
                pageSize: 100,
            });
            return (response.result.files?.map((f) => ({
                id: f.id || '',
                name: f.name || '',
                modifiedTime: f.modifiedTime || '',
            })) || []);
        }
        catch (e) {
            logError('GoogleDriveService listJozorFiles', e, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { operationType: 'list_drive_files' }
            });
            throw error;
        }
    }
    async deleteFile(fileId) {
        await this.ensureInitialized();
        try {
            await gapi.client.drive.files.delete({
                fileId: fileId,
            });
        }
        catch (e) {
            logError('GoogleDriveService deleteFile', e, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { fileId, operationType: 'delete_drive_file' }
            });
            throw error;
        }
    }
    // Updated return type to any for now to handle migration, or prefer FullState
    async loadFile(fileId) {
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
            if (!('version' in parsed) && !('metadata' in parsed) && isLegacyPeopleMap(parsed)) {
                const validated = {};
                Object.entries(parsed).forEach(([key, value]) => {
                    validated[key] = validatePerson(value);
                });
                return { people: validated }; // Treat as partial FullState
            }
            // Assume FullState
            return parsed;
        }
        catch (error) {
            logError('GoogleDriveService loadFile', error, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { fileId, operationType: 'load_drive_file' }
            });
            // Provide more specific error message
            const status = getDriveErrorStatus(error);
            if (status === 404) {
                throw new Error('File not found in Google Drive');
            }
            else if (status === 403) {
                throw new Error('Permission denied to access file');
            }
            else if (e.message) {
                throw new Error(e.message);
            }
            else {
                throw new Error('Failed to load file from Google Drive');
            }
        }
    }
    async saveFile(data, existingFileId, customFileName, forceNew) {
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
            let targetFileId = forceNew ? null : existingFileId;
            // 1. Mandatory Verification: If an ID is provided, verify it exists and is reachable
            if (targetFileId) {
                try {
                    const fileCheck = await gapi.client.drive.files.get({
                        fileId: targetFileId,
                        fields: 'id, trashed',
                    });
                    if (fileCheck.result.trashed) {
                        logWarn('GoogleDriveService saveFile verification', 'Drive file is trashed. Resetting stored file id.', {
                            category: 'SYNC',
                            metadata: { fileId: targetFileId, operationType: 'save_drive_file' }
                        });
                        targetFileId = null;
                        localStorage.removeItem('jozor_gdrive_file_id');
                    }
                }
                catch (error) {
                    const status = getDriveErrorStatus(error);
                    logWarn('GoogleDriveService saveFile verification', 'Drive file verification failed before save.', {
                        category: status === 401 ? 'AUTH' : 'SYNC',
                        metadata: { fileId: targetFileId, status, operationType: 'save_drive_file' }
                    });
                    // ONLY PURGE on permanent failure (404, 410) or explicit ghost detection
                    const isPermanentFailure = status === 404 || status === 410;
                    if (isPermanentFailure) {
                        logWarn('GoogleDriveService saveFile verification', 'Permanent verification failure. Purging stored Drive file id.', {
                            category: 'SYNC',
                            metadata: { fileId: targetFileId, status, operationType: 'save_drive_file' }
                        });
                        targetFileId = null;
                        localStorage.removeItem('jozor_gdrive_file_id');
                    }
                    if (status === 401)
                        throw error; // Propagate for re-auth
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
                }
                catch {
                    logWarn('GoogleDriveService saveFile searchFallback', 'Searching Drive by file name failed.', {
                        category: 'NETWORK',
                        metadata: { fileName: fileNameToUse, operationType: 'save_drive_file' }
                    });
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
                }
                catch (error) {
                    const status = getDriveErrorStatus(error);
                    logError('GoogleDriveService saveFile patch', error, {
                        category: status === 401 ? 'AUTH' : 'NETWORK',
                        severity: 'MEDIUM',
                        metadata: { fileId: targetFileId, status, operationType: 'save_drive_file' }
                    });
                    if (status === 401)
                        throw error;
                    // ONLY RESET if permanent (404, 410)
                    if (status === 404 || status === 410) {
                        logWarn('GoogleDriveService saveFile patch', 'Drive file disappeared during patch. Resetting stored file id.', {
                            category: 'SYNC',
                            metadata: { fileId: targetFileId, status, operationType: 'save_drive_file' }
                        });
                        targetFileId = null;
                        localStorage.removeItem('jozor_gdrive_file_id');
                    }
                    else {
                        // For other errors (500, etc), just rethrow and keep the ID for retry
                        throw error;
                    }
                }
            }
            // 4. Create new file if needed
            if (!targetFileId) {
                logInfo('GoogleDriveService saveFile createFallback', 'Creating a fresh Drive backup file after recovery.', {
                    operationType: 'save_drive_file',
                    forceNew: Boolean(forceNew)
                });
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
                const res = createResponse.result;
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
            }
            else {
                throw new Error('Failed to synchronize file even after forced reset.');
            }
        }
        catch (error) {
            const status = getDriveErrorStatus(error);
            logError('GoogleDriveService saveFile', error, {
                category: status === 401 ? 'AUTH' : status === 403 ? 'PERMISSION' : 'NETWORK',
                severity: 'HIGH',
                metadata: { fileId: existingFileId, status, operationType: 'save_drive_file', forceNew: Boolean(forceNew) }
            });
            // ONLY PURGE ID on permanent failures (404, 410)
            const isPermanentFailure = status === 404 || status === 410;
            if (isPermanentFailure) {
                localStorage.removeItem('jozor_gdrive_file_id');
            }
            window.dispatchEvent(new CustomEvent('drive-upload-error', {
                detail: { message: getDriveErrorMessage(error, 'Sync failed'), status }
            }));
            throw error;
        }
    }
    async shareFile(fileId, email, role = 'writer') {
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
        }
        catch (e) {
            logError('GoogleDriveService shareFile', e, {
                category: 'PERMISSION',
                severity: 'MEDIUM',
                metadata: { fileId, email, role, operationType: 'share_drive_file' }
            });
            throw e;
        }
    }
    async unshareFile(fileId, email) {
        await this.ensureInitialized();
        try {
            // 1. Find permission ID for the email
            const permissionsResponse = await gapi.client.drive.permissions.list({
                fileId: fileId,
                fields: 'permissions(id, emailAddress)',
            });
            const permission = permissionsResponse.result.permissions?.find((p) => p.emailAddress?.toLowerCase() === email.toLowerCase());
            if (permission && permission.id) {
                // 2. Delete the permission
                await gapi.client.drive.permissions.delete({
                    fileId: fileId,
                    permissionId: permission.id,
                });
            }
            else {
                logWarn('GoogleDriveService unshareFile', 'No matching Drive permission was found for this collaborator.', {
                    category: 'PERMISSION',
                    metadata: { fileId, email, operationType: 'unshare_drive_file' }
                });
            }
        }
        catch (e) {
            logError('GoogleDriveService unshareFile', e, {
                category: 'PERMISSION',
                severity: 'MEDIUM',
                metadata: { fileId, email, operationType: 'unshare_drive_file' }
            });
            throw e;
        }
    }
    async listSnapshots(treeId) {
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
            return (response.result.files?.map((f) => ({
                id: f.id || '',
                name: f.name || '',
                modifiedTime: f.modifiedTime || '',
            })) || []);
        }
        catch (error) {
            const status = getDriveErrorStatus(error);
            logWarn('GoogleDriveService listSnapshots', 'Failed to list snapshots.', {
                category: status === 403 ? 'PERMISSION' : 'NETWORK',
                metadata: { treeId, status, operationType: 'list_snapshots' }
            });
            if (status === 403) {
                return [];
            }
            throw error;
        }
    }
    async saveSnapshot(data, treeId, label) {
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
            const res = createResponse.result;
            const fileId = res.id;
            if (fileId) {
                await gapi.client.request({
                    path: `/upload/drive/v3/files/${fileId}`,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: content,
                });
                return fileId;
            }
            else {
                throw new Error('Failed to create snapshot file.');
            }
        }
        catch (e) {
            logError('GoogleDriveService saveSnapshot', e, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { treeId, label, operationType: 'save_snapshot' }
            });
            throw e;
        }
    }
    async cleanupSnapshots(treeId) {
        try {
            const snapshots = await this.listSnapshots(treeId);
            if (snapshots.length > 15) {
                const toDelete = snapshots.slice(15);
                logInfo('GoogleDriveService cleanupSnapshots', 'Cleaning up old snapshots in parallel.', {
                    treeId,
                    deleteCount: toDelete.length,
                    operationType: 'cleanup_snapshots'
                });
                // Use Promise.all for faster cleanup
                await Promise.all(toDelete.map(file => this.deleteFile(file.id)));
            }
        }
        catch {
            logWarn('GoogleDriveService cleanupSnapshots', 'Failed to clean up old snapshots.', {
                category: 'NETWORK',
                metadata: { treeId, operationType: 'cleanup_snapshots' }
            });
        }
    }
}
