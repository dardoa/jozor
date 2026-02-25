import Dexie, { Table } from 'dexie';
import { Person } from '../types';

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
}

export class JozorDatabase extends Dexie {
    people!: Table<Person, string>;
    settings!: Table<LocalSetting, string>;
    pending_operations!: Table<PendingOperationRec, number>;

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
    }
}

export const db = new JozorDatabase();
