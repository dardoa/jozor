import { Person, DriveFile, UserProfile } from '../../types';

export type GoogleDrivePayload =
    | Record<string, Person>
    | { people: Record<string, Person> }
    | Record<string, unknown>;

export type SnapshotPayload = Blob;

export interface IGoogleApiService {
    isInitialized: boolean;
    initialize(): Promise<void>;
    getTokenClient(): google.accounts.oauth2.TokenClient | undefined;
    getCodeClient(): google.accounts.oauth2.CodeClient | undefined;
}

export interface IGoogleAuthService {
    login(): Promise<UserProfile>;
    logout(): void;
    ensureTokenValid(shouldLogin?: boolean): Promise<boolean>;
}

export interface IGoogleDriveService {
    getOrCreateUserVisibleAppFolderId(): Promise<string>;
    findLatestJozorFile(): Promise<string | null>;
    listJozorFiles(): Promise<DriveFile[]>;
    deleteFile(fileId: string): Promise<void>;
    renameFile(fileId: string, newName: string): Promise<void>;
    loadFile(fileId: string): Promise<GoogleDrivePayload>;
    saveFile(
        data: GoogleDrivePayload,
        existingFileId: string | null,
        customFileName?: string,
        forceNew?: boolean
    ): Promise<string>;
    listSnapshots(treeId: string): Promise<DriveFile[]>;
    saveSnapshot(data: Blob, treeId: string, label: string): Promise<string>;
    loadSnapshotFileRaw(fileId: string): Promise<Blob>;
    cleanupSnapshots(treeId: string, keepCount?: number): Promise<void>;
    shareFile(
        fileId: string,
        email: string,
        role?: 'reader' | 'writer' | 'owner'
    ): Promise<void>;
    unshareFile(fileId: string, email: string): Promise<void>;
}

export interface IGoogleMediaService {
    pickAndDownloadImage(): Promise<string>;
    uploadFile(file: Blob, fileName: string, mimeType: string): Promise<string>;
    fetchFileAsBlob(url: string): Promise<Blob>;
}
