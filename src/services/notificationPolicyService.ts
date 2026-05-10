import { showToast } from '../utils/showToast';
import { getNotificationTranslation } from '../utils/notificationTranslations';
import type { AppNotification, Language } from '../types';

type NotificationDraft = Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'createdAt' | 'updatedAt'>;
type AddNotification = (notification: NotificationDraft) => void;

export type NotificationDeliverySpec = {
  notification: NotificationDraft;
  toast?: {
    kind?: 'default' | 'success';
    message: string;
    duration?: number;
    icon?: string;
    maxWidth?: string;
    fontSize?: string;
    fontWeight?: string;
  };
};

const endOfTodayIso = () => {
  const value = new Date();
  value.setHours(23, 59, 59, 999);
  return value.toISOString();
};

const addHoursIso = (hours: number) => {
  const value = new Date();
  value.setHours(value.getHours() + hours);
  return value.toISOString();
};

const endOfIsoDay = (isoDate: string) => {
  const value = new Date(`${isoDate}T23:59:59.999Z`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
};

const getNotificationCopy = (isRtl: boolean) => getNotificationTranslation((isRtl ? 'ar' : 'en') as Language);
const format = (template: string, replacements: Record<string, string | number>) =>
  Object.entries(replacements).reduce(
    (value, [key, replacement]) => value.replaceAll(`{${key}}`, String(replacement)),
    template
  );

const deliverToast = (toastSpec: NotificationDeliverySpec['toast']) => {
  if (!toastSpec) return;

  if (toastSpec.kind === 'success') {
    showToast.success(toastSpec.message, {
      duration: toastSpec.duration,
    });
    return;
  }

  (showToast as any)(toastSpec.message, {
    duration: toastSpec.duration,
    icon: toastSpec.icon,
    style: {
      maxWidth: toastSpec.maxWidth,
      fontSize: toastSpec.fontSize,
      fontWeight: toastSpec.fontWeight,
    },
  });
};

export const deliverNotificationWithPolicy = (
  addNotification: AddNotification,
  spec: NotificationDeliverySpec
) => {
  addNotification(spec.notification);
  deliverToast(spec.toast);
};

export const createBirthdayNotificationSpec = (params: {
  isRtl: boolean;
  personId: string;
  fullName: string;
  year: number;
  age: number;
  kind: 'today' | 'upcoming';
  daysUntil: number;
  isDeceased: boolean;
  dedupeDate: string;
  eventDateIso: string;
}): NotificationDeliverySpec => {
  const { isRtl, personId, fullName, year, age, kind, daysUntil, isDeceased, dedupeDate, eventDateIso } = params;
  const copy = getNotificationCopy(isRtl);
  const body =
    kind === 'upcoming'
      ? isDeceased
        ? format(copy.birthdayUpcomingDeceasedBody, { name: fullName, age, days: daysUntil })
        : format(copy.birthdayUpcomingBody, { name: fullName, age, days: daysUntil })
      : isDeceased
        ? format(copy.birthdayDeceasedBody, { name: fullName, year, age })
        : format(copy.birthdayBody, { name: fullName, year, age });

  return {
    notification: {
      type: 'birthday',
      source: 'heritage',
      title: kind === 'upcoming' ? copy.birthdayUpcomingTitle : copy.birthdayTitle,
      body,
      personId,
      dedupeKey: `birthday:${personId}:${kind}:${dedupeDate}`,
      expiresAt: kind === 'upcoming' ? endOfIsoDay(eventDateIso) : undefined,
    },
  };
};

export const createIntegrityNotificationSpec = (params: {
  isRtl: boolean;
  today: string;
  missingCount: number;
}): NotificationDeliverySpec => {
  const { isRtl, today, missingCount } = params;
  const copy = getNotificationCopy(isRtl);
  return {
    notification: {
      type: 'integrity',
      source: 'integrity',
      title: copy.integrityTitle,
      body: format(copy.integrityBody, { count: missingCount }),
      dedupeKey: `integrity:${today}:${missingCount}`,
      expiresAt: endOfTodayIso(),
    },
  };
};

export const createPendingInvitationNotificationSpec = (params: {
  isRtl: boolean;
  invitationId: string;
  treeId: string;
  ownerUid: string;
  role: 'editor' | 'viewer';
  status: 'pending';
  source: 'invitation-hydration' | 'invitation-realtime';
  expiresAt?: string;
}): NotificationDeliverySpec => {
  const { isRtl, invitationId, treeId, ownerUid, role, status, source, expiresAt } = params;
  const copy = getNotificationCopy(isRtl);
  return {
    notification: {
      type: 'invitation',
      source,
      title: copy.invitationTitle,
      body: format(copy.invitationBody, {
        role: isRtl ? (role === 'editor' ? 'محرر' : 'مشاهد') : role,
      }),
      dedupeKey: `invitation:${invitationId}:pending`,
      actionable: true,
      invitationId,
      invitationTreeId: treeId,
      invitationOwnerUid: ownerUid,
      invitationRole: role,
      invitationStatus: status,
      expiresAt,
    },
    toast:
      source === 'invitation-realtime'
        ? {
            kind: 'success',
            message: copy.invitationToast,
            duration: 5000,
          }
        : undefined,
  };
};

export const createAcceptedSelfNotificationSpec = (params: {
  isRtl: boolean;
  invitationId: string;
}): NotificationDeliverySpec => {
  const { isRtl, invitationId } = params;
  const copy = getNotificationCopy(isRtl);
  return {
    notification: {
      type: 'info',
      source: 'invitation-realtime',
      title: copy.invitationAcceptedTitle,
      body: copy.invitationAcceptedBody,
      dedupeKey: `invitation:${invitationId}:accepted-self`,
      expiresAt: addHoursIso(72),
    },
  };
};

export const createOwnerInvitationOutcomeNotificationSpec = (params: {
  isRtl: boolean;
  invitationId: string;
  invitedEmail: string;
  role: 'editor' | 'viewer';
  status: 'accepted' | 'declined';
  source: 'owner-realtime' | 'activity-log';
}): NotificationDeliverySpec => {
  const { isRtl, invitationId, invitedEmail, role, status, source } = params;
  const copy = getNotificationCopy(isRtl);
  return {
    notification: {
      type: 'info',
      source,
      title:
        status === 'accepted'
          ? copy.invitationAcceptedTitle
          : copy.invitationDeclinedTitle,
      body:
        status === 'accepted'
          ? format(copy.ownerAcceptedBody, {
              email: invitedEmail,
              role: isRtl ? (role === 'editor' ? 'محرر' : 'مشاهد') : role,
            })
          : format(copy.ownerDeclinedBody, { email: invitedEmail }),
      dedupeKey: `owner-invitation:${invitationId}:${status}`,
      invitationId,
      invitationStatus: status,
      invitationRole: role,
      expiresAt: addHoursIso(168),
    },
  };
};
