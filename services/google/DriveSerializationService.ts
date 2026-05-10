import { useAppStore } from '../../store/useAppStore';
import { buildPersistedTreeSettings } from '../../domain/appearanceLabPersistence';
import { FullState, Person } from '../../types';
import { logWarn } from '../../utils/errorLogger';

/**
 * Service responsible for serializing the application state into a format
 * suitable for storage (e.g., Google Drive).
 */
export const DriveSerializationService = {
  /**
   * Builds a FullState snapshot of the current application state.
   */
  buildCurrentFullState(lastModifiedBy: string = 'unknown'): FullState {
    const state = useAppStore.getState();
    return {
      version: 1,
      people: state.people,
      focusId: state.focusId,
      settings: {
        treeSettings: buildPersistedTreeSettings(state.treeSettings),
        darkMode: state.darkMode,
        language: state.language
      },
      metadata: {
        lastModified: Date.now(),
        appName: 'Jozor',
        lastModifiedBy,
        device: 'web'
      }
    };
  },

  /**
   * Validates the integrity of the people data before saving.
   * Returns true if valid, false otherwise.
   */
  validateIntegrity(people: Record<string, Person>, silent: boolean = false): boolean {
    if (Object.keys(people).length === 0) {
      logWarn('DriveSerializationService', 'Integrity check failed: attempted to save empty people map.', {
        category: 'VALIDATION',
        metadata: { operationType: 'save_integrity_check' }
      });
      // UI feedback should be handled by the caller (hook/orchestrator)
      return false;
    }
    return true;
  }
};
