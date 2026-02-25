import { Person, DriveFile, UserProfile } from '../../types';

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
    loadFile(fileId: string): Promise<Record<string, Person>>;
    saveFile(
        data: any,
        existingFileId: string | null,
        customFileName?: string,
        forceNew?: boolean
    ): Promise<string>;
    listSnapshots(treeId: string): Promise<DriveFile[]>;
    saveSnapshot(data: any, treeId: string, label: string): Promise<string>;
    cleanupSnapshots(treeId: string): Promise<void>;
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
