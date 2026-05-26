import { getSupabaseWithAuth } from '../supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { getUserFacingErrorInfo, logError, logInfo } from '../../utils/errorLogger';
import { mapPersonToDbRow } from '../personRowMapper';
import { formatDateForPostgres } from '../../utils/dateUtils';
import type { DeltaOperation, DeltaPayload, PendingDeltaOp, SyncFlushResult } from './SyncTypes';
import { offlineCache } from './OfflineCache';
import { sanitizeOutgoingBatch } from './sanitizeBatch';
import { buildSyncError, buildSyncSuccess } from './syncStatusHelpers';
import type { Person } from '../../types';
import { applyDeltaOperationToFamily } from '../../domain/FamilyDomainReducer';
import { projectPendingOperations } from '../../domain/pendingOperationsProjection';

type SupabaseTreeClient = ReturnType<typeof getSupabaseWithAuth>;

type RelationshipType = 'parent' | 'child' | 'spouse';

interface RelationshipRow {
    tree_id: string;
    person_id: string;
    relative_id: string;
    type: RelationshipType;
}

export class DeltaRemoteSyncClient {
    constructor(
        private readonly getPendingOutgoingCount: () => number,
        private readonly onPermissionLost: (message: string) => void
    ) {}

    async flushOutgoingBatch(batch: PendingDeltaOp[], permissionPausedTreeId: string | null): Promise<SyncFlushResult> {
        const { user } = useAppStore.getState();
        if (!user) {
            return {
                success: false,
                shouldRetry: false,
                error: 'No authenticated user is available for sync.',
            };
        }
        if (permissionPausedTreeId && batch[0]?.tree_id === permissionPausedTreeId) {
            this.onPermissionLost('You no longer have permission to update this tree.');
            return {
                success: false,
                shouldRetry: false,
                error: 'Permission lost for this tree.',
            };
        }

        window.dispatchEvent(new CustomEvent('supabase-sync-start'));

        try {
            const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || undefined);
            const sanitizedBatch = sanitizeOutgoingBatch(batch);

            logInfo('DeltaSyncService sync_tree_batch', 'Flushing outgoing sync batch to Supabase via direct insert.', {
                treeId: sanitizedBatch[0]?.tree_id,
                userId: user.uid,
                batchSize: sanitizedBatch.length,
            });

            await this.applyProjectionOps(client, sanitizedBatch);
            await this.applyTreeMetadataOps(client, sanitizedBatch);

            const { error: insertError } = await client
                .from('tree_operations')
                .insert(sanitizedBatch);

            if (insertError) throw insertError;

            const store = useAppStore.getState();
            let nextConfirmed = store.confirmedPeople;
            batch.forEach((op) => {
                const updated = applyDeltaOperationToFamily(nextConfirmed, op);
                if (updated) {
                    nextConfirmed = updated;
                }
            });

            const localIds = batch.map((op) => op.localId).filter((id): id is number => !!id);
            const idsSet = new Set(localIds);
            const nextPending = store.pendingOperations.filter(
                (op) => op.localId === undefined || !idsSet.has(op.localId)
            );

            const { people: projected } = projectPendingOperations(nextConfirmed, nextPending);

            store.setConfirmedPeople(nextConfirmed);
            store.removePendingOperations(localIds);
            store.setPeople(projected, false);

            store.incrementOpCount(batch.length);
            await offlineCache.bulkDeletePendingOperations(localIds);

            const successTime = new Date();
            useAppStore.getState().setSyncStatus(
                buildSyncSuccess(useAppStore.getState().syncStatus, this.getPendingOutgoingCount(), {
                    lastSyncSupabase: successTime,
                })
            );

            window.dispatchEvent(new CustomEvent('supabase-sync-success', {
                detail: {
                    time: successTime,
                    pendingCount: this.getPendingOutgoingCount(),
                },
            }));

            return { success: true, shouldRetry: false };
        } catch (error) {
            const userFacing = getUserFacingErrorInfo(error, 'Sync failed. Please try again.');
            const pendingCount = this.getPendingOutgoingCount() + batch.length;
            const errorTime = new Date();

            useAppStore.getState().setSyncStatus(
                buildSyncError(useAppStore.getState().syncStatus, pendingCount, {
                    message: userFacing.message,
                    category: userFacing.category,
                    retryable: userFacing.retryable,
                    time: errorTime,
                })
            );

            logError('DeltaSyncService sync_tree_batch', error, {
                category: 'SYNC',
                severity: 'HIGH',
                showToast: true,
                toastMessage: userFacing.message,
                metadata: {
                    treeId: batch[0]?.tree_id,
                    userId: user.uid,
                    operationType: 'sync_tree_batch',
                    batchSize: batch.length,
                },
            });

            window.dispatchEvent(new CustomEvent('supabase-sync-error', {
                detail: {
                    rawMessage: error instanceof Error ? error.message : String(error),
                    message: userFacing.message,
                    category: userFacing.category,
                    retryable: userFacing.retryable,
                    time: errorTime,
                    pendingCount,
                },
            }));

            return {
                success: false,
                shouldRetry: userFacing.retryable,
                error: userFacing.message,
            };
        }
    }

    private async applyTreeMetadataOps(
        client: SupabaseTreeClient,
        batch: Array<Omit<PendingDeltaOp, 'localId' | 'retryCount' | 'removeReason'>>
    ): Promise<void> {
        const latestMetadataByTree = new Map<string, Record<string, unknown>>();

        batch.forEach((op) => {
            if (op.type !== 'SET_TREE_METADATA') return;
            const metadata = op.payload.treeMetadata;
            if (!metadata) return;

            const update: Record<string, unknown> = {};
            const focusId = metadata.focusId ?? metadata.rootId;
            if (focusId) update.focus_id = focusId;
            if (metadata.name) update.name = metadata.name;
            if (metadata.settings) update.settings = metadata.settings;

            if (Object.keys(update).length > 0) {
                latestMetadataByTree.set(op.tree_id, update);
            }
        });

        for (const [treeId, update] of latestMetadataByTree) {
            try {
                const { error } = await client
                    .from('trees')
                    .update(update)
                    .eq('id', treeId);

                if (error) throw error;
            } catch (err) {
                logError('Sync Metadata Projection Failure', err, {
                    category: 'SYNC',
                    severity: 'MEDIUM',
                    metadata: {
                        treeId,
                        hint: 'Metadata projection update failed. The delta log will still be attempted.'
                    }
                });
            }
        }
    }

    private async applyProjectionOps(
        client: SupabaseTreeClient,
        batch: Array<Omit<PendingDeltaOp, 'localId' | 'retryCount' | 'removeReason'>>
    ): Promise<void> {
        for (const op of batch) {
            try {
                switch (op.type) {
                    case 'ADD_NODE':
                        await this.applyAddNode(client, op.tree_id, op.payload);
                        break;
                    case 'UPDATE_PROP':
                        await this.applyUpdateProp(client, op.payload);
                        break;
                    case 'DELETE_NODE':
                        await this.applyDeleteNode(client, op.payload);
                        break;
                    case 'ADD_RELATION':
                        await this.applyAddRelation(client, op.tree_id, op.payload);
                        break;
                    case 'DELETE_RELATION':
                        await this.applyDeleteRelation(client, op.tree_id, op.payload);
                        break;
                    case 'SET_TREE_METADATA':
                        break;
                }
            } catch (err) {
                logError('Sync Projection Failure', err, {
                    category: 'SYNC',
                    severity: 'MEDIUM',
                    metadata: {
                        opType: op.type,
                        treeId: op.tree_id,
                        targetId: op.payload.id || op.payload.person?.id,
                        focusId: op.payload.focusId,
                        existingId: op.payload.existingId,
                        relativeId: op.payload.relativeId,
                        relationType: op.payload.type,
                        hint: 'Projection update failed. The delta log will still be attempted.'
                    }
                });
                throw err;
            }
        }
    }

    private async applyAddNode(client: SupabaseTreeClient, treeId: string, payload: DeltaPayload): Promise<void> {
        const person = payload.person as Person | undefined;
        if (!person?.id) throw new Error('ADD_NODE payload is missing person.id');

        const { error: personError } = await client
            .from('people')
            .upsert(mapPersonToDbRow(person, treeId), { onConflict: 'id' });

        if (personError) throw personError;

        const relationship = this.buildRelationshipFromAddNode(treeId, payload);
        if (relationship) await this.upsertRelationship(client, relationship);
    }

    private async applyUpdateProp(client: SupabaseTreeClient, payload: DeltaPayload): Promise<void> {
        const personId = payload.id;
        const updates = payload.updates as Partial<Person> | undefined;
        if (!personId || !updates) throw new Error('UPDATE_PROP payload is missing id or updates');

        const patch = this.mapPersonUpdatesToDbPatch(updates);
        if (Object.keys(patch).length === 0) return;

        const { error } = await client
            .from('people')
            .update(patch)
            .eq('id', personId);

        if (error) throw error;
    }

    private async applyDeleteNode(client: SupabaseTreeClient, payload: DeltaPayload): Promise<void> {
        const personId = payload.id;
        if (!personId) throw new Error('DELETE_NODE payload is missing id');

        const { error } = await client
            .from('people')
            .delete()
            .eq('id', personId);

        if (error) throw error;
    }

    private async applyAddRelation(client: SupabaseTreeClient, treeId: string, payload: DeltaPayload): Promise<void> {
        const focusId = payload.focusId;
        const existingId = payload.existingId;
        const type = payload.type as RelationshipType | undefined;
        if (!focusId || !existingId || !this.isRelationshipType(type)) {
            throw new Error('ADD_RELATION payload is missing focusId, existingId, or type');
        }

        await this.upsertRelationship(client, {
            tree_id: treeId,
            person_id: focusId,
            relative_id: existingId,
            type,
        });
    }

    private async applyDeleteRelation(client: SupabaseTreeClient, treeId: string, payload: DeltaPayload): Promise<void> {
        const targetId = payload.targetId;
        const relativeId = payload.relativeId;
        const type = payload.type as RelationshipType | undefined;
        if (!targetId || !relativeId || !this.isRelationshipType(type)) {
            throw new Error('DELETE_RELATION payload is missing targetId, relativeId, or type');
        }

        await this.deleteRelationship(client, {
            tree_id: treeId,
            person_id: targetId,
            relative_id: relativeId,
            type,
        });

        const inverseType = this.getInverseRelationshipType(type);
        await this.deleteRelationship(client, {
            tree_id: treeId,
            person_id: relativeId,
            relative_id: targetId,
            type: inverseType,
        });
    }

    private buildRelationshipFromAddNode(treeId: string, payload: DeltaPayload): RelationshipRow | null {
        const person = payload.person as Person | undefined;
        const relativeId = payload.relativeId;
        const type = payload.type as RelationshipType | 'initial' | undefined;
        if (!person?.id || !relativeId || !this.isRelationshipType(type)) return null;

        return {
            tree_id: treeId,
            person_id: relativeId,
            relative_id: person.id,
            type,
        };
    }

    private async upsertRelationship(client: SupabaseTreeClient, relationship: RelationshipRow): Promise<void> {
        await this.ensureRelationshipPeopleProjected(client, relationship);

        const { error } = await client
            .from('relationships')
            .upsert(relationship, {
                onConflict: 'tree_id,person_id,relative_id,type',
                ignoreDuplicates: true,
            });

        if (error) throw error;
    }

    private async ensureRelationshipPeopleProjected(
        client: SupabaseTreeClient,
        relationship: RelationshipRow
    ): Promise<void> {
        const people = useAppStore.getState().people ?? {};
        const participantIds = Array.from(new Set([relationship.person_id, relationship.relative_id]));
        const rows = participantIds
            .map((personId) => people[personId])
            .filter((person): person is Person => !!person?.id)
            .map((person) => mapPersonToDbRow(person, relationship.tree_id));

        if (rows.length === 0) return;

        const { error } = await client
            .from('people')
            .upsert(rows, { onConflict: 'id' });

        if (error) throw error;
    }

    private async deleteRelationship(client: SupabaseTreeClient, relationship: RelationshipRow): Promise<void> {
        const { error } = await client
            .from('relationships')
            .delete()
            .eq('tree_id', relationship.tree_id)
            .eq('person_id', relationship.person_id)
            .eq('relative_id', relationship.relative_id)
            .eq('type', relationship.type);

        if (error) throw error;
    }

    private isRelationshipType(type: unknown): type is RelationshipType {
        return type === 'parent' || type === 'child' || type === 'spouse';
    }

    private getInverseRelationshipType(type: RelationshipType): RelationshipType {
        if (type === 'parent') return 'child';
        if (type === 'child') return 'parent';
        return 'spouse';
    }

    private mapPersonUpdatesToDbPatch(updates: Partial<Person>): Record<string, unknown> {
        const patch: Record<string, unknown> = {};
        const columnMap: Partial<Record<keyof Person, string>> = {
            firstName: 'first_name',
            lastName: 'last_name',
            middleName: 'middle_name',
            birthName: 'birth_name',
            nickName: 'nick_name',
            suffix: 'suffix',
            gender: 'gender',
            birthDate: 'birth_date',
            deathDate: 'death_date',
            birthPlace: 'birth_place',
            deathPlace: 'death_place',
            bio: 'bio',
            profession: 'profession',
            company: 'company',
            interests: 'interests',
            photoUrl: 'photo_url',
            photoPath: 'photo_path',
            photoVersion: 'photo_version',
            email: 'email',
            website: 'website',
            blog: 'blog',
            address: 'address',
        };

        const customFieldKeys = [
            'title', 'birthSource', 'deathSource', 'burialPlace', 'residence',
            'marriageDate', 'marriagePlace', 'gallery', 'voiceNotes', 'sources',
            'events', 'partnerDetails', 'isPrivate'
        ];

        Object.entries(updates).forEach(([key, value]) => {
            if (key === 'parents' || key === 'children' || key === 'spouses') return;
            
            // Special handling for dates to avoid 400 Bad Request on Postgres DATE columns
            if (key === 'birthDate' || key === 'deathDate') {
                const column = columnMap[key as keyof Person];
                if (column) {
                    patch[column] = formatDateForPostgres(value as string);
                }
                return;
            }

            const column = columnMap[key as keyof Person];
            if (column) {
                patch[column] = value || null;
                return;
            }

            // Route known custom fields to custom_fields column
            if (customFieldKeys.includes(key)) {
                patch.custom_fields = {
                    ...((patch.custom_fields as Record<string, unknown> | undefined) ?? {}),
                    [key]: value,
                };
                return;
            }

            // Everything else goes to metadata
            patch.metadata = {
                ...((patch.metadata as Record<string, unknown> | undefined) ?? {}),
                [key]: value,
            };
        });

        return patch;
    }

    async fetchRemoteOperations(treeId: string, sinceVersion: number): Promise<DeltaOperation[]> {
        const { user } = useAppStore.getState();
        if (!user) return [];

        const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || undefined);
        const { data, error } = await client
            .from('tree_operations')
            .select('*')
            .eq('tree_id', treeId)
            .gt('version_seq', sinceVersion)
            .order('version_seq', { ascending: true });

        if (error) throw error;
        return data as DeltaOperation[];
    }
}
