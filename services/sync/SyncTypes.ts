import { Person } from '../../types';

export type OperationType =
    | 'ADD_NODE'
    | 'UPDATE_PROP'
    | 'DELETE_RELATION'
    | 'ADD_RELATION'
    | 'DELETE_NODE'
    | 'SET_TREE_METADATA';

export interface DeltaPayload {
    id?: string;
    person?: Person;
    relativeId?: string;
    type?: string;
    updates?: Record<string, unknown>;
    focusId?: string;
    existingId?: string;
    targetId?: string;
    treeMetadata?: {
        focusId?: string;
        rootId?: string;
        name?: string;
        settings?: Record<string, unknown>;
    };
    client_version?: number;
    client_id?: string;
    [key: string]: unknown; // Index signature for Record compatibility
}

export interface DeltaOperation {
    id?: string; // Database UUID
    tree_id: string;
    user_id: string;
    type: OperationType;
    payload: DeltaPayload;
    version_seq?: number;
    created_at?: string;
    localId?: number; // IndexedDB PK
    retryCount?: number;
    removeReason?: string;
}

/** Pending op with localId for queue and cleanup. */
export interface PendingDeltaOp extends DeltaOperation {
    created_at: string;
    localId?: number;
}

/** Row shape for tree_operations insert (no id, no localId). */
export interface TreeOperationRow {
    tree_id: string;
    user_id: string;
    type: OperationType;
    payload: DeltaPayload;
    created_at?: string;
}

export interface SyncFlushResult {
    success: boolean;
    shouldRetry: boolean;
    error?: string;
}
