import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runDataIntegrityCheck, runHeritageCheck } from '../useNotifications';

describe('useNotifications telemetry helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('updates telemetry when a birthday notification is delivered', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T12:00:00.000Z'));

    const addNotification = vi.fn();
    const updateNotificationTelemetry = vi.fn();

    runHeritageCheck(
      {
        'person-1': {
          id: 'person-1',
          firstName: 'Sara',
          middleName: '',
          lastName: 'Ali',
          birthDate: '1980-03-27',
        },
      } as never,
      new Set<string>(),
      false,
      addNotification,
      updateNotificationTelemetry
    );

    expect(addNotification).toHaveBeenCalledTimes(1);
    expect(updateNotificationTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        lastEventType: 'birthday',
        lastEventSource: 'heritage',
        lastEventPersonId: 'person-1',
        lastBirthdayName: 'Sara Ali',
      })
    );
  });

  it('records telemetry when integrity notifications are skipped by the session guard', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T12:00:00.000Z'));

    const addNotification = vi.fn();
    const updateNotificationTelemetry = vi.fn();

    sessionStorage.setItem('jozor_notif_integrity_shown', '2026-03-27');

    runDataIntegrityCheck(
      {
        'person-1': {
          id: 'person-1',
          birthPlace: 'Riyadh',
          deathPlace: '',
          residence: '',
        },
      } as never,
      {},
      false,
      addNotification,
      updateNotificationTelemetry
    );

    expect(addNotification).not.toHaveBeenCalled();
    expect(updateNotificationTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        lastSkippedSource: 'integrity',
        lastSkippedReason: 'integrity-session-guard:2026-03-27',
      })
    );
  });
});
