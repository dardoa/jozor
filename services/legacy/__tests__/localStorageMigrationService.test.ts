import { beforeEach, describe, expect, it, vi } from 'vitest';

const { peopleCountMock, saveFullTreeMock, logErrorMock } = vi.hoisted(() => ({
  peopleCountMock: vi.fn(),
  saveFullTreeMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('../../../utils/db', () => ({
  db: {
    people: {
      count: peopleCountMock,
    },
  },
}));

vi.mock('../../storageService', () => ({
  storageService: {
    saveFullTree: saveFullTreeMock,
  },
}));

vi.mock('../../../utils/errorLogger', () => ({
  logError: logErrorMock,
}));

import { localStorageMigrationService } from '../localStorageMigrationService';

describe('localStorageMigrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    peopleCountMock.mockResolvedValue(0);
    saveFullTreeMock.mockResolvedValue(undefined);
  });

  it('migrates legacy localStorage data when IndexedDB has no people', async () => {
    const people = { root: { id: 'root', firstName: 'Legacy' } };
    localStorage.setItem('echo-family-data', JSON.stringify(people));

    await localStorageMigrationService.migrateFromLocalStorage();

    expect(saveFullTreeMock).toHaveBeenCalledWith(people);
  });

  it('skips migration when IndexedDB already has people', async () => {
    peopleCountMock.mockResolvedValue(2);
    localStorage.setItem('echo-family-data', JSON.stringify({ root: { id: 'root' } }));

    await localStorageMigrationService.migrateFromLocalStorage();

    expect(saveFullTreeMock).not.toHaveBeenCalled();
  });

  it('logs malformed legacy data without throwing', async () => {
    localStorage.setItem('echo-family-data', '{bad json');

    await expect(localStorageMigrationService.migrateFromLocalStorage()).resolves.toBeUndefined();
    expect(logErrorMock).toHaveBeenCalledWith(
      'localStorageMigrationService migrateFromLocalStorage',
      expect.any(SyntaxError),
      expect.objectContaining({
        category: 'DATABASE',
        severity: 'MEDIUM',
      })
    );
  });
});
