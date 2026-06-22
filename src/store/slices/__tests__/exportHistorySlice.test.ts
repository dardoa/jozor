import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../useAppStore';
import { db } from '../../../utils/db';
import { ExportHistoryEntry } from '../../../features/publishing';

vi.mock('../../../utils/db', () => {
    const mockExportHistory = {
        toArray: vi.fn(),
        add: vi.fn(),
        clear: vi.fn(),
    };
    return {
        db: {
            export_history: mockExportHistory,
        },
    };
});

describe('exportHistorySlice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        act(() => {
            useAppStore.setState({
                exportHistory: [],
                currentTreeId: 'test-tree-123',
            });
        });
    });

    it('loads export history from db and sorts descending by date', async () => {
        const dummyRecords: ExportHistoryEntry[] = [
            {
                id: 1,
                publicationId: 'pub-1',
                treeId: 'tree-1',
                templateId: 'json',
                exportType: 'legacy',
                createdAt: '2026-06-22T10:00:00Z',
                totalPages: 1,
                totalPeople: 10,
                totalFamilies: 5,
                initiatedBy: 'user-1',
                success: true,
                durationMs: 150,
                warnings: [],
                outputFiles: [{ name: 'tree.json', format: 'json' }],
            },
            {
                id: 2,
                publicationId: 'pub-2',
                treeId: 'tree-1',
                templateId: 'classic-book-manuscript',
                exportType: 'publishing',
                createdAt: '2026-06-22T12:00:00Z',
                totalPages: 4,
                totalPeople: 15,
                totalFamilies: 8,
                initiatedBy: 'user-1',
                success: true,
                durationMs: 800,
                warnings: [],
                outputFiles: [{ name: 'book.pdf', format: 'pdf' }],
            },
        ];

        vi.mocked(db.export_history.toArray).mockResolvedValue(dummyRecords);

        await act(async () => {
            await useAppStore.getState().loadExportHistory();
        });

        const state = useAppStore.getState();
        expect(db.export_history.toArray).toHaveBeenCalledTimes(1);
        expect(state.exportHistory).toHaveLength(2);
        // Expect descending sort by date (newest first, id 2 is newer)
        expect(state.exportHistory[0].id).toBe(2);
        expect(state.exportHistory[1].id).toBe(1);
    });

    it('adds export entry to db and appends/sorts in Zustand', async () => {
        const initialRecords: ExportHistoryEntry[] = [
            {
                id: 1,
                publicationId: 'pub-1',
                treeId: 'tree-1',
                templateId: 'json',
                exportType: 'legacy',
                createdAt: '2026-06-22T10:00:00Z',
                totalPages: 1,
                totalPeople: 10,
                totalFamilies: 5,
                initiatedBy: 'user-1',
                success: true,
                durationMs: 150,
                warnings: [],
                outputFiles: [{ name: 'tree.json', format: 'json' }],
            },
        ];
        
        act(() => {
            useAppStore.setState({ exportHistory: initialRecords });
        });

        const newEntry: Omit<ExportHistoryEntry, 'id'> = {
            publicationId: 'pub-3',
            treeId: 'tree-1',
            templateId: 'classic-ancestor-poster',
            exportType: 'publishing',
            createdAt: '2026-06-22T11:00:00Z',
            totalPages: 1,
            totalPeople: 12,
            totalFamilies: 6,
            initiatedBy: 'user-1',
            success: true,
            durationMs: 450,
            warnings: [],
            outputFiles: [{ name: 'poster.png', format: 'png' }],
        };

        vi.mocked(db.export_history.add).mockResolvedValue(3);

        await act(async () => {
            await useAppStore.getState().addExportEntry(newEntry);
        });

        expect(db.export_history.add).toHaveBeenCalledWith(newEntry);
        const state = useAppStore.getState();
        expect(state.exportHistory).toHaveLength(2);
        // Expected sort: 11:00:00Z (pub-3) comes before 10:00:00Z (pub-1)
        expect(state.exportHistory[0].publicationId).toBe('pub-3');
        expect(state.exportHistory[0].id).toBe(3);
        expect(state.exportHistory[1].publicationId).toBe('pub-1');
    });

    it('clears export history from db and state', async () => {
        const initialRecords: ExportHistoryEntry[] = [
            {
                id: 1,
                publicationId: 'pub-1',
                treeId: 'tree-1',
                templateId: 'json',
                exportType: 'legacy',
                createdAt: '2026-06-22T10:00:00Z',
                totalPages: 1,
                totalPeople: 10,
                totalFamilies: 5,
                initiatedBy: 'user-1',
                success: true,
                durationMs: 150,
                warnings: [],
                outputFiles: [{ name: 'tree.json', format: 'json' }],
            },
        ];
        
        act(() => {
            useAppStore.setState({ exportHistory: initialRecords });
        });

        vi.mocked(db.export_history.clear).mockResolvedValue(undefined);

        await act(async () => {
            await useAppStore.getState().clearExportHistory();
        });

        expect(db.export_history.clear).toHaveBeenCalledTimes(1);
        const state = useAppStore.getState();
        expect(state.exportHistory).toHaveLength(0);
    });
});
