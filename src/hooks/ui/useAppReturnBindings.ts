import { useMemo } from 'react';
import type { AppStateAndActions, HistoryControlsProps, MutationActionResult } from '../../types';
import type { Person } from '../../types';

interface UseAppReturnBindingsOptions {
  people: Record<string, Person>;
  locations: Record<string, import('../../types').LocationData>;
  addLocation: (placeName: string, data: import('../../types').LocationData) => void;
  updateLocationStatus: (placeName: string, status: import('../../types').LocationStatus) => void;
  focusId: string;
  setFocusId: (id: string) => void;
  currentTreeId: string | null;
  setCurrentTreeId: (id: string | null) => void;
  updatePerson: (id: string, updates: Partial<Person>) => MutationActionResult | Promise<MutationActionResult>;
  deletePerson: (id: string) => Promise<MutationActionResult>;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  addChild: (gender: 'male' | 'female', relatedPersonId?: string) => MutationActionResult | Promise<MutationActionResult>;
  addFirstPerson: (gender: 'male' | 'female') => MutationActionResult | Promise<MutationActionResult>;
}

export function useAppReturnBindings({
  people,
  locations,
  addLocation,
  updateLocationStatus,
  focusId,
  setFocusId,
  currentTreeId,
  setCurrentTreeId,
  updatePerson,
  deletePerson,
  canUndo,
  canRedo,
  undo,
  redo,
  addChild,
  addFirstPerson,
}: UseAppReturnBindingsOptions): {
  appState: AppStateAndActions;
  historyControls: HistoryControlsProps;
  onAddPerson: () => void;
} {
  const activePerson = people[focusId];

  const historyControls = useMemo<HistoryControlsProps>(() => ({
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
  }), [canRedo, canUndo, redo, undo]);

  const appState = useMemo<AppStateAndActions>(() => ({
    people,
    locations,
    addLocation,
    updateLocationStatus,
    focusId,
    setFocusId,
    updatePerson,
    deletePerson,
    currentTreeId,
    setCurrentTreeId,
    activePerson,
  }), [
    activePerson,
    addLocation,
    currentTreeId,
    deletePerson,
    focusId,
    locations,
    people,
    setCurrentTreeId,
    setFocusId,
    updateLocationStatus,
    updatePerson,
  ]);

  const onAddPerson = () => {
    if (focusId) {
      addChild('male');
    } else {
      addFirstPerson('male');
    }
  };

  return { appState, historyControls, onAddPerson };
}
