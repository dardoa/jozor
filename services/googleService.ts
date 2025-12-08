import { GOOGLE_CLIENT_ID, FILE_NAME } from '../constants';
import { UserProfile, Person, DriveFile } from '../types';

// Types for global google objects
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

// Updated scopes to use drive.appfolder for application data
// drive.file is added for Google Picker functionality, which needs access to specific files picked by user.
const SCOPES = 'https://www.googleapis.com/auth/drive.appfolder https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest'];

// Scripts to load dynamically
const SCRIPTS = {
    GAPI: 'https://apis.google.com/js/api.js',
    GSI: 'https://accounts.google.com/gsi/client'
};

let tokenClient: any;
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let userVisibleAppFolderId: string | null = null; // Cache for the user-visible folder ID

// Helper to inject script
const loadScript = (src: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            resolve();
            return;
        }
        
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
             
             tokenClient.callback = async (resp: any) => {
                if (resp.error) {
                    return reject(resp.error);
                }
                window.gapi.client.setToken(resp);
                
                try {
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

// New function to get or create the user-visible 'Family Tree App' folder
const getOrCreateUserVisibleAppFolderId = async (): Promise<string> => {
    if (userVisibleAppFolderId) return userVisibleAppFolderId; // Return cached ID

    if (!isInitialized) throw new Error("Google API not initialized");

    try {
        // 1. Search for the folder
        const searchResponse = await window.gapi.client.drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and name='Family Tree App' and trashed = false",
            fields: 'files(id, name)',
            spaces: 'drive', // Search in My Drive
            pageSize: 1
        });

        const folders = searchResponse.result.files;
        if (folders && folders.length > 0) {
            userVisibleAppFolderId = folders[0].id;
            console.log(`Found 'Family Tree App' folder with ID: ${userVisibleAppFolderId}`);
            return userVisibleAppFolderId!; // Assert non-null
        }

        // 2. If not found, create it
        console.log("Creating 'Family Tree App' folder...");
        const createResponse = await window.gapi.client.drive.files.create({
            resource: {
                name: 'Family Tree App',
                mimeType: 'application/vnd.google-apps.folder',
                parents: ['root'] // Create in My Drive root
            },
            fields: 'id, name',
            spaces: 'drive' // Specify drive space for creation
        });
        userVisibleAppFolderId = createResponse.result.id;
        console.log(`Created 'Family Tree App' folder with ID: ${userVisibleAppFolderId}`);
        return userVisibleAppFolderId!; // Assert non-null

    } catch (e) {
        console.error("Error getting or creating 'Family Tree App' folder", e);
        throw e;
    }
};


export const findLatestJozorFile = async (): Promise<string | null> => {
    if (!isInitialized) {
        console.warn("Google API not initialized. Cannot find app file.");
        return null;
    }
    try {
        const folderId = await getOrCreateUserVisibleAppFolderId(); // Use the user-visible folder
        console.log(`Searching for latest Jozor file in 'Family Tree App' folder (ID: ${folderId})...`);
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/json' and name='${FILE_NAME}' and '${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive', // Search in My Drive
            orderBy: 'modifiedTime desc',
            pageSize: 1
        });
        const files = response.result.files;
        console.log(`Found ${files ? files.length : 0} Jozor files matching '${FILE_NAME}' in 'Family Tree App' folder:`, files.map((f:any) => f.name));
        return (files && files.length > 0) ? files[0].id : null;
    } catch (e) {
        console.error("Error finding latest Jozor file", e);
        return null;
    }
};

