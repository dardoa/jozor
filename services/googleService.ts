import { GOOGLE_CLIENT_ID } from '../constants';
import { UserProfile, Person, DriveFile } from '../types';

// Types for global google objects
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

// Updated scopes to allow picking files, storing in appDataFolder, and fetching user profile/email
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest']; // Added oauth2 discovery doc
const FILE_NAME = 'jozor_family_tree.json'; // Default file name

// Scripts to load dynamically
const SCRIPTS = {
    GAPI: 'https://apis.google.com/js/api.js',
    GSI: 'https://accounts.google.com/gsi/client'
};

let tokenClient: any;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Helper to inject script
const loadScript = (src: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            // Script already exists
            resolve();
            return;
        }
        
        // Check if global already exists
        if (src.includes('api.js') && window.gapi) { resolve(); return; }
        if (src.includes('gsi/client') && window.google?.accounts) { resolve(); return; }

        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script ${src}`));
        document.head.appendChild(script);
    });
};

// Helper to wait for global variables to be ready
const waitForGlobal = (key: string, timeout = 10000) => new Promise<void>((resolve, reject) => {
    if (window[key as any]) return resolve();
    
    const startTime = Date.now();
    const interval = setInterval(() => {
        if (window[key as any]) {
            clearInterval(interval);
            resolve();
        } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            reject(new Error(`Timeout waiting for ${key} to load`));
        }
    }, 100);
});

// Initialize Google API Client (GAPI) for Drive calls
export const initializeGoogleApi = async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    // Return existing promise if in progress
    if (initPromise) return initPromise;
    // Return immediately if already initialized
    if (isInitialized && tokenClient) return Promise.resolve();

    initPromise = (async () => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn("Google Client ID is not configured. Google Drive features will be disabled.");
            isInitialized = false; // Explicitly set to false
            return; // Do not proceed with initialization
        }

        try {
            console.log("Initializing Google Services...");
            
            // 1. Load Scripts
            await Promise.all([
                loadScript(SCRIPTS.GAPI, 'gapi-script'),
                loadScript(SCRIPTS.GSI, 'google-gsi-script')
            ]);

            // 2. Wait for Globals
            await Promise.all([
                waitForGlobal('gapi'),
                waitForGlobal('google')
            ]);

            // 3. Init GAPI Client (Client + Picker)
            await new Promise<void>((resolve, reject) => {
                if (!window.gapi) {
                    reject(new Error("GAPI global not found"));
                    return;
                }

                // Load client and picker libraries
                window.gapi.load('client:picker', async () => {
                    try {
                        // After 'client' load, gapi.client is available
                        await window.gapi.client.init({
                            discoveryDocs: DISCOVERY_DOCS,
                        });
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            // 4. Init GSI Token Client
            if (window.google?.accounts?.oauth2) {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: () => {}, // Callback is overridden in loginToGoogle
                });
            } else {
                throw new Error("Google Identity Services not available");
            }
            
            isInitialized = true;
            console.log("Google Services Ready");
        } catch (err) {
            console.error("Google Init Failed:", err);
            isInitialized = false;
            initPromise = null; // Reset to allow retry
            throw err;
        }
    })();

    return initPromise;
};

// Login Flow
export const loginToGoogle = (): Promise<UserProfile> => {
    return new Promise((resolve, reject) => {
        if (!GOOGLE_CLIENT_ID) {
            return reject("Google Client ID is not configured. Login disabled.");
        }

        const performLogin = () => {
             if (!tokenClient) {
                return reject("Google API not initialized.");
             }
             
             // Use tokenClient to request access token
             tokenClient.callback = async (resp: any) => {
                if (resp.error) {
                    return reject(resp.error);
                }
                // Set the token for gapi.client
                window.gapi.client.setToken(resp);
                
                // Fetch user info
                try {
                    // No need to load 'oauth2' again if it's in DISCOVERY_DOCS
                    const userInfo = await window.gapi.client.oauth2.userinfo.get();
                    const userProfile: UserProfile = {
                        uid: userInfo.result.id,
                        displayName: userInfo.result.name,
                        email: userInfo.result.email,
                        photoURL: userInfo.result.picture
                    };
                    resolve(userProfile);
                } catch (e) {
                    reject(new Error("Failed to fetch user info after login."));
                }
             };
             tokenClient.requestAccessToken();
        };

        if (!isInitialized || !tokenClient) {
            initializeGoogleApi()
                .then(performLogin)
                .catch((e) => {
                    console.error(e);
                    reject(e);
                });
        } else {
            performLogin();
        }
    });
};

export const logoutFromGoogle = () => {
    if (window.gapi && window.gapi.client) {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Token revoked');
            });
            window.gapi.client.setToken(null);
        }
    }
};

// --- Drive Operations ---

export const findAppFile = async (): Promise<string | null> => {
    if (!isInitialized) {
        console.warn("Google API not initialized. Cannot find app file.");
        return null;
    }
    try {
        console.log(`Searching for file named '${FILE_NAME}' in Google Drive appDataFolder...`);
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${FILE_NAME}' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'appDataFolder', // <--- CORRECTED THIS LINE
        });
        const files = response.result.files;
        console.log(`Found ${files ? files.length : 0} files matching '${FILE_NAME}':`, files);
        return (files && files.length > 0) ? files[0].id : null;
    } catch (e) {
        console.error("Error finding file", e);
        return null;
    }
};

export const listJozorFiles = async (): Promise<DriveFile[]> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/json' and name contains 'jozor' and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'appDataFolder',
        });
        return response.result.files.map((f: any) => ({
            id: f.id,
            name: f.name,
            modifiedTime: f.modifiedTime,
        }));
    } catch (e) {
        console.error("Error listing Jozor files", e);
        throw e;
    }
};

export const deleteDriveFile = async (fileId: string): Promise<void> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    try {
        await window.gapi.client.drive.files.delete({
            fileId: fileId,
        });
    } catch (e) {
        console.error("Error deleting file", e);
        throw e;
    }
};

export const loadFromDrive = async (fileId: string): Promise<Record<string, Person>> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        const result = response.result;
        return typeof result === 'string' ? JSON.parse(result) : result;
    } catch (e) {
        console.error("Error loading file", e);
        throw e;
    }
};

export const saveToDrive = async (people: Record<string, Person>, existingFileId: string | null, customFileName?: string): Promise<string> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    
    console.log(`saveToDrive called. existingFileId: ${existingFileId}, customFileName: ${customFileName}`); // Added log

    const content = JSON.stringify(people, null, 2);
    const metadata = {
        name: customFileName || FILE_NAME, // Use customFileName if provided, otherwise default
        mimeType: 'application/json',
        parents: ['appDataFolder'] // Ensure it's always saved to appDataFolder
    };

    try {
        if (existingFileId) {
            // Update
            console.log(`Updating existing file with ID: ${existingFileId}`);
            await window.gapi.client.request({
                path: `/upload/drive/v3/files/${existingFileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: content,
            });
            return existingFileId;
        } else {
            // Create
            console.log(`Creating new file: ${metadata.name}`);
            console.log('Metadata for new file creation:', metadata); // Added log
            const response = await window.gapi.client.drive.files.create({
                resource: metadata,
                media: {
                    mimeType: 'application/json',
                    body: content
                },
                fields: 'id'
            });
            console.log(`New file created with ID: ${response.result.id}`);
            return response.result.id;
        }
    } catch (e) {
        console.error("Error saving to Drive", e);
        throw e;
    }
};

