import type { SettingValue, PendingOperationRec, PersonTombstoneRec } from '../utils/db';
import { db } from '../utils/db';
import { Person, RelationshipEdge, deriveRelationshipsFromPeople, Source, Citation, deriveSourcesAndCitationsFromPeople, mergeDerivedSourcesAndCitations } from '../types';
import { logError, logInfo } from '../utils/errorLogger';

const getLocalDb = async () => {
    return db;
};

const LOCAL_TREE_SCOPE = '__local__';

const normalizeTreeScope = (treeId?: string | null) => treeId || LOCAL_TREE_SCOPE;

export const storageService = {
    // --- People Data ---
    async saveFullTree(people: Record<string, Person>, treeId?: string) {
        try {
            const db = await getLocalDb();
            const peopleArray = Object.values(people);
            await db.transaction('rw', [db.people, db.relationships, db.sources, db.citations], async () => {
                const activeTreeId = treeId || 'default-tree';
                if (peopleArray.length === 0) {
                    await db.people.clear();
                    await db.relationships.where('treeId').equals(activeTreeId).delete();
                    await db.sources.where('treeId').equals(activeTreeId).delete();
                    await db.citations.where('treeId').equals(activeTreeId).delete();
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

                // Reconstruct and save relationships
                const derivedEdges = deriveRelationshipsFromPeople(activeTreeId, people);
                await db.relationships.where('treeId').equals(activeTreeId).delete();
                const edgesArray = Object.values(derivedEdges);
                if (edgesArray.length > 0) {
                    await db.relationships.bulkPut(edgesArray);
                }

                // Reconstruct and save derived sources/citations without deleting user-created ones.
                const { sources: derivedSources, citations: derivedCitations } = deriveSourcesAndCitationsFromPeople(activeTreeId, people);
                const existingSources = await db.sources.where('treeId').equals(activeTreeId).toArray();
                const existingCitations = await db.citations.where('treeId').equals(activeTreeId).toArray();
                const merged = mergeDerivedSourcesAndCitations(
                    Object.fromEntries(existingSources.map((source) => [source.id, source])),
                    Object.fromEntries(existingCitations.map((citation) => [citation.id, citation])),
                    derivedSources,
                    derivedCitations
                );
                const sourceIdsToDelete = existingSources
                    .map((source) => source.id)
                    .filter((id) => !merged.sources[id]);
                const citationIdsToDelete = existingCitations
                    .map((citation) => citation.id)
                    .filter((id) => !merged.citations[id]);
                if (sourceIdsToDelete.length > 0) await db.sources.bulkDelete(sourceIdsToDelete);
                if (citationIdsToDelete.length > 0) await db.citations.bulkDelete(citationIdsToDelete);

                const sourcesArray = Object.values(merged.sources);
                if (sourcesArray.length > 0) {
                    await db.sources.bulkPut(sourcesArray);
                }
                const citationsArray = Object.values(merged.citations);
                if (citationsArray.length > 0) {
                    await db.citations.bulkPut(citationsArray);
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

    async createSnapshot(people: Record<string, Person>, treeId?: string) {
        try {
            await this.saveFullTree(people, treeId);
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

    // --- Relationships Data ---
    async saveRelationships(relationships: RelationshipEdge[]) {
        if (relationships.length === 0) return;
        const db = await getLocalDb();
        await db.relationships.bulkPut(relationships);
    },

    async deleteRelationships(ids: string[]) {
        if (ids.length === 0) return;
        const db = await getLocalDb();
        await db.relationships.bulkDelete(ids);
    },

    async loadRelationships(treeId: string): Promise<RelationshipEdge[]> {
        const db = await getLocalDb();
        return await db.relationships.where('treeId').equals(treeId).toArray();
    },

    async clearRelationships() {
        const db = await getLocalDb();
        await db.relationships.clear();
    },

    // --- Sources Data ---
    async saveSources(sources: Source[]) {
        if (sources.length === 0) return;
        const db = await getLocalDb();
        await db.sources.bulkPut(sources);
    },

    async deleteSources(ids: string[]) {
        if (ids.length === 0) return;
        const db = await getLocalDb();
        await db.sources.bulkDelete(ids);
    },

    async loadSources(treeId: string): Promise<Source[]> {
        const db = await getLocalDb();
        return await db.sources.where('treeId').equals(treeId).toArray();
    },

    // --- Citations Data ---
    async saveCitations(citations: Citation[]) {
        if (citations.length === 0) return;
        const db = await getLocalDb();
        await db.citations.bulkPut(citations);
    },

    async deleteCitations(ids: string[]) {
        if (ids.length === 0) return;
        const db = await getLocalDb();
        await db.citations.bulkDelete(ids);
    },

    async loadCitations(treeId: string): Promise<Citation[]> {
        const db = await getLocalDb();
        return await db.citations.where('treeId').equals(treeId).toArray();
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
    },

    async updatePendingOperationRetryCounts(
        updates: Array<{ id: number; retryCount: number }>
    ) {
        if (updates.length === 0) return;
        const db = await getLocalDb();
        await db.transaction('rw', db.pending_operations, async () => {
            await Promise.all(
                updates.map(({ id, retryCount }) =>
                    db.pending_operations.update(id, { retryCount })
                )
            );
        });
    }
};
