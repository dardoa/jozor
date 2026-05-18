import type { DriveFile } from '../types';
import { googleDriveService } from './googleService';
import type { GoogleDrivePayload } from './google/interfaces';

/**
 * App-level provider wrapper around the Google Drive implementation.
 *
 * This keeps hooks and UI code dependent on a storage boundary instead of the
 * concrete Drive service so we can swap providers later without rewriting
 * every caller.
 */
export class GoogleDriveProvider {
  async findLatestFile(): Promise<string | null> {
    return googleDriveService.findLatestJozorFile();
  }

  /**
   * Lists archive files without exposing the Google-specific service to callers.
   */
  async listFiles(): Promise<DriveFile[]> {
    return googleDriveService.listJozorFiles();
  }

  async loadFile(fileId: string): Promise<GoogleDrivePayload> {
    return googleDriveService.loadFile(fileId);
  }

  async saveFile(
    data: GoogleDrivePayload,
    existingFileId: string | null,
    customFileName?: string,
    forceNew?: boolean
  ): Promise<string> {
    return googleDriveService.saveFile(data, existingFileId, customFileName, forceNew);
  }

  async deleteFile(fileId: string): Promise<void> {
    return googleDriveService.deleteFile(fileId);
  }

  async renameFile(fileId: string, newName: string): Promise<void> {
    return googleDriveService.renameFile(fileId, newName);
  }

  async listSnapshots(treeId: string): Promise<DriveFile[]> {
    return googleDriveService.listSnapshots(treeId);
  }

  async saveSnapshot(data: Blob, treeId: string, label: string): Promise<string> {
    return googleDriveService.saveSnapshot(data, treeId, label);
  }

  async loadSnapshotFileRaw(fileId: string): Promise<Blob> {
    return googleDriveService.loadSnapshotFileRaw(fileId);
  }

  async cleanupSnapshots(treeId: string, keepCount?: number): Promise<void> {
    return googleDriveService.cleanupSnapshots(treeId, keepCount);
  }
}

export const googleDriveProvider = new GoogleDriveProvider();
