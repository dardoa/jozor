import type { DriveFile } from '../../types';
import type {
    GoogleDrivePayload,
    IGoogleApiService,
    IGoogleDriveService,
} from './interfaces';
import { GoogleDriveApiGuard } from './GoogleDriveApiGuard';
import { DriveFilesClient } from './DriveFilesClient';
import { DrivePayloadClient } from './DrivePayloadClient';
import { DriveSharingClient } from './DriveSharingClient';
import { DriveSnapshotsClient } from './DriveSnapshotsClient';

export class GoogleDriveService implements IGoogleDriveService {
    private readonly apiGuard: GoogleDriveApiGuard;
    private readonly filesClient: DriveFilesClient;
    private readonly payloadClient: DrivePayloadClient;
    private readonly sharingClient: DriveSharingClient;
    private readonly snapshotsClient: DriveSnapshotsClient;

    constructor(apiService: IGoogleApiService) {
        this.apiGuard = new GoogleDriveApiGuard(apiService);

        const ensureInitialized = () => this.apiGuard.ensureInitialized();
        this.filesClient = new DriveFilesClient(ensureInitialized);
        this.payloadClient = new DrivePayloadClient(ensureInitialized);
        this.sharingClient = new DriveSharingClient(ensureInitialized);
        this.snapshotsClient = new DriveSnapshotsClient(
            ensureInitialized,
            (fileId) => this.deleteFile(fileId)
        );
    }

    async getOrCreateUserVisibleAppFolderId(): Promise<string> {
        return 'appDataFolder';
    }

    async findLatestJozorFile(): Promise<string | null> {
        return this.filesClient.findLatestJozorFile();
    }

    async listJozorFiles(): Promise<DriveFile[]> {
        return this.filesClient.listJozorFiles();
    }

    async deleteFile(fileId: string): Promise<void> {
        return this.filesClient.deleteFile(fileId);
    }

    async renameFile(fileId: string, newName: string): Promise<void> {
        return this.filesClient.renameFile(fileId, newName);
    }

    async loadFile(fileId: string): Promise<GoogleDrivePayload> {
        return this.payloadClient.loadFile(fileId);
    }

    async saveFile(
        data: GoogleDrivePayload,
        existingFileId: string | null,
        customFileName?: string,
        forceNew?: boolean
    ): Promise<string> {
        return this.payloadClient.saveFile(data, existingFileId, customFileName, forceNew);
    }

    async shareFile(
        fileId: string,
        email: string,
        role: 'reader' | 'writer' | 'owner' = 'writer'
    ): Promise<void> {
        return this.sharingClient.shareFile(fileId, email, role);
    }

    async unshareFile(fileId: string, email: string): Promise<void> {
        return this.sharingClient.unshareFile(fileId, email);
    }

    async listSnapshots(treeId: string): Promise<DriveFile[]> {
        return this.snapshotsClient.listSnapshots(treeId);
    }

    async saveSnapshot(data: Blob, treeId: string, label: string): Promise<string> {
        return this.snapshotsClient.saveSnapshot(data, treeId, label);
    }

    async loadSnapshotFileRaw(fileId: string): Promise<Blob> {
        return this.snapshotsClient.loadSnapshotFileRaw(fileId);
    }

    async cleanupSnapshots(treeId: string, keepCount = 3): Promise<void> {
        return this.snapshotsClient.cleanupSnapshots(treeId, keepCount);
    }
}
