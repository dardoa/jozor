import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  createIntegrityNotificationSpec,
  deliverNotificationWithPolicy,
} from '../../services/notificationPolicyService';
import { buildScheduledBirthdayNotifications } from '../../services/scheduledNotifications';
import { logInfo } from '../../utils/errorLogger';

const INTEGRITY_SESSION_KEY = 'jozor_notif_integrity_shown';

function todayIso(): string {
  return new Date().toISOString().substring(0, 10);
}

/**
 * Notification Engine.
 * - Heritage Engine: "On this day" birthdays (per-person guard in ref)
 * - Data Integrity: Missing geographic locations (sessionStorage guard per day)
 */
export function useNotifications() {
  const people = useAppStore(state => state.people);
  const locations = useAppStore(state => state.locations);
  const language = useAppStore(state => state.language);
  const addNotification = useAppStore(state => state.addNotification);
  const updateNotificationTelemetry = useAppStore(state => state.updateNotificationTelemetry);
  const isRtl = language === 'ar';

  const notifiedBirthdays = useRef<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!people || Object.keys(people).length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runHeritageCheck(people, notifiedBirthdays.current, isRtl, addNotification, updateNotificationTelemetry);
      runDataIntegrityCheck(people, locations, isRtl, addNotification, updateNotificationTelemetry);
    }, 3000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [people, locations, isRtl, addNotification, updateNotificationTelemetry]);
}

export function runHeritageCheck(
  people: ReturnType<typeof useAppStore.getState>['people'],
  notified: Set<string>,
  isRtl: boolean,
  addNotification: ReturnType<typeof useAppStore.getState>['addNotification'],
  updateNotificationTelemetry: ReturnType<typeof useAppStore.getState>['updateNotificationTelemetry']
) {
  const scheduledNotifications = buildScheduledBirthdayNotifications({
    people: people as Record<string, (typeof people)[string]>,
    isRtl,
  });

  scheduledNotifications.forEach(({ personId, fullName, spec }) => {
    const dedupeKey = spec.notification.dedupeKey;
    if (!dedupeKey) return;

    if (notified.has(dedupeKey)) {
      updateNotificationTelemetry({
        lastSkippedAt: new Date(),
        lastSkippedSource: 'heritage',
        lastSkippedReason: `birthday-duplicate:${dedupeKey}`,
      });
      return;
    }
    notified.add(dedupeKey);

    deliverNotificationWithPolicy(addNotification as any, spec);
    updateNotificationTelemetry({
      lastEventAt: new Date(),
      lastEventType: 'birthday',
      lastEventSource: 'heritage',
      lastEventPersonId: personId,
      lastEventDedupKey: spec.notification.dedupeKey,
      lastBirthdayName: fullName,
    });
    logInfo('NotificationEngine heritage', 'Delivered birthday notification.', {
      personId,
      dedupeKey: spec.notification.dedupeKey,
    });
  });
}

export function runDataIntegrityCheck(
  people: ReturnType<typeof useAppStore.getState>['people'],
  locations: ReturnType<typeof useAppStore.getState>['locations'],
  isRtl: boolean,
  addNotification: ReturnType<typeof useAppStore.getState>['addNotification'],
  updateNotificationTelemetry: ReturnType<typeof useAppStore.getState>['updateNotificationTelemetry']
) {
  const today = todayIso();
  const lastShown = sessionStorage.getItem(INTEGRITY_SESSION_KEY);
  if (lastShown === today) {
    updateNotificationTelemetry({
      lastSkippedAt: new Date(),
      lastSkippedSource: 'integrity',
      lastSkippedReason: `integrity-session-guard:${today}`,
    });
    return;
  }

  const allPlaces = new Set<string>();
  Object.values(people).forEach(person => {
    if (person.birthPlace?.trim()) allPlaces.add(person.birthPlace.trim());
    if (person.deathPlace?.trim()) allPlaces.add(person.deathPlace.trim());
    if (person.residence?.trim()) allPlaces.add(person.residence.trim());
  });

  if (allPlaces.size === 0) {
    updateNotificationTelemetry({
      lastSkippedAt: new Date(),
      lastSkippedSource: 'integrity',
      lastSkippedReason: 'integrity-no-places',
    });
    return;
  }

  const missingCount = Array.from(allPlaces).filter(
    place => !locations?.[place] || locations[place].status === 'pending'
  ).length;

  if (missingCount === 0) {
    updateNotificationTelemetry({
      lastSkippedAt: new Date(),
      lastSkippedSource: 'integrity',
      lastSkippedReason: 'integrity-no-missing-places',
    });
    return;
  }

  sessionStorage.setItem(INTEGRITY_SESSION_KEY, today);
  const spec = createIntegrityNotificationSpec({
    isRtl,
    today,
    missingCount,
  });

  deliverNotificationWithPolicy(addNotification as any, spec);
  updateNotificationTelemetry({
    lastEventAt: new Date(),
    lastEventType: 'integrity',
    lastEventSource: 'integrity',
    lastEventDedupKey: spec.notification.dedupeKey,
    lastIntegrityCount: missingCount,
  });
  logInfo('NotificationEngine integrity', 'Delivered integrity notification.', {
    dedupeKey: spec.notification.dedupeKey,
    missingCount,
  });
}
