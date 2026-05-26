
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadFullState, useAppStore } from '../useAppStore';
import {
  isPersistableNotification,
  sanitizePersistedNotifications,
} from '../slices/uiSlice';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';

const recordDeletedPersonIdMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('../../services/storageService', () => ({
  storageService: {
    recordDeletedPersonId: recordDeletedPersonIdMock,
  },
}));

const buildPerson = (id: string, firstName: string): Person => ({
  ...DEFAULT_PERSON_TEMPLATE,
  id,
  firstName,
});

describe('loadFullState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    act(() => {
      useAppStore.getState().clearNotifications();
      useAppStore.getState().setUser(null);
    });
  });

  it('hydrates treeName into the store from loaded state', () => {
    act(() => {
      useAppStore.getState().setTreeName('Original Tree');
    });

    act(() => {
      loadFullState({ treeName: 'Shared Oak' });
    });

    expect(useAppStore.getState().treeName).toBe('Shared Oak');
  });

  it('upserts notifications by dedupeKey', () => {
    act(() => {
      useAppStore.getState().clearNotifications();
      useAppStore.getState().enqueueNotification({
        type: 'info',
        source: 'system',
        title: 'First title',
        body: 'First body',
        dedupeKey: 'notification:1',
      });
      useAppStore.getState().enqueueNotification({
        type: 'info',
        source: 'activity-log',
        title: 'Updated title',
        body: 'Updated body',
        dedupeKey: 'notification:1',
      });
    });

    const notifications = useAppStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Updated title');
    expect(notifications[0].body).toBe('Updated body');
    expect(notifications[0].source).toBe('activity-log');
  });

  it('persists only eligible notification types', () => {
    expect(isPersistableNotification({
      id: 'integrity-1',
      type: 'integrity',
      source: 'integrity',
      title: 'Integrity',
      body: 'Body',
      createdAt: '2026-03-27T12:00:00.000Z',
      updatedAt: '2026-03-27T12:00:00.000Z',
      timestamp: Date.now(),
      read: false,
    })).toBe(true);

    expect(isPersistableNotification({
      id: 'birthday-1',
      type: 'birthday',
      source: 'heritage',
      title: 'Birthday',
      body: 'Body',
      createdAt: '2026-03-27T12:00:00.000Z',
      updatedAt: '2026-03-27T12:00:00.000Z',
      timestamp: Date.now(),
      read: false,
    })).toBe(false);
  });

  it('hydrates only persisted notifications from localStorage', () => {
    localStorage.setItem('jozor_persisted_notifications:user-1', JSON.stringify([
      {
        id: 'inv-1',
        type: 'invitation',
        source: 'invitation-hydration',
        title: 'Invite',
        body: 'Pending',
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:00:00.000Z',
        timestamp: Date.now(),
        read: false,
        actionable: true,
        invitationId: 'invitation-1',
        invitationStatus: 'pending',
      },
      {
        id: 'birthday-1',
        type: 'birthday',
        source: 'heritage',
        title: 'Birthday',
        body: 'Anniversary',
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:00:00.000Z',
        timestamp: Date.now(),
        read: false,
      },
    ]));

    act(() => {
      useAppStore.getState().hydrateNotificationsFromStorage('user-1');
    });

    const notifications = useAppStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe('inv-1');
    expect(notifications[0].type).toBe('invitation');
  });

  it('keeps persisted notifications scoped to the active user', () => {
    localStorage.setItem('jozor_persisted_notifications:user-a', JSON.stringify([
      {
        id: 'owner-a',
        type: 'info',
        source: 'owner-realtime',
        title: 'Owner A',
        body: 'Body A',
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:00:00.000Z',
        timestamp: Date.now(),
        read: false,
      },
    ]));
    localStorage.setItem('jozor_persisted_notifications:user-b', JSON.stringify([
      {
        id: 'owner-b',
        type: 'info',
        source: 'owner-realtime',
        title: 'Owner B',
        body: 'Body B',
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:00:00.000Z',
        timestamp: Date.now(),
        read: false,
      },
    ]));

    act(() => {
      useAppStore.getState().hydrateNotificationsFromStorage('user-b');
    });

    expect(useAppStore.getState().notifications).toHaveLength(1);
    expect(useAppStore.getState().notifications[0].id).toBe('owner-b');
  });

  it('drops expired notifications during sanitization', () => {
    const notifications = sanitizePersistedNotifications([
      {
        id: 'expired-1',
        type: 'integrity',
        source: 'integrity',
        title: 'Expired',
        body: 'Old',
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:00:00.000Z',
        expiresAt: '2026-03-26T12:00:00.000Z',
        timestamp: Date.now(),
        read: false,
      },
      {
        id: 'active-1',
        type: 'info',
        source: 'activity-log',
        title: 'Active',
        body: 'Fresh',
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:00:00.000Z',
        expiresAt: '2026-03-28T12:00:00.000Z',
        timestamp: Date.now(),
        read: false,
      },
    ], Date.parse('2026-03-27T12:00:00.000Z'));

    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe('active-1');
  });

  it('preserves the current focus when background people updates keep that person', () => {
    act(() => {
      useAppStore.setState((state) => ({
        ...state,
        people: {
          'person-1': buildPerson('person-1', 'One'),
          'person-2': buildPerson('person-2', 'Two'),
        },
        focusId: 'person-2',
      }));
    });

    act(() => {
      useAppStore.getState().setPeople({
        'person-1': buildPerson('person-1', 'One updated'),
        'person-2': buildPerson('person-2', 'Two updated'),
        'person-3': buildPerson('person-3', 'Three'),
      }, false);
    });

    expect(useAppStore.getState().focusId).toBe('person-2');
  });

  it('falls back to a valid focus only when the current focused person disappears', () => {
    act(() => {
      useAppStore.setState((state) => ({
        ...state,
        people: {
          'person-1': buildPerson('person-1', 'One'),
          'person-2': buildPerson('person-2', 'Two'),
        },
        focusId: 'person-2',
      }));
    });

    act(() => {
      useAppStore.getState().setPeople({
        'person-1': buildPerson('person-1', 'One updated'),
      }, false);
    });

    expect(useAppStore.getState().focusId).toBe('person-1');
  });

  it('records local delete tombstones so stale remote operations cannot resurrect people after reload', () => {
    act(() => {
      useAppStore.setState((state) => ({
        ...state,
        currentTreeId: 'tree-1',
        currentUserRole: 'owner',
        people: {
          'person-1': buildPerson('person-1', 'One'),
          'person-2': buildPerson('person-2', 'Two'),
        },
        focusId: 'person-1',
        deletedPersonIds: new Set<string>(),
      }));
    });

    act(() => {
      useAppStore.getState().deletePerson('person-2');
    });

    expect(useAppStore.getState().deletedPersonIds.has('person-2')).toBe(true);
    expect(recordDeletedPersonIdMock).toHaveBeenCalledWith('tree-1', 'person-2');
  });

  it('persists isLowGraphicsMode to localStorage and updates state', () => {
    act(() => {
      useAppStore.getState().setIsLowGraphicsMode(true);
    });

    expect(useAppStore.getState().isLowGraphicsMode).toBe(true);
    
    const stored = JSON.parse(localStorage.getItem('jozor-ui-storage') || '{}');
    expect(stored.state?.isLowGraphicsMode).toBe(true);

    act(() => {
      useAppStore.getState().setIsLowGraphicsMode(false);
    });

    const storedFalse = JSON.parse(localStorage.getItem('jozor-ui-storage') || '{}');
    expect(storedFalse.state?.isLowGraphicsMode).toBe(false);
  });

  it('normalizes legacy chartType ("descendant" or "force") to "focus" on loadFullState', () => {
    act(() => {
      loadFullState({
        settings: {
          chartType: 'descendant' as any,
        },
      });
    });

    expect(useAppStore.getState().treeSettings.chartType).toBe('focus');

    act(() => {
      loadFullState({
        settings: {
          chartType: 'force' as any,
        },
      });
    });

    expect(useAppStore.getState().treeSettings.chartType).toBe('focus');
  });

  it('hydrates modern wrapped tree settings on loadFullState', () => {
    act(() => {
      loadFullState({
        settings: {
          treeSettings: {
            chartType: 'radial' as any,
          },
          darkMode: true,
          language: 'en',
        },
      });
    });

    expect(useAppStore.getState().treeSettings.chartType).toBe('radial');
    expect(useAppStore.getState().darkMode).toBe(true);
    expect(useAppStore.getState().language).toBe('en');
    expect((useAppStore.getState().treeSettings as any).treeSettings).toBeUndefined();
  });

  it('normalizes legacy chartType to "focus" on importSettings and setTreeSettings', () => {
    act(() => {
      useAppStore.getState().importSettings({
        treeSettings: {
          chartType: 'descendant' as any,
        } as any
      });
    });
    expect(useAppStore.getState().treeSettings.chartType).toBe('focus');

    act(() => {
      useAppStore.getState().setTreeSettings({
        chartType: 'force' as any,
      } as any);
    });
    expect(useAppStore.getState().treeSettings.chartType).toBe('focus');
  });
});

