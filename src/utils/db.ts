import Dexie, { Table } from 'dexie';
import { Person, RelationshipEdge, deriveRelationshipsFromPeople } from '../types';
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

        this.version(5).stores({
            people: 'id',
            settings: 'key',
            pending_operations: '++id, tree_id',
            person_tombstones: '[tree_id+person_id], tree_id, person_id, deleted_at',
            export_history: '++id, publicationId, treeId, templateId, exportType, createdAt',
            relationships: 'id, treeId, fromPersonId, toPersonId, type, [treeId+fromPersonId], [treeId+toPersonId], [treeId+type]'
        }).upgrade(async tx => {
            const people = await tx.table('people').toArray();
            const peopleMap: Record<string, Person> = {};
            people.forEach(p => {
                peopleMap[p.id] = p;
            });

            const settings = await tx.table('settings').toArray();
            const activeTreeIdEntry = settings.find(s => s.key === 'currentTreeId');
            const treeId = typeof activeTreeIdEntry?.value === 'string' ? activeTreeIdEntry.value : 'default-tree';

            const derivedEdges = deriveRelationshipsFromPeople(treeId, peopleMap);
            const edgesArray = Object.values(derivedEdges);

            if (edgesArray.length > 0) {
                await tx.table('relationships').bulkPut(edgesArray);
            }
        });
    }
}

export const db = new JozorDatabase();
