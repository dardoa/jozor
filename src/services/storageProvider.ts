import type { DriveFile } from '../types';
import { googleDriveProvider } from './googleDriveProvider';
import type { GoogleDrivePayload } from './google/interfaces';

export interface StorageProvider {
  findLatestFile(): Promise<string | null>;
  listFiles(): Promise<DriveFile[]>;
  loadFile(fileId: string): Promise<GoogleDrivePayload>;
  saveFile(
    data: GoogleDrivePayload,
    existingFileId: string | null,
    customFileName?: string,
    forceNew?: boolean
  ): Promise<string>;
  deleteFile(fileId: string): Promise<void>;
  renameFile(fileId: string, newName: string): Promise<void>;
  listSnapshots(treeId: string): Promise<DriveFile[]>;
  saveSnapshot(data: Blob, treeId: string, label: string): Promise<string>;
  loadSnapshotFileRaw(fileId: string): Promise<Blob>;
  cleanupSnapshots(treeId: string, keepCount?: number): Promise<void>;
}

/**
 * Single app-facing entry point for archive storage operations.
 *
 * Callers depend on this boundary so cloud-provider changes stay localized to
 * provider wiring instead of leaking Google Drive details into hooks and UI.
 */
export const storageProvider: StorageProvider = googleDriveProvider;
