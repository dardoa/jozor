import type { FullState, Person, UserProfile } from '../../types';
import { loadFullState, useAppStore } from '../../store/useAppStore';
import { storageProvider } from '../../services/storageProvider';
import { DriveSerializationService } from '../../services/google/DriveSerializationService';

export const loadDrivePayloadIntoStore = (cloudData: FullState | Record<string, Person>) => {
  if ('version' in cloudData || 'metadata' in cloudData) {
    loadFullState(cloudData);
    return;
  }

  loadFullState({ people: cloudData });
};

export const buildCurrentDriveFullState = (email = 'unknown') =>
  DriveSerializationService.buildCurrentFullState(email);

export const validateCurrentDriveIntegrity = (silent: boolean) => {
  const state = useAppStore.getState();
  return DriveSerializationService.validateIntegrity(state.people, silent);
};

export const saveCurrentDriveState = async ({
  fileId,
  forceNew,
  user,
  runWithAuth,
  allowPopup,
}: {
  fileId: string | null;
  forceNew: boolean;
  user: UserProfile | null;
  runWithAuth: <T>(operation: () => Promise<T>, allowPopup?: boolean) => Promise<T>;
  allowPopup: boolean;
}) => {
  const fullState = buildCurrentDriveFullState(user?.email || 'unknown');

  if (!navigator.onLine) {
    throw new Error('Offline');
  }

  const newId = await runWithAuth(
    () => storageProvider.saveFile(fullState, fileId, undefined, forceNew),
    allowPopup
  );

  return newId;
};
