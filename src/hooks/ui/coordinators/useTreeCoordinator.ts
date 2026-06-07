import type { Person, ExportType } from '../../../types';
import { useAppTreeBindings } from '../useAppTreeBindings';
import { useAppSearchBindings } from '../useAppSearchBindings';
import { useAppShortcutBindings } from '../useAppShortcutBindings';
import { useDetailsPanelAutoOpenOnFocus } from '../useDetailsPanelAutoOpenOnFocus';
import type { SharedTreeSummary } from '../../../services/supabaseTreeTypes';

interface UseTreeCoordinatorParams {
  people: Record<string, Person>;
  locations: Record<string, import('../../../types').LocationData>;
  addLocation: (placeName: string, data: import('../../../types').LocationData) => void;
  updateLocationStatus: (placeName: string, status: import('../../../types').LocationStatus) => void;
  focusId: string;
  setFocusId: (id: string) => void;
  currentTreeId: string | null;
  setCurrentTreeId: (id: string | null) => void;
  past: unknown[];
  future: unknown[];
  undo: () => void;
  redo: () => void;
  isPresentMode: boolean;
  setIsPresentMode: (v: boolean) => void;
  showWelcome: boolean;
  handleOpenLinkModal: (type: 'parent' | 'spouse' | 'child', gender: 'male' | 'female') => void;
  setDetailsPanelOpen: (open: boolean) => void;
  onOpenGoogleSyncChoice: (fileId: string) => void;
  onCloseGoogleSyncChoice: () => void;
  onOpenCloudBackups: () => void;
  onOpenTreeManager: () => void;
  setSharedTreePromptModal?: (value: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
  onOpenLoginModal: (returnTo?: string) => Promise<void>;
  handleExport: (type: ExportType) => Promise<void>;
}

export const useTreeCoordinator = ({
  people,
  locations,
  addLocation,
  updateLocationStatus,
  focusId,
  setFocusId,
  currentTreeId,
  setCurrentTreeId,
  past,
  future,
  undo,
  redo,
  isPresentMode,
  setIsPresentMode,
  showWelcome,
  handleOpenLinkModal,
  setDetailsPanelOpen,
}: UseTreeCoordinatorParams) => {
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const {
    appState,
    historyControls,
    onAddPerson,
    detailsPanelFamilyActions,
    coreFamilyActions,
    treeActions,
  } = useAppTreeBindings({
    people,
    locations,
    addLocation,
    updateLocationStatus,
    focusId,
    setFocusId,
    currentTreeId,
    setCurrentTreeId,
    canUndo,
    canRedo,
    undo,
    redo,
    handleOpenLinkModal,
  });

  const searchProps = useAppSearchBindings({ people, setFocusId });

  useAppShortcutBindings({
    canUndo,
    canRedo,
    undo,
    redo,
    isPresentMode,
    setIsPresentMode,
    enabled: !showWelcome,
  });

  useDetailsPanelAutoOpenOnFocus({
    focusId,
    isPresentMode,
    setDetailsPanelOpen,
  });

  return {
    appState,
    historyControls,
    onAddPerson,
    detailsPanelFamilyActions,
    coreFamilyActions,
    searchProps,
    treeActions,
  };
};
