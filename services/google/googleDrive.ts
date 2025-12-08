// services/google/googleDrive.ts

import { Person, DriveFile } from '../../types';
import { FILE_NAME } from '../../constants';
import { isInitialized } from './googleApiLoader';

declare global {
  interface Window {
    gapi: any;
  }
}

let userVisibleAppFolderId: string | null = null; // Cache for the user-visible folder ID

/**
 * Gets or creates the user-visible 'Family Tree App' folder in My Drive.
 * Caches the folder ID for subsequent calls.
 */
export const getOrCreateUserVisibleAppFolderId = async (): Promise<string> => {
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

/**
 * Finds the latest Jozor file (MyTreeData.json) in the app's visible Drive folder.
 */
export const findLatestJozorFile = async (): Promise<string | null> => {
    if (!isInitialized) {
        console.warn("Google API not initialized. Cannot find app file.");
        return null;
    }
    try {
        const folderId = await getOrCreateUserVisibleAppFolderId();
        console.log(`Searching for latest Jozor file in 'Family Tree App' folder (ID: ${folderId})...`);
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/json' and name='${FILE_NAME}' and '${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive',
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

/**
 * Lists all Jozor files in the app's visible Drive folder.
 */
export const listJozorFiles = async (): Promise<DriveFile[]> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    try {
        const folderId = await getOrCreateUserVisibleAppFolderId();
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/json' and (name='${FILE_NAME}' or name contains 'jozor') and '${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive',
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

/**
 * Deletes a specific file from Google Drive.
 */
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

/**
 * Loads content of a specific file from Google Drive.
 */
export const loadFromDrive = async (fileId: string): Promise<Record<string, Person>> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
            spaces: 'drive'
        });
        const result = response.result;
        return typeof result === 'string' ? JSON.parse(result) : result;
    } catch (e) {
        console.error("Error loading file", e);
        throw e;
    }
};

/**
 * Saves family tree data to Google Drive.
 * Prioritizes updating an existing file by ID, then by name, otherwise creates a new file.
 */
export const saveToDrive = async (people: Record<string, Person>, existingFileId: string | null, customFileName?: string): Promise<string> => {
    if (!isInitialized) throw new Error("Google API not initialized");
    
    const folderId = await getOrCreateUserVisibleAppFolderId();
    let fileNameToUse = customFileName || FILE_NAME; 
    
    if (!fileNameToUse || fileNameToUse.toLowerCase() === 'untitled') {
        console.warn("Filename was empty or 'untitled', defaulting to FILE_NAME.");
        fileNameToUse = FILE_NAME;
    }

    console.log(`saveToDrive called. existingFileId (hint): ${existingFileId}, customFileName: ${customFileName}, resolved fileNameToUse: ${fileNameToUse}, target folderId: ${folderId}`);

    const content = JSON.stringify(people, null, 2);
    const metadata = {
        name: fileNameToUse,
        mimeType: 'application/json',
        parents: [folderId]
    };

    try {
        let targetFileId: string | null = existingFileId;

        // 1. If an existingFileId is provided, try to update it directly.
        if (targetFileId) {
            try {
                const fileCheck = await window.gapi.client.drive.files.get({
                    fileId: targetFileId,
                    fields: 'id, trashed',
                    spaces: 'drive'
                });
                if (fileCheck.result.trashed) {
                    console.warn(`Provided existingFileId ${targetFileId} is trashed. Will attempt to find/create by name.`);
                    targetFileId = null;
                } else {
                    console.log(`Provided existingFileId ${targetFileId} is valid. Updating it directly.`);
                }
            } catch (checkError: any) {
                if (checkError.status === 404) {
                    console.warn(`Provided existingFileId ${targetFileId} not found. Will attempt to find/create by name.`);
                    targetFileId = null;
                } else {
                    throw checkError;
                }
            }
        }

        // 2. If no valid targetFileId from the parameter, then proceed with searching by name
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