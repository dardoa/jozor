// services/google/googleMedia.ts

import { GOOGLE_CLIENT_ID } from '../../constants';
import { isInitialized } from './googleApiLoader';
import { getOrCreateUserVisibleAppFolderId } from './googleDrive';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

/**
 * Opens Google Picker to allow the user to select an image from Drive,
 * then fetches its webContentLink or webViewLink.
 */
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

/**
 * Uploads a file (Blob) to the app's visible Google Drive folder.
 * Returns the webContentLink or webViewLink of the uploaded file.
 */
export const uploadFileToDrive = async (file: Blob, fileName: string, mimeType: string): Promise<string> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    if (!window.gapi.client.getToken()?.access_token) throw new Error("Not authenticated to Google Drive.");

    const folderId = await getOrCreateUserVisibleAppFolderId();
    const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId]
    };

    console.log("uploadFileToDrive: Metadata for API call:", metadata);
    console.log("uploadFileToDrive: Target fileName:", fileName);

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=drive`, {
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

/**
 * Fetches a Google Drive file as a Blob given its webContentLink or webViewLink.
 */
export const fetchDriveFileAsBlob = async (url: string): Promise<Blob> => {
    const token = window.gapi.client.getToken()?.access_token;
    if (!token) throw new Error("No Google auth token available to fetch Drive file.");

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Failed to fetch Drive file: ${response.statusText}`);
    return response.blob();
};