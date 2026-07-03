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

export class JozorDatabase extends Dexie {
    people!: Table<Person, string>;
    settings!: Table<LocalSetting, string>;
    pending_operations!: Table<PendingOperationRec, number>;
    person_tombstones!: Table<PersonTombstoneRec, [string, string]>;
    export_history!: Table<ExportHistoryEntry, number>;
    relationships!: Table<RelationshipEdge, string>;
    sources!: Table<Source, string>;
    citations!: Table<Citation, string>;

    constructor() {
        super('JozorDB');
        // Compacting historical upgrades to baseline version 1 before final release.
        this.version(1).stores({
            people: 'id',
            settings: 'key',
            pending_operations: '++id, tree_id',
            person_tombstones: '[tree_id+person_id], tree_id, person_id, deleted_at',
            export_history: '++id, publicationId, treeId, templateId, exportType, createdAt',
            relationships: 'id, treeId, fromPersonId, toPersonId, type, [treeId+fromPersonId], [treeId+toPersonId], [treeId+type]',
            sources: 'id, treeId, type, normalizedKey, [treeId+type], [treeId+normalizedKey]',
            citations: 'id, treeId, sourceId, targetType, targetId, targetField, [treeId+targetId], [treeId+sourceId], [treeId+targetType], [treeId+targetType+targetId]'
        });
    }
}

export const db = new JozorDatabase();
