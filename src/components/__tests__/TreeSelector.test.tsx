
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TreeSelector } from '../../features/tree-manager';

const mockFetchTreesForUser = vi.fn();
const mockFetchSharedTrees = vi.fn();
const mockFetchTree = vi.fn();
const mockLoadFullState = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('../../services/supabaseTreeReadService', () => ({
  fetchTreesForUser: (...args: unknown[]) => mockFetchTreesForUser(...args),
  fetchTree: (...args: unknown[]) => mockFetchTree(...args),
}));

vi.mock('../../services/supabaseTreeAccessService', () => ({
  fetchSharedTrees: (...args: unknown[]) => mockFetchSharedTrees(...args),
}));

vi.mock('../../services/supabaseTreeMutationService', () => ({
  createTreeWithRootAtomic: vi.fn(),
}));

vi.mock('../../store/useAppStore', () => ({
  loadFullState: (...args: unknown[]) => mockLoadFullState(...args),
}));

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      manageTrees: 'Manage trees',
      manageTreesDesc: 'Pick a tree to continue',
      add: 'Add',
      load: 'Load',
      loadingFiles: 'Loading',
      noTreesFound: 'No trees found',
      getStarted: 'Get started',
      newTreeName: 'New Tree',
      treeManager: {
        myTrees: 'My Trees',
        sharedWithMe: 'Shared With Me',
      },
      messages: {
        success: { load: 'Loaded successfully' },
        error: {
          load: 'Load failed',
          collaborators: 'Collaborators failed',
          open: 'Open failed',
        },
      },
      general: {
        me: 'Me',
      },
    },
  }),
}));

vi.mock('../../utils/showToast', () => ({
  showToast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockShowSuccess(...args),
    error: (...args: unknown[]) => mockShowError(...args),
    promise: vi.fn(),
  })
}));

vi.mock('../../utils/errorLogger', () => ({
  getUserFacingErrorInfo: (_error: unknown, fallback: string) => ({ message: fallback }),
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

describe('TreeSelector', () => {
  it('hydrates the active tree name into the app store when opening a tree', async () => {
    mockFetchTreesForUser.mockResolvedValue([
      {
        id: 'tree-1',
        name: 'Family Archive',
        createdAt: '2026-03-27T00:00:00.000Z',
        updatedAt: '2026-03-27T00:00:00.000Z',
      },
    ]);
    mockFetchSharedTrees.mockResolvedValue([]);
    mockFetchTree.mockResolvedValue({
      people: {},
      settings: {},
      focusId: 'person-1',
      ownerId: 'owner-1',
      lastVersion: 4,
      name: 'Family Archive',
    });

    const onTreeSelected = vi.fn();

    render(
      <MemoryRouter>
        <TreeSelector
          ownerId='owner-1'
          userEmail='owner@example.com'
          currentTreeId={null}
          supabaseToken='token-1'
          onTreeSelected={onTreeSelected}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Family Archive')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Family Archive'));

    await waitFor(() => {
      expect(mockLoadFullState).toHaveBeenCalledWith(
        expect.objectContaining({
          treeName: 'Family Archive',
          focusId: 'person-1',
        })
      );
    });

    expect(onTreeSelected).toHaveBeenCalledWith('tree-1', 'owner');
    expect(mockShowSuccess).toHaveBeenCalledWith('messages.success.load');
  });
});
