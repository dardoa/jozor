import { GoogleApiService } from './google/GoogleApiService';
import { GoogleAuthService } from './google/GoogleAuthService';
import { GoogleDriveService } from './google/GoogleDriveService';
import { GoogleMediaService } from './google/GoogleMediaService';
import { GOOGLE_CLIENT_ID } from '../constants';

// 1. Instantiate the API Service (Singletonish)
export const googleApiService = new GoogleApiService(GOOGLE_CLIENT_ID);

// 2. Inject API Service into other services
export const googleAuthService = new GoogleAuthService(googleApiService);
export const googleDriveService = new GoogleDriveService(googleApiService);
export const googleMediaService = new GoogleMediaService(googleApiService, googleDriveService);

// Re-export types if needed by consumers
export * from './google/interfaces';

// Legacy exports for backward compatibility
export const initializeGoogleApi = () => googleApiService.initialize();
export const shareFileWithEmail = (fileId: string, email: string, role?: 'reader' | 'writer' | 'owner') =>
    googleDriveService.shareFile(fileId, email, role);
export const unshareFileWithEmail = (fileId: string, email: string) =>
    googleDriveService.unshareFile(fileId, email);
export const fetchDriveFileAsBlob = (url: string) =>
    googleMediaService.fetchFileAsBlob(url);