export const listJozorFiles = async (): Promise<DriveFile[]> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    try {
        const folderId = await getOrCreateUserVisibleAppFolderId(); // Use the user-visible folder
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/json' and (name='${FILE_NAME}' or name contains 'jozor') and '${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive', // Search in My Drive
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
            spaces: 'drive' // Specify drive space for retrieval
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
    
    const folderId = await getOrCreateUserVisibleAppFolderId(); // Use the user-visible folder ID
    let fileNameToUse = customFileName || FILE_NAME; 
    
    // Ensure fileNameToUse is never empty or 'Untitled'
    if (!fileNameToUse || fileNameToUse.toLowerCase() === 'untitled') {
        console.warn("Filename was empty or 'untitled', defaulting to FILE_NAME.");
        fileNameToUse = FILE_NAME;
    }

    console.log(`saveToDrive called. existingFileId (hint): ${existingFileId}, customFileName: ${customFileName}, resolved fileNameToUse: ${fileNameToUse}, target folderId: ${folderId}`);

    const content = JSON.stringify(people, null, 2);
    const metadata = {
        name: fileNameToUse,
        mimeType: 'application/json',
        parents: [folderId] // Save to the user-visible 'Family Tree App' folder
    };

    try {
        let targetFileId: string | null = existingFileId; // Start with the provided existingFileId

        // If an existingFileId is provided, try to update it directly.
        // We should also verify it still exists and is not trashed.
        if (targetFileId) {
            try {
                const fileCheck = await window.gapi.client.drive.files.get({
                    fileId: targetFileId,
                    fields: 'id, trashed',
                    spaces: 'drive'
                });
                if (fileCheck.result.trashed) {
                    console.warn(`Provided existingFileId ${targetFileId} is trashed. Will attempt to find/create by name.`);
                    targetFileId = null; // Treat as if no existing ID was provided
                } else {
                    console.log(`Provided existingFileId ${targetFileId} is valid. Updating it directly.`);
                }
            } catch (checkError: any) {
                if (checkError.status === 404) { // File not found
                    console.warn(`Provided existingFileId ${targetFileId} not found. Will attempt to find/create by name.`);
                    targetFileId = null;
                } else {
                    throw checkError; // Re-throw other errors
                }
            }
        }

        // If no valid targetFileId from the parameter, then proceed with searching by name
        if (!targetFileId) {
            console.log(`No valid existingFileId provided or found. Performing pre-save check for file named '${fileNameToUse}' in 'Family Tree App' folder (ID: ${folderId}).`);
            const searchResponse = await window.gapi.client.drive.files.list({
                q: `mimeType='application/json' and name='${fileNameToUse}' and '${folderId}' in parents and trashed = false`,
                fields: 'files(id, name)',
                spaces: 'drive',
                pageSize: 1
            });
            const foundFiles = searchResponse.result.files;

            if (foundFiles && foundFiles.length > 0) {
                targetFileId = foundFiles[0].id;
                console.log(`File ID found by name: ${targetFileId}. Updating existing file.`);
            } else {
                console.log('No file found by name, creating new one.');
            }
        }

        if (targetFileId) {
            // Perform PATCH/UPDATE
            await window.gapi.client.request({
                path: `/upload/drive/v3/files/${targetFileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: content,
            });
            console.log(`Successfully updated Drive file with ID: ${targetFileId}`);
            return targetFileId;
        } else {
            // Perform POST/CREATE
            const response = await window.gapi.client.drive.files.create({
                resource: metadata,
                media: {
                    mimeType: 'application/json',
                    body: content,
                },
                fields: 'id, name',
                spaces: 'drive'
            });
            console.log(`New Drive file created. ID: ${response.result.id}, Name returned by API: ${response.result.name}`);
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
                    // For files picked via Picker, we need to fetch their webContentLink or webViewLink
                    // The 'drive.file' scope allows access to these specific picked files.
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
            .setAppId(GOOGLE_CLIENT_ID!.split('-')[0])
            .setOAuthToken(token)
            .addView(view)
            .addView(new window.google.picker.DocsUploadView())
            .setCallback(pickerCallback)
            .build();

        picker.setVisible(true);
    });
};

// --- New: Upload File to Drive ---
export const uploadFileToDrive = async (file: Blob, fileName: string, mimeType: string): Promise<string> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    if (!window.gapi.client.getToken()?.access_token) throw new Error("Not authenticated to Google Drive.");

    const folderId = await getOrCreateUserVisibleAppFolderId(); // Use the user-visible folder ID
    const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId] // Store in the user-visible 'Family Tree App' folder
    };

    console.log("uploadFileToDrive: Metadata for API call:", metadata); // Added log
    console.log("uploadFileToDrive: Target fileName:", fileName); // Added log

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=drive`, { // Specify drive space for upload
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