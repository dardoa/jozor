import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY } from '../../constants';
import { loadScript, waitForGlobal } from './googleUtils';
import { IGoogleApiService } from './interfaces';

export const SCOPES =
    'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
export const DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest',
];

export const SCRIPTS = {
    GAPI: 'https://apis.google.com/js/api.js',
    GSI: 'https://accounts.google.com/gsi/client',
};

export class GoogleApiService implements IGoogleApiService {
    public isInitialized = false;
    private tokenClient: google.accounts.oauth2.TokenClient | undefined;
    private codeClient: google.accounts.oauth2.CodeClient | undefined;
    private initPromise: Promise<void> | null = null;
    private clientId: string;

    constructor(clientId: string = GOOGLE_CLIENT_ID) {
        this.clientId = clientId;
    }

    public getTokenClient(): google.accounts.oauth2.TokenClient | undefined {
        return this.tokenClient;
    }

    public getCodeClient(): google.accounts.oauth2.CodeClient | undefined {
        return this.codeClient;
    }

    public async initialize(): Promise<void> {
        if (typeof window === 'undefined') return;
        if (this.initPromise) return this.initPromise;
        if (this.isInitialized && this.tokenClient) return Promise.resolve();

        this.initPromise = (async () => {
            if (!this.clientId) {
                console.warn('Google Client ID is not configured. Google Drive features will be disabled.');
                this.isInitialized = false;
                return;
            }

            try {
                await Promise.all([
                    loadScript(SCRIPTS.GAPI, 'gapi-script'),
                    loadScript(SCRIPTS.GSI, 'google-gsi-script'),
                ]);

                await Promise.all([waitForGlobal('gapi'), waitForGlobal('google')]);

                await new Promise<void>((resolve, reject) => {
                    if (!gapi) {
                        reject(new Error('GAPI global not found'));
                        return;
                    }

                    gapi.load('client:picker', async () => {
                        try {
                            // The Drive discovery endpoint does NOT require an API key.
                            // Drive API calls use OAuth Bearer tokens (set via gapi.client.setToken).
                            // API Key is only used in GoogleMediaService for the Picker widget.
                            await gapi.client.init({
                                discoveryDocs: DISCOVERY_DOCS,
                            });
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    });
                });

                if (google?.accounts?.oauth2) {
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.clientId,
                        scope: SCOPES,
                        callback: () => { },
                    });

                    this.codeClient = google.accounts.oauth2.initCodeClient({
                        client_id: this.clientId,
                        scope: SCOPES,
                        ux_mode: 'popup',
                        callback: () => { },
                    });
                } else {
                    throw new Error('Google Identity Services not available');
                }

                this.isInitialized = true;
            } catch (err) {
                console.error('Google Init Failed:', err);
                this.isInitialized = false;
                this.initPromise = null;
                throw err;
            }
        })();

        return this.initPromise;
    }
}
