import { db, SettingValue, PendingOperationRec } from '../utils/db';
import { Person } from '../types';

export const storageService = {
    // --- People Data ---
    async saveFullTree(people: Record<string, Person>) {
        // Optimization: bulkPut is efficient for existing records.
        // To handle deletions, we can either clear() (slow) or fetch IDs and delete orphans.
        // Let's use bulkPut for the main work. For deletions, the app logic usually handles 
        // it via deletePerson, but this serves as a safety catch.
        try {
            const peopleArray = Object.values(people);
            if (peopleArray.length === 0) return;
            await db.people.bulkPut(peopleArray);

            // Safety: Cleanup orphans if memory significantly differs from DB
            const dbCount = await db.people.count();
            if (dbCount > peopleArray.length + 50) {
                const dbIds = await db.people.toCollection().primaryKeys();
                const memIds = new Set(Object.keys(people));
                const toDelete = dbIds.filter(id => !memIds.has(id));
                if (toDelete.length > 0) await db.people.bulkDelete(toDelete);
            }
        } catch (e) {
            console.error('StorageService: saveFullTree failed', e);
        }
    },

    async createSnapshot(people: Record<string, Person>) {
        try {
            await this.saveFullTree(people);
            // Operations that successfully flush are deleted by their localId in deltaSyncService.
            // This snapshot acts as a base tree consolidation point.
            console.log('[Storage] 📸 Memory Snapshot created. Deltas consolidated into base_tree.');
        } catch (e) {
            console.error('[Storage] Failed to create snapshot', e);
        }
    },

    async loadFullTree(): Promise<Record<string, Person>> {
        const allPeople = await db.people.toArray();
        const map: Record<string, Person> = {};
        allPeople.forEach(p => { map[p.id] = p; });
        return map;
    },

    async savePerson(person: Person) {
        await db.people.put(person);
    },

    async deletePerson(id: string) {
        await db.people.delete(id);
    },

    // --- Settings & Metadata ---
    async saveSetting(key: string, value: SettingValue) {
        await db.settings.put({ key, value });
    },

    async getSetting<T>(key: string, defaultValue: T): Promise<T> {
        const entry = await db.settings.get(key);
        return entry ? (entry.value as T) : defaultValue;
    },

    async removeSetting(key: string) {
        await db.settings.delete(key);
    },

    // --- Pending Operations (Offline Sync) ---
    async savePendingOperation(op: Omit<PendingOperationRec, 'id'>) {
        return await db.pending_operations.add(op as PendingOperationRec);
    },

    async getPendingOperations(treeId: string) {
        return await db.pending_operations
            .where('tree_id')
            .equals(treeId)
            .toArray();
    },

    async deletePendingOperation(id: number) {
        await db.pending_operations.delete(id);
    },

    async bulkDeletePendingOperations(ids: number[]) {
        await db.pending_operations.bulkDelete(ids);
    },

    // --- Migration Helpers ---
    async migrateFromLocalStorage() {
        // 1. Check if DB is empty
        const count = await db.people.count();
        if (count > 0) return; // Already data in DB

        // 2. Check LocalStorage
        const json = localStorage.getItem('echo-family-data');
        if (json) {
            try {
                const people = JSON.parse(json);
                await this.saveFullTree(people);
                // Optional: Clear localStorage after successful migration
                // localStorage.removeItem('echo-family-data');
            } catch (e) {
                console.error('Migration failed', e);
            }
        }
    }
};
