import type { DriveFile } from '../../types';
import { logError, logInfo, logWarn } from '../../utils/errorLogger';
import type { SnapshotPayload } from './interfaces';
import {
    ARCHIVE_MIME_TYPE,
    buildSnapshotFileName,
    getDriveErrorStatus,
    isSupportedSnapshotFile,
} from './googleDriveServiceUtils';

export class DriveSnapshotsClient {
    constructor(
        private readonly ensureInitialized: () => Promise<void>,
        private readonly deleteFile: (fileId: string) => Promise<void>
    ) {}

    async listSnapshots(treeId: string): Promise<DriveFile[]> {
        await this.ensureInitialized();
        try {
            const query = `name contains 'snapshot_${treeId}_' and trashed = false`;

            const response = await gapi.client.drive.files.list({
                q: query,
                fields: 'files(id, name, modifiedTime, mimeType)',
                spaces: 'appDataFolder',
                orderBy: 'modifiedTime desc',
                pageSize: 100,
            });

            return (
                response.result.files
                    ?.filter((file) => isSupportedSnapshotFile(file.name || '', file.mimeType || ''))
                    .map((f) => ({
                        id: f.id || '',
                        name: f.name || '',
                        modifiedTime: f.modifiedTime || '',
                    })) || []
            );
        } catch (error: unknown) {
            const status = getDriveErrorStatus(error);
            logWarn('GoogleDriveService listSnapshots', 'Failed to list snapshots.', {
                category: status === 403 ? 'PERMISSION' : 'NETWORK',
                metadata: { treeId, status, operationType: 'list_snapshots' },
            });
            if (status === 403) {
                return [];
            }
            throw error;
        }
    }

    async saveSnapshot(data: Blob, treeId: string, label: string): Promise<string> {
        await this.ensureInitialized();

        const fileName = buildSnapshotFileName(treeId, label);

        try {
            const createResponse = await gapi.client.request({
                path: '/drive/v3/files',
                method: 'POST',
                body: {
                    name: fileName,
                    mimeType: ARCHIVE_MIME_TYPE,
                    parents: ['appDataFolder'],
                },
            });

            const fileId = (createResponse.result as { id: string }).id;

            if (!fileId) {
                throw new Error('Failed to create snapshot file.');
            }

            await this.uploadSnapshotContent(fileId, data);
            return fileId;
        } catch (e) {
            logError('GoogleDriveService saveSnapshot', e, {
                category: 'NETWORK',
                severity: 'MEDIUM',
                metadata: { treeId, label, operationType: 'save_snapshot' },
            });
            throw e;
        }
    }

    async loadSnapshotFileRaw(fileId: string): Promise<Blob> {
        await this.ensureInitialized();

        const token = gapi.client.getToken()?.access_token;

        if (!token) {
            throw new Error('No Google auth token available to load snapshot file.');
        }

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to load snapshot file: ${response.status}`);
        }

        return response.blob();
    }

    async cleanupSnapshots(treeId: string, keepCount = 3): Promise<void> {
        try {
            const snapshots = await this.listSnapshots(treeId);

            if (snapshots.length >= keepCount) {
                const toDelete = snapshots.slice(keepCount);
                logInfo('GoogleDriveService cleanupSnapshots', 'Cleaning up old snapshots in parallel.', {
                    treeId,
                    deleteCount: toDelete.length,
                    keepCount,
                    operationType: 'cleanup_snapshots',
                });

                await Promise.all(toDelete.map((file) => this.deleteFile(file.id)));
            }
        } catch {
            logWarn('GoogleDriveService cleanupSnapshots', 'Failed to clean up old snapshots.', {
                category: 'NETWORK',
                metadata: { treeId, keepCount, operationType: 'cleanup_snapshots' },
            });
        }
    }

    private async uploadSnapshotContent(fileId: string, payload: SnapshotPayload): Promise<void> {
        const token = gapi.client.getToken()?.access_token;

        if (!token) {
            throw new Error('No Google auth token available to upload snapshot archive.');
        }

        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': ARCHIVE_MIME_TYPE,
            },
            body: payload,
        });

        if (!response.ok) {
            throw new Error(`Failed to upload snapshot archive: ${response.status}`);
        }
    }
}
