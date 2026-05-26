
type DriveApiError = Error & { status?: number; result?: { error?: { code?: number } } };

export const ARCHIVE_SNAPSHOT_EXTENSION = '.jozor';
export const JSON_MIME_TYPE = 'application/json';
export const ARCHIVE_MIME_TYPE = 'application/zip';

export const getDriveErrorStatus = (error: unknown): number | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;
    const driveError = error as DriveApiError;
    return driveError.status ?? driveError.result?.error?.code;
};

export const getDriveErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

export const buildSnapshotFileName = (treeId: string, label: string, timestamp = new Date()): string => {
    const normalizedTimestamp = timestamp.toISOString().replace(/[:.]/g, '-');
    const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `snapshot_${treeId}_${normalizedTimestamp}_${safeLabel}${ARCHIVE_SNAPSHOT_EXTENSION}`;
};

export const isSupportedSnapshotFile = (name: string, mimeType: string): boolean => {
    const normalizedName = name.toLowerCase();
    return (
        normalizedName.endsWith(ARCHIVE_SNAPSHOT_EXTENSION) &&
        (mimeType === '' || mimeType === ARCHIVE_MIME_TYPE || mimeType === 'application/octet-stream')
    );
};
