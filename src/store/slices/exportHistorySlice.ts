import { StateCreator } from 'zustand';
import { AppStore } from '../storeTypes';
import { ExportHistoryEntry } from '../../features/publishing';
import { db } from '../../utils/db';

export interface ExportHistorySlice {
    exportHistory: ExportHistoryEntry[];

    loadExportHistory: () => Promise<void>;
    addExportEntry: (entry: Omit<ExportHistoryEntry, 'id'>) => Promise<void>;
    clearExportHistory: () => Promise<void>;
}

export const createExportHistorySlice: StateCreator<
    AppStore,
    [['zustand/devtools', never]],
    [],
    ExportHistorySlice
> = (set) => ({
    exportHistory: [],

    loadExportHistory: async () => {
        try {
            const records = await db.export_history.toArray();
            // Sort by createdAt descending (newest first)
            records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            set({ exportHistory: records }, false, 'loadExportHistory');
        } catch (error) {
            console.error('Failed to load export history from DB:', error);
        }
    },

    addExportEntry: async (entry) => {
        try {
            const id = await db.export_history.add(entry as ExportHistoryEntry);
            const newRecord: ExportHistoryEntry = { ...entry, id };
            set(
                (state) => {
                    const updated = [newRecord, ...state.exportHistory];
                    updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                    return { exportHistory: updated };
                },
                false,
                'addExportEntry'
            );
        } catch (error) {
            console.error('Failed to add export history entry:', error);
        }
    },

    clearExportHistory: async () => {
        try {
            await db.export_history.clear();
            set({ exportHistory: [] }, false, 'clearExportHistory');
        } catch (error) {
            console.error('Failed to clear export history:', error);
        }
    },
});
