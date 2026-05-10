import type { Language } from '../types';
import { notifications as enNotifications } from './translations/en/notifications';
import { notifications as arNotifications } from './translations/ar/notifications';

const notificationTranslations = {
  en: enNotifications,
  ar: arNotifications,
};

export const getNotificationTranslation = (language: Language) =>
  notificationTranslations[language] || notificationTranslations.en;
