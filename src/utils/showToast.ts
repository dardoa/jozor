import { useAppStore } from '../store/useAppStore';
import { toast, type ExternalToast } from 'sonner';
import type { EnglishTranslation } from './translations/en';

type Paths<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string
        ? T[K] extends string
          ? K
          : `${K}.${Paths<T[K]>}`
        : never;
    }[keyof T]
  : never;

export type TranslationKey = Paths<EnglishTranslation>;

export interface ToastOptions extends ExternalToast {
  variables?: Record<string, string | number>;
}

type ToastLocale = 'ar' | 'en';
type ToastDictionary = Partial<Record<TranslationKey, string>>;

const TOAST_TRANSLATIONS: Record<ToastLocale, ToastDictionary> = {
  en: {
    'messages.success.importSuccess': 'Import successful',
    'messages.success.importError': 'Import failed',
    'messages.success.snapshot': 'Snapshot created',
    'messages.success.restore': 'Snapshot restored',
    'messages.success.deleteSuccess': 'Deleted successfully',
    'messages.success.rename': 'Name updated successfully',
    'messages.success.load': 'Tree loaded successfully',
    'messages.success.delete': 'Tree deleted successfully',
    'messages.success.invite': 'Invited {email}',
    'messages.success.role': 'Role updated',
    'messages.success.personLinked': 'Person linked successfully.',
    'messages.success.personAdded': 'Person added successfully.',
    'messages.success.revoke': 'Access revoked',
    'messages.success.copy': 'Link copied to clipboard',
    'messages.success.uploadSuccess': 'Uploaded successfully',
    'messages.success.sourceAdded': 'Source added successfully',
    'messages.success.sourceRemoved': 'Source removed successfully',
    'messages.success.eventAdded': 'Event added successfully',
    'messages.success.eventRemoved': 'Event removed successfully',
    'messages.error.load': 'Failed to load trees',
    'messages.error.open': 'Failed to open tree',
    'messages.error.rename': 'Rename failed',
    'messages.error.delete': 'Delete failed',
    'messages.error.invite': 'Failed to invite',
    'messages.error.role': 'Failed to update role',
    'messages.error.revoke': 'Failed to revoke access',
    'messages.error.collaborators': 'Failed to load collaborators',
    'messages.error.sharing': 'Failed to update sharing',
    'messages.error.extract': 'Failed to extract data',
    'messages.error.bio': 'Failed to generate bio',
    'messages.error.snapshot': 'Failed to create snapshot',
    'messages.error.map': 'Failed to capture map',
    'messages.error.import': 'Failed to import file',
    'messages.loading.load': 'Loading...',
    'messages.loading.open': 'Opening tree...',
    'messages.loading.rename': 'Renaming...',
    'messages.loading.delete': 'Deleting...',
    'messages.loading.invite': 'Sending invite...',
    'messages.loading.role': 'Updating...',
    'messages.loading.import': 'Importing...',
    'messages.loading.save': 'Saving...',
    'activityDrawer.loadError': 'Failed to load activity history.',
    'adminHub.treeSettings.deleteSuccess': 'Tree deleted successfully.',
    'adminHub.treeSettings.deleteError': 'Failed to delete the tree. Please try again.',
    'globalSettings.profile.avatarUpdateSuccess': 'Avatar updated successfully',
    'globalSettings.profile.avatarUpdateError': 'Failed to update avatar',
    'globalSettings.profile.saveChangesError': 'Failed to save changes',
    'globalSettings.security.deleteSuccess': 'Account deleted successfully',
    'globalSettings.security.deleteError': 'Failed to delete account',
    extractSuccess: 'Data extracted successfully!',
    extractError: 'Failed to extract data.',
    photoRemoved: 'Profile photo removed.',
    vaultShareLinkCopied: 'Share link copied.',
    googleDriveFileNameRequired: 'Backup name is required.',
    noActiveTree: 'No active tree is selected.',
    loginRequired: 'Login required',
    demoModeNote: 'Demo Mode active',
  },
  ar: {
    'messages.success.importSuccess': 'تم الاستيراد بنجاح',
    'messages.success.importError': 'فشل الاستيراد',
    'messages.success.snapshot': 'تم حفظ نسخة',
    'messages.success.restore': 'تم استعادة النسخة',
    'messages.success.deleteSuccess': 'تم الحذف بنجاح',
    'messages.success.rename': 'تم تحديث الاسم بنجاح',
    'messages.success.load': 'تم تحميل الشجرة بنجاح',
    'messages.success.delete': 'تم حذف الشجرة بنجاح',
    'messages.success.invite': 'تمت دعوة {email}',
    'messages.success.role': 'تم تحديث الصلاحية',
    'messages.success.personLinked': 'تم ربط الفرد بنجاح.',
    'messages.success.personAdded': 'تمت إضافة الفرد بنجاح.',
    'messages.success.revoke': 'تم إلغاء صلاحية الوصول',
    'messages.success.copy': 'تم نسخ الرابط للحافظة',
    'messages.success.uploadSuccess': 'تم الرفع بنجاح',
    'messages.success.sourceAdded': 'تمت إضافة المصدر بنجاح',
    'messages.success.sourceRemoved': 'تم حذف المصدر بنجاح',
    'messages.success.eventAdded': 'تمت إضافة الحدث بنجاح',
    'messages.success.eventRemoved': 'تم حذف الحدث بنجاح',
    'messages.error.load': 'فشل تحميل الأشجار',
    'messages.error.open': 'فشل فتح الشجرة',
    'messages.error.rename': 'فشلت إعادة التسمية',
    'messages.error.delete': 'فشل الحذف',
    'messages.error.invite': 'فشلت الدعوة',
    'messages.error.role': 'فشل تحديث الصلاحية',
    'messages.error.revoke': 'فشل إلغاء الوصول',
    'messages.error.collaborators': 'فشل تحميل المتعاونين',
    'messages.error.sharing': 'فشل تحديث المشاركة',
    'messages.error.extract': 'فشل استخراج البيانات',
    'messages.error.bio': 'فشل إنشاء السيرة الذاتية',
    'messages.error.snapshot': 'فشل إنشاء لقطة',
    'messages.error.map': 'فشل التقاط الخريطة',
    'messages.error.import': 'فشل استيراد الملف',
    'messages.loading.load': 'جاري التحميل...',
    'messages.loading.open': 'جاري فتح الشجرة...',
    'messages.loading.rename': 'جاري إعادة التسمية...',
    'messages.loading.delete': 'جاري الحذف...',
    'messages.loading.invite': 'جاري إرسال الدعوة...',
    'messages.loading.role': 'جاري التحديث...',
    'messages.loading.import': 'جاري الاستيراد...',
    'messages.loading.save': 'جاري الحفظ...',
    'activityDrawer.loadError': 'تعذر تحميل سجل النشاط.',
    'adminHub.treeSettings.deleteSuccess': 'تم حذف الشجرة بنجاح.',
    'adminHub.treeSettings.deleteError': 'تعذر حذف الشجرة. حاول مرة أخرى.',
    'globalSettings.profile.avatarUpdateSuccess': 'تم تحديث الصورة بنجاح',
    'globalSettings.profile.avatarUpdateError': 'فشل تحديث الصورة',
    'globalSettings.profile.saveChangesError': 'فشل حفظ التغييرات',
    'globalSettings.security.deleteSuccess': 'تم حذف الحساب بنجاح',
    'globalSettings.security.deleteError': 'فشل حذف الحساب',
    extractSuccess: 'تم استخراج البيانات بنجاح!',
    extractError: 'فشل استخراج البيانات.',
    photoRemoved: 'تم حذف صورة الملف الشخصي.',
    vaultShareLinkCopied: 'تم نسخ رابط المشاركة.',
    googleDriveFileNameRequired: 'اسم النسخة مطلوب.',
    noActiveTree: 'لم يتم اختيار شجرة نشطة.',
    loginRequired: 'تسجيل الدخول مطلوب',
    demoModeNote: 'وضع التجربة نشط',
  },
};

