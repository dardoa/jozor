import type { SettingValue, PendingOperationRec, PersonTombstoneRec } from '../utils/db';
import { Person } from '../types';
import { logError, logInfo } from '../utils/errorLogger';

const getLocalDb = async () => {
    const { db } = await import('../utils/db');
    return db;
};

const LOCAL_TREE_SCOPE = '__local__';

const normalizeTreeScope = (treeId?: string | null) => treeId || LOCAL_TREE_SCOPE;

export const storageService = {
    // --- People Data ---
    async saveFullTree(people: Record<string, Person>) {
        // Optimization: bulkPut is efficient for existing records.
        // To handle deletions, we can either clear() (slow) or fetch IDs and delete orphans.
        // Let's use bulkPut for the main work. For deletions, the app logic usually handles
        // it via deletePerson, but this serves as a safety catch.
        try {
            const db = await getLocalDb();
            const peopleArray = Object.values(people);
            await db.transaction('rw', db.people, async () => {
                if (peopleArray.length === 0) {
                    await db.people.clear();
                    return;
                }

                await db.people.bulkPut(peopleArray);

                // Safety: Cleanup orphans so deletions persist across reloads.
                const dbCount = await db.people.count();
                if (dbCount > peopleArray.length) {
                    const dbIds = await db.people.toCollection().primaryKeys();
                    const memIds = new Set(Object.keys(people));
                    const toDelete = dbIds.filter(id => typeof id === 'string' && !memIds.has(id));
                    if (toDelete.length > 0) await db.people.bulkDelete(toDelete);
                }
            });
        } catch (e) {
            logError('storageService saveFullTree', e, {
                category: 'DATABASE',
                severity: 'MEDIUM',
                metadata: { operationType: 'save_full_tree' }
            });
        }
    },

    async createSnapshot(people: Record<string, Person>) {
        try {
            await this.saveFullTree(people);
            // Operations that successfully flush are deleted by their localId in deltaSyncService.
            // This snapshot acts as a base tree consolidation point.
            logInfo('storageService createSnapshot', 'Memory snapshot created and consolidated.', {
                operationType: 'create_snapshot'
            });
        } catch (e) {
            logError('storageService createSnapshot', e, {
                category: 'DATABASE',
                severity: 'MEDIUM',
                metadata: { operationType: 'create_snapshot' }
            });
        }
    },

    async loadFullTree(): Promise<Record<string, Person>> {
        const db = await getLocalDb();
        const allPeople = await db.people.toArray();
        const map: Record<string, Person> = {};
        allPeople.forEach(p => { map[p.id] = p; });
        return map;
    },

    async savePerson(person: Person) {
        const db = await getLocalDb();
        await db.people.put(person);
    },

    async savePeople(people: Person[]) {
        if (people.length === 0) return;
        const db = await getLocalDb();
        await db.people.bulkPut(people);
    },

    async deletePerson(id: string) {
        const db = await getLocalDb();
        await db.people.delete(id);
    },

    async recordDeletedPersonId(treeId: string | null | undefined, personId: string) {
        const db = await getLocalDb();
        const tombstone: PersonTombstoneRec = {
            tree_id: normalizeTreeScope(treeId),
            person_id: personId,
            deleted_at: new Date().toISOString(),
        };
        await db.person_tombstones.put(tombstone);
    },

    async recordDeletedPersonIds(treeId: string | null | undefined, personIds: string[]) {
        if (personIds.length === 0) return;
        const db = await getLocalDb();
        const treeScope = normalizeTreeScope(treeId);
        const deletedAt = new Date().toISOString();
        await db.person_tombstones.bulkPut(
            Array.from(new Set(personIds)).map((personId) => ({
                tree_id: treeScope,
                person_id: personId,
                deleted_at: deletedAt,
            }))
        );
    },

    async removeDeletedPersonId(treeId: string | null | undefined, personId: string) {
        const db = await getLocalDb();
        await db.person_tombstones.delete([normalizeTreeScope(treeId), personId]);
    },

    async getDeletedPersonIds(treeId: string | null | undefined): Promise<string[]> {
        const db = await getLocalDb();
        const treeScope = normalizeTreeScope(treeId);
        const rows = await db.person_tombstones
            .where('tree_id')
            .equals(treeScope)
            .toArray();
        return rows.map((row) => row.person_id);
    },

    // --- Settings & Metadata ---
    async saveSetting(key: string, value: SettingValue) {
        const db = await getLocalDb();
        await db.settings.put({ key, value });
    },

    async getSetting<T>(key: string, defaultValue: T): Promise<T> {
        const db = await getLocalDb();
        const entry = await db.settings.get(key);
        return entry ? (entry.value as T) : defaultValue;
    },

    async removeSetting(key: string) {
        const db = await getLocalDb();
        await db.settings.delete(key);
    },

    async savePendingOperation(op: Omit<PendingOperationRec, 'id'>) {
        const db = await getLocalDb();
        return await db.pending_operations.add(op as PendingOperationRec);
    },

    async savePendingOperations(ops: Array<Omit<PendingOperationRec, 'id'>>): Promise<number[]> {
        if (ops.length === 0) return [];
        const db = await getLocalDb();
        return await db.transaction('rw', db.pending_operations, async () => {
            return await db.pending_operations.bulkAdd(ops as PendingOperationRec[], { allKeys: true }) as number[];
        });
    },

    async getPendingOperations(treeId: string) {
        const db = await getLocalDb();
        return await db.pending_operations
            .where('tree_id')
            .equals(treeId)
            .toArray();
    },

    async deletePendingOperation(id: number) {
        const db = await getLocalDb();
        await db.pending_operations.delete(id);
    },

    async bulkDeletePendingOperations(ids: number[]) {
        const db = await getLocalDb();
        await db.pending_operations.bulkDelete(ids);
    }
};
