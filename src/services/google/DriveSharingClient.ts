import { logError, logWarn } from '../../utils/errorLogger';

export class DriveSharingClient {
    constructor(private readonly ensureInitialized: () => Promise<void>) {}

    async shareFile(
        fileId: string,
        email: string,
        role: 'reader' | 'writer' | 'owner' = 'writer'
    ): Promise<void> {
        await this.ensureInitialized();
        try {
            await gapi.client.drive.permissions.create({
                fileId,
                resource: {
                    role,
                    type: 'user',
                    emailAddress: email,
                },
                fields: 'id',
            });
        } catch (e) {
            logError('GoogleDriveService shareFile', e, {
                category: 'PERMISSION',
                severity: 'MEDIUM',
                metadata: { fileId, email, role, operationType: 'share_drive_file' },
            });
            throw e;
        }
    }

    async unshareFile(fileId: string, email: string): Promise<void> {
        await this.ensureInitialized();
        try {
            const permissionsResponse = await gapi.client.drive.permissions.list({
                fileId,
                fields: 'permissions(id, emailAddress)',
            });

            const permission = permissionsResponse.result.permissions?.find(
                (p) => p.emailAddress?.toLowerCase() === email.toLowerCase()
            );

            if (permission && permission.id) {
                await gapi.client.drive.permissions.delete({
                    fileId,
                    permissionId: permission.id,
                });
            } else {
                logWarn('GoogleDriveService unshareFile', 'No matching Drive permission was found for this collaborator.', {
                    category: 'PERMISSION',
                    metadata: { fileId, email, operationType: 'unshare_drive_file' },
                });
            }
        } catch (e) {
            logError('GoogleDriveService unshareFile', e, {
                category: 'PERMISSION',
                severity: 'MEDIUM',
                metadata: { fileId, email, operationType: 'unshare_drive_file' },
            });
            throw e;
        }
    }
}
