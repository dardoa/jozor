import type { Person } from '../types';
import { useTreeActions } from './useTreeActions';
import { useFamilyActionBindings } from './useFamilyActionBindings';
import { useAppReturnBindings } from './useAppReturnBindings';

interface UseAppTreeBindingsOptions {
  people: Record<string, Person>;
  locations: Record<string, import('../types').LocationData>;
  addLocation: (placeName: string, data: import('../types').LocationData) => void;
  updateLocationStatus: (placeName: string, status: import('../types').LocationStatus) => void;
  focusId: string;
  setFocusId: (id: string) => void;
  currentTreeId: string | null;
  setCurrentTreeId: (id: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  handleOpenLinkModal: (type: 'parent' | 'spouse' | 'child', gender: 'male' | 'female') => void;
}

export function useAppTreeBindings({
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
}: UseAppTreeBindingsOptions) {
  const treeActions = useTreeActions();

  const { sidebarFamilyActions, coreFamilyActions } = useFamilyActionBindings({
    handleOpenLinkModal,
    addParent: (gender, relatedPersonId) => treeActions.addParent(gender, relatedPersonId),
    addSpouse: (gender) => treeActions.addSpouse(gender),
    addChild: (gender, relatedPersonId) => treeActions.addChild(gender, relatedPersonId),
    addFirstPerson: (gender) => treeActions.addFirstPerson(gender),
    removeRelationship: (targetId, relativeId, type) =>
      treeActions.removeRelationship(targetId, relativeId, type),
    linkPerson: (id, type, relatedPersonId) => treeActions.linkPerson(id, type, relatedPersonId),
  });

  const { appState, historyControls, onAddPerson } = useAppReturnBindings({
    people,
    locations,
    addLocation,
    updateLocationStatus,
    focusId,
    setFocusId,
    currentTreeId,
    setCurrentTreeId,
    updatePerson: treeActions.updatePerson,
    deletePerson: treeActions.deletePerson,
    canUndo,
    canRedo,
    undo,
    redo,
    addChild: (gender, relatedPersonId) => treeActions.addChild(gender, relatedPersonId),
    addFirstPerson: (gender) => treeActions.addFirstPerson(gender),
  });

  return {
    appState,
    historyControls,
    onAddPerson,
    sidebarFamilyActions,
    coreFamilyActions,
    treeActions,
  };
}
