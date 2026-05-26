
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { showInfoMock, showSuccessMock } = vi.hoisted(() => ({
  showInfoMock: vi.fn(),
  showSuccessMock: vi.fn(),
}));

vi.mock('../../utils/showToast', () => ({
  showToast: {
    info: (...args: unknown[]) => showInfoMock(...args),
    success: (...args: unknown[]) => showSuccessMock(...args),
  },
}));

import {
  createBirthdayNotificationSpec,
  createIntegrityNotificationSpec,
  createPendingInvitationNotificationSpec,
  deliverNotificationWithPolicy,
} from '../notificationPolicyService';

describe('notificationPolicyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps birthday reminders in the notification center only', () => {
    const addNotification = vi.fn();
    const spec = createBirthdayNotificationSpec({
      isRtl: false,
      personId: 'person-1',
      fullName: 'Mona Ali',
      year: 1980,
      age: 46,
      kind: 'today',
      daysUntil: 0,
      isDeceased: false,
      dedupeDate: '2026-03-27',
      eventDateIso: '2026-03-27',
    });

    deliverNotificationWithPolicy(addNotification, spec);

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'birthday',
        source: 'heritage',
      })
    );
    expect(showInfoMock).not.toHaveBeenCalled();
    expect(showSuccessMock).not.toHaveBeenCalled();
  });

  it('uses a commemorative tone for deceased anniversaries', () => {
    const spec = createBirthdayNotificationSpec({
      isRtl: false,
      personId: 'person-2',
      fullName: 'Hassan Ali',
      year: 1940,
      age: 86,
      kind: 'today',
      daysUntil: 0,
      isDeceased: true,
      dedupeDate: '2026-03-27',
      eventDateIso: '2026-03-27',
    });

    expect(spec.notification.title).toBe('Birth Anniversary');
    expect(spec.notification.body).toContain('would have turned 86');
  });

  it('supports upcoming birthday copy without toasts', () => {
    const addNotification = vi.fn();
    const spec = createBirthdayNotificationSpec({
      isRtl: false,
      personId: 'person-3',
      fullName: 'Lina Ali',
      year: 2010,
      age: 16,
      kind: 'upcoming',
      daysUntil: 2,
      isDeceased: false,
      dedupeDate: '2026-03-27',
      eventDateIso: '2026-03-29',
    });

    deliverNotificationWithPolicy(addNotification, spec);

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upcoming Birth Anniversary',
        body: expect.stringContaining('In 2 day(s)'),
      })
    );
    expect(showInfoMock).not.toHaveBeenCalled();
    expect(showSuccessMock).not.toHaveBeenCalled();
  });

  it('keeps integrity reminders in the notification center only', () => {
    const addNotification = vi.fn();
    const spec = createIntegrityNotificationSpec({
      isRtl: false,
      today: '2026-03-27',
      missingCount: 3,
    });

    deliverNotificationWithPolicy(addNotification, spec);

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'integrity',
        source: 'integrity',
      })
    );
    expect(showInfoMock).not.toHaveBeenCalled();
    expect(showSuccessMock).not.toHaveBeenCalled();
  });

  it('sends realtime invitations to both the center and a toast', () => {
    const addNotification = vi.fn();
    const spec = createPendingInvitationNotificationSpec({
      isRtl: false,
      invitationId: 'inv-1',
      treeId: 'tree-1',
      ownerUid: 'owner-1',
      role: 'viewer',
      status: 'pending',
      source: 'invitation-realtime',
    });

    deliverNotificationWithPolicy(addNotification, spec);

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'invitation',
        source: 'invitation-realtime',
        actionable: true,
      })
    );
    expect(showSuccessMock).toHaveBeenCalledWith('You received a new in-app invitation.', {
      duration: 5000,
    });
  });

  it('keeps hydrated invitations in the notification center only', () => {
    const addNotification = vi.fn();
    const spec = createPendingInvitationNotificationSpec({
      isRtl: false,
      invitationId: 'inv-2',
      treeId: 'tree-2',
      ownerUid: 'owner-2',
      role: 'editor',
      status: 'pending',
      source: 'invitation-hydration',
    });

    deliverNotificationWithPolicy(addNotification, spec);

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'invitation-hydration',
      })
    );
    expect(showSuccessMock).not.toHaveBeenCalled();
    expect(showInfoMock).not.toHaveBeenCalled();
  });

  it('sends default toast specs through the info toast channel', () => {
    const addNotification = vi.fn();

    deliverNotificationWithPolicy(addNotification, {
      notification: {
        type: 'info',
        source: 'system',
        title: 'Heads up',
        body: 'A default toast was sent.',
      },
      toast: {
        message: 'Default toast',
        duration: 3000,
        icon: 'i',
        maxWidth: '320px',
        fontSize: '13px',
        fontWeight: '700',
      },
    });

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Heads up',
      })
    );
    expect(showInfoMock).toHaveBeenCalledWith('Default toast', {
      duration: 3000,
      icon: 'i',
      style: {
        maxWidth: '320px',
        fontSize: '13px',
        fontWeight: '700',
      },
    });
  });
});

