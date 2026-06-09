import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { EMPTY_STRING } from '../constants';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';
import { showToast } from '../utils/showToast';
import { updateTreeRoot } from '../services/supabaseTreeMutationService';
import { ConfirmationModal } from './ConfirmationModal';
import { NodeContextMenu } from './NodeContextMenu';
import type {
  AppStateAndActions,
  AuthProps,
  FamilyActionsProps,
  ModalStateAndActions,
  ToolsActionsProps,
  TreeSettings,
  ViewSettingsProps,
} from '../types';

const SmartPersonaDrawer = React.lazy(() =>
  import('../features/smart-persona').then((module) => ({ default: module.SmartPersonaDrawer }))
);

interface AppPersonOverlaysProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  toolsActions: ToolsActionsProps;
  detailsPanelFamilyActions: FamilyActionsProps;
  auth: AuthProps;
  isPresentMode: boolean;
  detailsPanelOpen: boolean;
  setDetailsPanelOpen: (v: boolean) => void;
  focusAndNavigate: (personId: string) => void;
  effectiveTreeSettings: TreeSettings;
  canEditActiveTree: boolean;
  currentUserRole?: ViewSettingsProps['currentUserRole'];
}

export const AppPersonOverlays: React.FC<AppPersonOverlaysProps> = ({
  appState,
  modals,
  toolsActions,
  detailsPanelFamilyActions,
  auth,
  isPresentMode,
  detailsPanelOpen,
  setDetailsPanelOpen,
  focusAndNavigate,
  effectiveTreeSettings,
  canEditActiveTree,
  currentUserRole,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { people, activePerson } = appState;
  const nodeContextMenu = useAppStore((state) => state.nodeContextMenu);
  const setNodeContextMenu = useAppStore((state) => state.setNodeContextMenu);

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [pendingDeletePersonId, setPendingDeletePersonId] = React.useState<string | null>(null);

  const closeNodeContextMenu = React.useCallback(() => setNodeContextMenu(null), [setNodeContextMenu]);

  const triggerDelete = React.useCallback((personId?: string) => {
    setPendingDeletePersonId(personId ?? activePerson?.id ?? null);
    setDeleteModalOpen(true);
  }, [activePerson?.id]);

  const handleDeleteConfirm = React.useCallback(async () => {
    const personIdToDelete = pendingDeletePersonId ?? activePerson?.id;
    if (personIdToDelete) {
      const result = await appState.deletePerson(personIdToDelete);
      if (!result.success) {
        showToast.error(result.error || t.messages?.error?.delete || 'Unable to delete person.');
        return;
      }

      const nextFocusId = useAppStore.getState().focusId;
      if (nextFocusId && nextFocusId !== personIdToDelete && useAppStore.getState().people[nextFocusId]) {
        navigate(`/person/${nextFocusId}`);
      } else {
        navigate('/');
      }
      showToast.success('personDeletedSuccess');
    }
    setPendingDeletePersonId(null);
    setDeleteModalOpen(false);
    setDetailsPanelOpen(false);
  }, [activePerson?.id, appState, navigate, pendingDeletePersonId, setDetailsPanelOpen, t]);

  const openPersonDetailsPanel = React.useCallback(
    (personId: string, options?: { tab?: 'about' | 'links' | 'media'; isEditing?: boolean } | 'view' | 'edit') => {
      focusAndNavigate(personId);
      setDetailsPanelOpen(true);

      let tab: 'about' | 'links' | 'media' = 'about';
      let isEditing = false;

      if (options && typeof options === 'object') {
        if (options.tab) tab = options.tab;
        if (options.isEditing !== undefined) isEditing = options.isEditing;
      } else if (options === 'edit') {
        isEditing = true;
      }

      useAppStore.getState().setSmartPersonaTab(tab);
      useAppStore.getState().setSmartPersonaEditing(isEditing);
      closeNodeContextMenu();
    },
    [closeNodeContextMenu, focusAndNavigate, setDetailsPanelOpen]
  );

  const handleSetAsRoot = React.useCallback(async (id: string) => {
    focusAndNavigate(id);
    closeNodeContextMenu();

    if (!appState.currentTreeId || !auth.user) return;

    try {
      await updateTreeRoot(
        appState.currentTreeId,
        id,
        auth.user.uid,
        auth.user.email || EMPTY_STRING,
        auth.user.supabaseToken
      );
    } catch (error) {
      console.error('Failed to update tree root', error);
    }
  }, [appState.currentTreeId, auth.user, closeNodeContextMenu, focusAndNavigate]);

  const contextMenuPerson = nodeContextMenu ? people[nodeContextMenu.personId] : undefined;
  const deletePersonName = [people[pendingDeletePersonId ?? activePerson?.id ?? EMPTY_STRING]?.firstName, people[pendingDeletePersonId ?? activePerson?.id ?? EMPTY_STRING]?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <>
      {activePerson && !isPresentMode && detailsPanelOpen && (
        <React.Suspense fallback={null}>
          <SmartPersonaDrawer
            person={activePerson}
            people={people}
            onUpdate={appState.updatePerson}
            onDelete={triggerDelete}
            onSelect={focusAndNavigate}
            isOpen={detailsPanelOpen}
            onClose={() => setDetailsPanelOpen(false)}
            onOpenModal={toolsActions.onOpenModal}
            user={auth.user}
            canEdit={canEditActiveTree}
            familyActions={detailsPanelFamilyActions}
            settings={effectiveTreeSettings}
          />
        </React.Suspense>
      )}

      {contextMenuPerson && (
        <NodeContextMenu
          person={contextMenuPerson}
          x={nodeContextMenu!.x}
          y={nodeContextMenu!.y}
          onClose={closeNodeContextMenu}
          onAddRelation={(type, gender) => {
            closeNodeContextMenu();
            modals.handleOpenLinkModal(type, gender, { initialMode: 'create' });
          }}
          onOpenDetails={(id, mode) => {
            openPersonDetailsPanel(id, { tab: 'about', isEditing: mode === 'edit' && canEditActiveTree });
          }}
          onLinkExisting={(type, gender) => {
            closeNodeContextMenu();
            modals.handleOpenLinkModal(type, gender, { initialMode: 'existing' });
          }}
          onSetAsRoot={handleSetAsRoot}
          onDelete={(id) => {
            closeNodeContextMenu();
            triggerDelete(id);
          }}
          currentUserRole={currentUserRole ?? null}
        />
      )}

      {(activePerson || pendingDeletePersonId) && (
        <ConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setPendingDeletePersonId(null);
          }}
          onConfirm={handleDeleteConfirm}
          title={t.deletePerson}
          message={`${t.personDeleteConfirm} (${deletePersonName})`}
          requiredConfirmText={deletePersonName}
        />
      )}
    </>
  );
};
