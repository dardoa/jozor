import Dexie, { Table } from 'dexie';
import { Person, RelationshipEdge, Source, Citation } from '../types';
import { ExportHistoryEntry } from '../features/publishing';

export type SettingValue = string | number | boolean | object | null;

export interface LocalSetting {
    key: string;
    value: SettingValue;
}

export interface PendingOperationRec {
    id?: number;
    tree_id: string;
    user_id: string;
    type: string;
    payload: Record<string, unknown>;
    created_at: string;
    retryCount?: number;
}

export interface PersonTombstoneRec {
    tree_id: string;
    person_id: string;
    deleted_at: string;
}

export interface PersonMediaCleanupJobRec {
    id?: number;
    dedupe_key: string;
    tree_id: string;
    user_id: string;
    bucket: 'person-media' | 'avatars';
    object_path: string;
    asset_id: string;
    created_at: string;
    attempt_count: number;
    next_attempt_at: string;
    last_error_code?: string;
}

export interface ArchiveImportCleanupJobRec {
    tree_id: string;
    user_id: string;
    targets: Array<{ bucket: 'person-media'; objectPath: string; assetId: string }>;
    state: 'pending' | 'review-required';
    created_at: string;
    attempt_count: number;
    next_attempt_at: string;
}

export const JOZOR_DB_SCHEMA_VERSION = 9;

export class JozorDatabase extends Dexie {
    people!: Table<Person, string>;
    settings!: Table<LocalSetting, string>;
    pending_operations!: Table<PendingOperationRec, number>;
    person_tombstones!: Table<PersonTombstoneRec, [string, string]>;
    person_media_cleanup!: Table<PersonMediaCleanupJobRec, number>;
    archive_import_cleanup!: Table<ArchiveImportCleanupJobRec, string>;
    export_history!: Table<ExportHistoryEntry, number>;
    relationships!: Table<RelationshipEdge, string>;
    sources!: Table<Source, string>;
    citations!: Table<Citation, string>;

    constructor() {
        super('JozorDB');
        // Pre-launch baseline schema. Keep this version above historical local DBs
        // so existing staging/beta browsers upgrade instead of attempting a downgrade.
        this.version(JOZOR_DB_SCHEMA_VERSION).stores({
            people: 'id',
            settings: 'key',
            pending_operations: '++id, tree_id',
            person_tombstones: '[tree_id+person_id], tree_id, person_id, deleted_at',
            person_media_cleanup: '++id, &dedupe_key, tree_id, user_id, next_attempt_at',
            archive_import_cleanup: 'tree_id, user_id, next_attempt_at',
            export_history: '++id, publicationId, treeId, templateId, exportType, createdAt',
            relationships: 'id, treeId, fromPersonId, toPersonId, type, [treeId+fromPersonId], [treeId+toPersonId], [treeId+type]',
            sources: 'id, treeId, type, normalizedKey, [treeId+type], [treeId+normalizedKey]',
            citations: 'id, treeId, sourceId, targetType, targetId, targetField, [treeId+targetId], [treeId+sourceId], [treeId+targetType], [treeId+targetType+targetId]'
        });
    }
}

export const db = new JozorDatabase();