// --- Drive Picker Operation ---

export const pickAndDownloadImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!isInitialized || !window.google?.picker) {
            return reject("Google Picker not initialized or Google API not initialized.");
        }

        const token = window.gapi.client.getToken()?.access_token;
        if (!token) {
            return reject("No auth token found");
        }

        const pickerCallback = async (data: any) => {
            if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
                const doc = data[window.google.picker.Response.DOCUMENTS][0];
                const fileId = doc[window.google.picker.Document.ID];
                
                try {
                    // Get webContentLink directly
                    const fileDetails = await window.gapi.client.drive.files.get({
                        fileId: fileId,
                        fields: 'webContentLink,webViewLink'
                    });
                    resolve(fileDetails.result.webContentLink || fileDetails.result.webViewLink);

                } catch (e) {
                    console.error("Drive Link Retrieval Error", e);
                    reject(e);
                }
            } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
                reject("Cancelled");
            }
        };

        const view = new window.google.picker.View(window.google.picker.ViewId.DOCS_IMAGES);
        view.setMimeTypes("image/png,image/jpeg,image/jpg,image/webp");

        const picker = new window.google.picker.PickerBuilder()
            .setAppId(GOOGLE_CLIENT_ID!.split('-')[0]) // Project number usually, but client ID works sometimes
            .setOAuthToken(token)
            .addView(view)
            .addView(new window.google.picker.DocsUploadView()) // Allow uploading too
            .setCallback(pickerCallback)
            .build();

        picker.setVisible(true);
    });
};

// --- New: Upload File to Drive ---
export const uploadFileToDrive = async (file: Blob, fileName: string, mimeType: string): Promise<string> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    if (!window.gapi.client.getToken()?.access_token) throw new Error("Not authenticated to Google Drive.");

    const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: ['appDataFolder'] // Store in app-specific hidden folder
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`
            },
            body: form
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        // Return webContentLink for direct download, or webViewLink for viewing
        const fileId = result.id;
        const fileDetails = await window.gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'webContentLink,webViewLink'
        });
        return fileDetails.result.webContentLink || fileDetails.result.webViewLink;

    } catch (e) {
        console.error("Error uploading file to Drive", e);
        throw e;
    }
};

// --- New: Fetch Drive File as Blob ---
export const fetchDriveFileAsBlob = async (url: string): Promise<Blob> => {
    const token = window.gapi.client.getToken()?.access_token;
    if (!token) throw new Error("No Google auth token available to fetch Drive file.");

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Failed to fetch Drive file: ${response.statusText}`);
    return response.blob();
};