const interpolate = (text: string, variables?: Record<string, string | number>) => {
  if (!variables) return text;
  return Object.entries(variables).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    text
  );
};

const resolveMessage = (keyOrMessage: string, options?: ToastOptions) => {
  const lang: ToastLocale = useAppStore.getState().language === 'ar' ? 'ar' : 'en';
  const translationKey = keyOrMessage as TranslationKey;
  const translated = TOAST_TRANSLATIONS[lang][translationKey] ?? TOAST_TRANSLATIONS.en[translationKey];
  return interpolate(translated ?? keyOrMessage, options?.variables);
};

export const showToast = {
  success: (key: TranslationKey | Omit<string, TranslationKey>, options?: ToastOptions) => {
    toast.success(resolveMessage(key as string, options), options);
  },
  error: (key: TranslationKey | Omit<string, TranslationKey>, options?: ToastOptions) => {
    toast.error(resolveMessage(key as string, options), options);
  },
  info: (key: TranslationKey | Omit<string, TranslationKey>, options?: ToastOptions) => {
    toast.info(resolveMessage(key as string, options), options);
  },
  warning: (key: TranslationKey | Omit<string, TranslationKey>, options?: ToastOptions) => {
    toast.warning(resolveMessage(key as string, options), options);
  },
  loading: (key: TranslationKey | Omit<string, TranslationKey>, options?: ToastOptions) => {
    return toast.loading(resolveMessage(key as string, options), options);
  },
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    params: {
      loading: TranslationKey | Omit<string, TranslationKey>;
      success: TranslationKey | Omit<string, TranslationKey> | ((data: T) => string);
      error: TranslationKey | Omit<string, TranslationKey> | ((error: any) => string);
      options?: ToastOptions;
    }
  ) => {
    return toast.promise(promise, {
      loading: resolveMessage(params.loading as string, params.options),
      success: (data) => {
        if (typeof params.success === 'function') {
           return params.success(data);
        }
        return resolveMessage(params.success as string, params.options);
      },
      error: (err) => {
        if (typeof params.error === 'function') {
           return params.error(err);
        }
        return resolveMessage(params.error as string, params.options);
      },
      ...params.options,
    });
  },
  dismiss: (id?: string | number) => toast.dismiss(id),
};
