import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppOrchestration } from '../useAppOrchestration';

// --- Mocks ---

// Mock storageService
vi.mock('../../services/storageService', () => ({
    storageService: {
        loadFullTree: vi.fn().mockResolvedValue({}), // Initially empty or sample
        saveFullTree: vi.fn().mockResolvedValue(undefined),
        migrateFromLocalStorage: vi.fn().mockResolvedValue(undefined),
        saveSetting: vi.fn(),
        getSetting: vi.fn().mockResolvedValue('modern'),
    }
}));

// Mock Google Services
// Mock Google Services
vi.mock('../../services/googleService', () => ({
    googleApiService: {
        initialize: vi.fn().mockResolvedValue(undefined),
        isInitialized: false,
    },
    googleAuthService: {
        login: vi.fn(),
        logout: vi.fn(),
    },
    googleDriveService: {
        saveFile: vi.fn(),
        loadFile: vi.fn(),
        listJozorFiles: vi.fn().mockResolvedValue([]),
        findLatestJozorFile: vi.fn(),
        deleteFile: vi.fn(),
        getOrCreateUserVisibleAppFolderId: vi.fn(),
    },
    googleMediaService: {
        pickAndDownloadImage: vi.fn(),
        uploadFile: vi.fn(),
        fetchFileAsBlob: vi.fn(),
    }
}));

vi.mock('../../context/TranslationContext', () => ({
    useTranslation: () => ({
        t: {}, // Dummy translation object, assuming t.keys lookups return undefined which is fine or checks exist
        language: 'en',
        setLanguage: vi.fn(),
    }),
    TranslationProvider: ({ children }: any) => children,
}));

// Mock useTreeLayout (used internally? No, AppOrchestration doesn't use it directly, App uses it via FamilyTree)
// But wait, does useAppOrchestration use anything else?
// It uses useFamilyPersistence, useFamilyActions, etc. We should test the integration of these.
// We DO NOT mock the internal hooks like useFamilyActions if we want an integration test of the orchestration logic.
// We only mock the "Infra" layer (Storage, Network).

describe('useAppOrchestration Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with sample data if storage is empty', async () => {
        const { result } = renderHook(() => useAppOrchestration());

        // Wait for async load
        await waitFor(() => {
            // Check if people are loaded.
            // In safe implementation, empty DB triggers SAMPLE_FAMILY load in useFamilyPersistence
            // which updates the state.
            expect(Object.keys(result.current.appState.people).length).toBeGreaterThan(0);
        });

        const rootId = 'root-1';
        expect(result.current.appState.people[rootId]).toBeDefined();
    });

    it('handles interaction: updating a person', async () => {
        const { result } = renderHook(() => useAppOrchestration());

        // Wait for load
        await waitFor(() => expect(Object.keys(result.current.appState.people).length).toBeGreaterThan(0));

        const initialCount = Object.keys(result.current.appState.people).length;
        const targetId = Object.keys(result.current.appState.people)[0];

        act(() => {
            result.current.appState.updatePerson(targetId, {
                firstName: 'Updated',
                lastName: 'Name'
            });
        });

        // Count should remain same
        expect(Object.keys(result.current.appState.people).length).toBe(initialCount);
        expect(result.current.appState.people[targetId].firstName).toBe('Updated');
        expect(result.current.appState.people[targetId].lastName).toBe('Name');
    });
});
