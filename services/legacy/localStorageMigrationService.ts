import type { Person } from '../../types';
import { logError } from '../../utils/errorLogger';
import { storageService } from '../storageService';

const LEGACY_TREE_STORAGE_KEY = 'echo-family-data';

const getLocalDb = async () => {
  const { db } = await import('../../utils/db');
  return db;
};

export const localStorageMigrationService = {
  async migrateFromLocalStorage(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const db = await getLocalDb();
    const count = await db.people.count();
    if (count > 0) return;

    const json = window.localStorage.getItem(LEGACY_TREE_STORAGE_KEY);
    if (!json) return;

    try {
      const people = JSON.parse(json) as Record<string, Person>;
      await storageService.saveFullTree(people);
    } catch (error) {
      logError('localStorageMigrationService migrateFromLocalStorage', error, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { operationType: 'migrate_local_storage' },
      });
    }
  },
};

export const migrateFromLocalStorage = () => localStorageMigrationService.migrateFromLocalStorage();
