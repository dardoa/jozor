import type { Person, ExportType } from '../../../types';
import { useAppTreeBindings } from '../useAppTreeBindings';
import { useAppSearchBindings } from '../useAppSearchBindings';
import { useAppShortcutBindings } from '../useAppShortcutBindings';
import { useDetailsPanelAutoOpenOnFocus } from '../useDetailsPanelAutoOpenOnFocus';
import type { SharedTreeSummary } from '../../../services/supabaseTreeTypes';
import { useAppStore } from '../../../store/useAppStore';
import { showToast } from '../../../utils/showToast';

const STALE_UNDO_MESSAGE_AR =
  '\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0628\u0633\u0628\u0628 \u0648\u062c\u0648\u062f \u062a\u0639\u062f\u064a\u0644\u0627\u062a \u062a\u0639\u0627\u0648\u0646\u064a\u0629 \u062c\u062f\u064a\u062f\u0629.';
const STALE_REDO_MESSAGE_AR =
  '\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0625\u0639\u0627\u062f\u0629 \u0628\u0633\u0628\u0628 \u0648\u062c\u0648\u062f \u062a\u0639\u062f\u064a\u0644\u0627\u062a \u062a\u0639\u0627\u0648\u0646\u064a\u0629 \u062c\u062f\u064a\u062f\u0629.';

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
  undo: () => { success: boolean; blockedReason?: 'stale_history' };
  redo: () => { success: boolean; blockedReason?: 'stale_history' };
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
  undo: storeUndo,
  redo: storeRedo,
  isPresentMode,
  setIsPresentMode,
  showWelcome,
  handleOpenLinkModal,
  setDetailsPanelOpen,
}: UseTreeCoordinatorParams) => {
  const language = useAppStore((state) => state.language);

  const undo = () => {
    const res = storeUndo();
    if (!res.success && res.blockedReason === 'stale_history') {
      showToast.warning(
        language === 'ar'
          ? STALE_UNDO_MESSAGE_AR
          : 'Undo is disabled because new collaborative updates have been received.'
      );
    }
  };

  const redo = () => {
    const res = storeRedo();
    if (!res.success && res.blockedReason === 'stale_history') {
      showToast.warning(
        language === 'ar'
          ? STALE_REDO_MESSAGE_AR
          : 'Redo is disabled because new collaborative updates have been received.'
      );
    }
  };

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
