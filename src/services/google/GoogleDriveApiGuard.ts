import { logInfo } from '../../utils/errorLogger';
import type { IGoogleApiService } from './interfaces';

type GoogleWindow = Window & { gapi?: typeof gapi };

export class GoogleDriveApiGuard {
    constructor(private readonly apiService: IGoogleApiService) {}

    async ensureInitialized(): Promise<void> {
        if (this.apiService.isInitialized && (window as GoogleWindow).gapi?.client?.drive) {
            return;
        }

        logInfo('GoogleDriveService ensureInitialized', 'Initializing Google Drive API service.');
        await this.apiService.initialize();

        if (!(window as GoogleWindow).gapi?.client?.drive) {
            throw new Error('Google Drive API failed to initialize.');
        }
    }
}
