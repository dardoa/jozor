import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PublishingTracker } from '../PublishingTracker';
import { useAppStore } from '../../../../store/useAppStore';
import type { Person } from '../../../../types';
import { createPerson } from '../../../../utils/familyLogic';

// Mock Zustand Store
vi.mock('../../../../store/useAppStore', () => {
    const mockState = {
        currentTreeId: 'tree-123',
        user: { uid: 'user-abc', displayName: 'Mahmoud' },
        currentUserRole: 'owner',
        relationships: {},
        sources: {},
        citations: {},
        addExportEntry: vi.fn(),
    };
    return {
        useAppStore: {
            getState: () => mockState,
        },
    };
});

describe('PublishingTracker', () => {
    const mockPeople: Record<string, Person> = {
        'p-1': {
            ...createPerson('male'),
            id: 'p-1',
            firstName: 'Grandfather',
            lastName: 'Doe',
            spouses: ['p-2'],
            children: ['p-3'],
        },
        'p-2': {
            ...createPerson('female'),
            id: 'p-2',
            firstName: 'Grandmother',
            lastName: 'Doe',
            spouses: ['p-1'],
            children: ['p-3'],
        },
        'p-3': {
            ...createPerson('male'),
            id: 'p-3',
            firstName: 'Father',
            lastName: 'Doe',
            parents: ['p-1', 'p-2'],
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should start tracking and return a correct manifest', () => {
        const result = PublishingTracker.startTracking({
            templateId: 'classic-ancestor-poster',
            exportType: 'publishing',
            people: mockPeople,
            totalPages: 1,
        });

        expect(result.startTime).toBeGreaterThan(0);
        expect(result.exportType).toBe('publishing');
        expect(result.manifest.publicationId).toBeDefined();
        expect(result.manifest.templateId).toBe('classic-ancestor-poster');
        expect(result.manifest.totalPeople).toBe(3);
        // buildFamilyGraph should group p-1 and p-2 as a family
        expect(result.manifest.totalFamilies).toBeGreaterThanOrEqual(1);
        expect(result.manifest.totalPages).toBe(1);
        expect(result.manifest.initiatedBy).toBe('user-abc');
        expect(result.manifest.createdAt).toBeDefined();
        expect(result.manifest.schemaVersions).toEqual({
            manifest: 2,
            relationships: 1,
            citations: 1,
            privacy: 1,
        });
        expect(result.manifest.privacy).toEqual({ userRole: 'owner', masked: false });
        expect(result.manifest.evidence).toMatchObject({
            sourceCount: 0,
            citationCount: 0,
            citationCoverage: 0,
        });
        expect(result.manifest.integrity?.healthScore).toBeGreaterThanOrEqual(0);
        expect(result.manifest.relationships).toEqual({
            source: 'legacy_person_fields',
            driftWarningCount: 0,
        });
    });

    it('should end tracking, compute duration, and save entry to store', async () => {
        const trackerState = PublishingTracker.startTracking({
            templateId: 'json',
            exportType: 'legacy',
            people: mockPeople,
            totalPages: 1,
        });

        // Add a slight artificial delay or just run endTracking immediately
        const mockAddExportEntry = vi.mocked(useAppStore.getState().addExportEntry);
        mockAddExportEntry.mockResolvedValue(undefined);

        const entry = await PublishingTracker.endTracking(
            trackerState,
            true,
            ['Some warning message'],
            [{ name: 'tree.json', format: 'json', size: 1024 }]
        );

        expect(entry.publicationId).toBe(trackerState.manifest.publicationId);
        expect(entry.treeId).toBe('tree-123');
        expect(entry.templateId).toBe('json');
        expect(entry.exportType).toBe('legacy');
        expect(entry.success).toBe(true);
        expect(entry.durationMs).toBeGreaterThanOrEqual(0);
        expect(entry.warnings).toEqual(['Some warning message']);
        expect(entry.outputFiles).toEqual([{ name: 'tree.json', format: 'json', size: 1024 }]);
        expect(entry.totalPeople).toBe(3);
        expect(entry.schemaVersions?.manifest).toBe(2);
        expect(entry.privacy?.masked).toBe(false);
        expect(entry.evidence?.sourceCount).toBe(0);
        expect(entry.integrity?.issueCount).toBeGreaterThanOrEqual(0);
        expect(entry.relationships?.source).toBe('legacy_person_fields');

        expect(mockAddExportEntry).toHaveBeenCalledTimes(1);
        expect(mockAddExportEntry).toHaveBeenCalledWith(expect.objectContaining({
            publicationId: trackerState.manifest.publicationId,
            treeId: 'tree-123',
            templateId: 'json',
            exportType: 'legacy',
        }));
    });
});
