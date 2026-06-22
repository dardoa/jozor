import Dexie, { Table } from 'dexie';
import { Person } from '../types';
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

    constructor() {
        super('JozorDB');
        this.version(1).stores({
            people: 'id', // Primary key is 'id'
            settings: 'key', // Primary key is 'key'
        });

        this.version(2).stores({
            people: 'id',
            settings: 'key',
            // tree_id for filtering, id is auto-increment PK
            pending_operations: '++id, tree_id'
        });

        this.version(3).stores({
            people: 'id',
            settings: 'key',
            pending_operations: '++id, tree_id',
            person_tombstones: '[tree_id+person_id], tree_id, person_id, deleted_at',
        });

        this.version(4).stores({
            people: 'id',
            settings: 'key',
            pending_operations: '++id, tree_id',
            person_tombstones: '[tree_id+person_id], tree_id, person_id, deleted_at',
            export_history: '++id, publicationId, treeId, templateId, exportType, createdAt'
        });
    }
}

export const db = new JozorDatabase();
