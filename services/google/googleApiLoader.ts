// services/google/googleApiLoader.ts

import { GOOGLE_CLIENT_ID } from '../../constants';
import { loadScript, waitForGlobal } from './googleUtils';

// Global types for window object
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export const SCOPES = 'https://www.googleapis.com/auth/drive.appfolder https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
export const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest'];

export const SCRIPTS = {
    GAPI: 'https://apis.google.com/js/api.js',
    GSI: 'https://accounts.google.com/gsi/client'
};

export let tokenClient: any;
export let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initializes Google API Client (GAPI) for Drive calls and Google Identity Services (GSI).
 * Ensures scripts are loaded and clients are ready for use.
 */
export const initializeGoogleApi = async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    if (initPromise) return initPromise;
    if (isInitialized && tokenClient) return Promise.resolve();

    initPromise = (async () => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn("Google Client ID is not configured. Google Drive features will be disabled.");
            isInitialized = false;
            return;
        }

        try {
            console.log("Initializing Google Services...");
            
            await Promise.all([
                loadScript(SCRIPTS.GAPI, 'gapi-script'),
                loadScript(SCRIPTS.GSI, 'google-gsi-script')
            ]);

            await Promise.all([
                waitForGlobal('gapi'),
                waitForGlobal('google')
            ]);

            await new Promise<void>((resolve, reject) => {
                if (!window.gapi) {
                    reject(new Error("GAPI global not found"));
                    return;
                }

                window.gapi.load('client:picker', async () => {
                    try {
                        await window.gapi.client.init({
                            discoveryDocs: DISCOVERY_DOCS,
                        });
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            if (window.google?.accounts?.oauth2) {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: () => {},
                });
            } else {
                throw new Error("Google Identity Services not available");
            }
            
            isInitialized = true;
            console.log("Google Services Ready");
        } catch (err) {
            console.error("Google Init Failed:", err);
            isInitialized = false;
            initPromise = null;
            throw err;
        }
    })();

    return initPromise;
};