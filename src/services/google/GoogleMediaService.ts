import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY } from '../../constants';
import { IGoogleApiService, IGoogleDriveService, IGoogleMediaService } from './interfaces';

export class GoogleMediaService implements IGoogleMediaService {
    private apiService: IGoogleApiService;
    private driveService: IGoogleDriveService;

    constructor(apiService: IGoogleApiService, driveService: IGoogleDriveService) {
        this.apiService = apiService;
        this.driveService = driveService;
    }

    private ensureInitialized() {
        if (!this.apiService.isInitialized) {
            throw new Error('Google API not initialized');
        }
    }

    public async pickAndDownloadImage(): Promise<string> {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            const win = window as unknown as { google: typeof google };

            if (!win.google?.picker) {
                return reject('Google Picker not initialized.');
            }

            const token = gapi.client.getToken()?.access_token;
            if (!token) {
                return reject('No auth token found');
            }

            const pickerCallback = async (data: any) => {
                if (data[win.google.picker.Response.ACTION] === win.google.picker.Action.PICKED) {
                    const doc = data[win.google.picker.Response.DOCUMENTS][0];
                    const fileId = doc[win.google.picker.Document.ID];

                    try {
                        // For files picked via Picker, we need to fetch their webContentLink or webViewLink
                        const fileDetails = await gapi.client.drive.files.get({
                            fileId: fileId,
                            fields: 'webContentLink,webViewLink',
                        });
                        resolve(fileDetails.result.webContentLink || fileDetails.result.webViewLink || '');
                    } catch (e) {
                        console.error('Drive Link Retrieval Error', e);
                        reject(e);
                    }
                } else if (data[win.google.picker.Response.ACTION] === win.google.picker.Action.CANCEL) {
                    reject('Cancelled');
                }
            };

            // @ts-expect-error - Types incorrectly mark View as abstract
            const view = new win.google.picker.View(win.google.picker.ViewId.DOCS_IMAGES);
            view.setMimeTypes('image/png,image/jpeg,image/jpg,image/webp');

            const picker = new win.google.picker.PickerBuilder()
                .setDeveloperKey(GOOGLE_API_KEY)
                .setAppId(GOOGLE_CLIENT_ID!.split('-')[0])
                .setOAuthToken(token)
                .addView(view)
                .addView(new win.google.picker.DocsUploadView())
                .setCallback(pickerCallback)
                .build();

            picker.setVisible(true);
        });
    }

    public async uploadFile(file: Blob, fileName: string, mimeType: string): Promise<string> {
        this.ensureInitialized();
        const token = gapi.client.getToken()?.access_token;
        if (!token) throw new Error('Not authenticated to Google Drive.');

        const folderId = await this.driveService.getOrCreateUserVisibleAppFolderId();
        const metadata = {
            name: fileName,
            mimeType: mimeType,
            parents: [folderId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        try {
            const response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=drive`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: form,
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const fileId = result.id;
            const fileDetails = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'webContentLink,webViewLink',
            });
            return fileDetails.result.webContentLink || fileDetails.result.webViewLink || '';
        } catch (e) {
            console.error('Error uploading file to Drive', e);
            throw e;
        }
    }

    public async fetchFileAsBlob(url: string): Promise<Blob> {
        const token = gapi.client.getToken()?.access_token;
        if (!token) throw new Error('No Google auth token available to fetch Drive file.');

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Failed to fetch Drive file: ${response.statusText}`);
        return response.blob();
    }
}
