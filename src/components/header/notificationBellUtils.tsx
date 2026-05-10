import React from 'react';
import { Calendar, Info, MailCheck, MapPin } from 'lucide-react';
import type { AppNotification } from '../../types';

export const MAX_VISIBLE_NOTIFICATIONS = 5;

export const isPendingInvitation = (notification: AppNotification) =>
  notification.type === 'invitation' && notification.invitationStatus === 'pending';

export const isSafeToClearNotification = (notification: AppNotification) => {
  if (isPendingInvitation(notification)) {
    return false;
  }

  return notification.read || !notification.actionable;
};

export const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'birthday':
      return <Calendar className="h-4 w-4 text-amber-500" />;
    case 'integrity':
      return <MapPin className="h-4 w-4 text-indigo-500" />;
    case 'invitation':
      return <MailCheck className="h-4 w-4 text-emerald-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};
