import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { showToast } from '../../utils/showToast';

import { EMPTY_STRING } from '../../constants';
import { useTranslation } from '../../context/TranslationContext';
import { AccountDeletionCheckoutError, AccountDeletionRetainedFilesError, AccountDeletionSubscriptionError, deleteUserAccount, updateUserProfile } from '../../services/supabaseProfileService';
import { useAppStore } from '../../store/useAppStore';

export type GlobalSettingsTab = 'profile' | 'preferences' | 'security';

export const useGlobalSettingsModalState = (onClose: () => void, isOpen = true) => {
  const { t, language, setLanguage } = useTranslation();
  const user = useAppStore((state) => state.user);
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);
  const updateTourStatus = useAppStore((state) => state.updateTourStatus);
  const logout = useAppStore((state) => state.logout);
  const isLowGraphicsMode = useAppStore((state) => state.isLowGraphicsMode);
  const setIsLowGraphicsMode = useAppStore((state) => state.setIsLowGraphicsMode);

  const [activeTab, setActiveTab] = useState<GlobalSettingsTab>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || EMPTY_STRING);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletionBillingBlocked, setIsDeletionBillingBlocked] = useState(false);
  const [isDeletionCheckoutBlocked, setIsDeletionCheckoutBlocked] = useState(false);
  const [showTourConfirm, setShowTourConfirm] = useState(false);

  const deleteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deleteInFlightRef = useRef(false);
  const resetTourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cancelDeleteHold = useCallback(() => {
    if (deleteTimerRef.current !== null) {
      clearInterval(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setDeleteProgress(0);
  }, []);

  useEffect(() => {
    cancelDeleteHold();
  }, [activeTab, showDeleteConfirm, isOpen, user?.uid, cancelDeleteHold]);

  useEffect(() => {
    setIsDeletionBillingBlocked(false);
    setIsDeletionCheckoutBlocked(false);
  }, [showDeleteConfirm, isOpen, user?.uid]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) cancelDeleteHold();
    };
    window.addEventListener('blur', cancelDeleteHold);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', cancelDeleteHold);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [cancelDeleteHold]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user]);

  useEffect(() => () => {
    if (deleteTimerRef.current) clearInterval(deleteTimerRef.current);
    if (resetTourTimerRef.current) clearTimeout(resetTourTimerRef.current);
  }, []);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const { SupabaseStorageService } = await import('../../services/supabaseStorageService');
      const uploadResult = await SupabaseStorageService.uploadUserAvatar(user.uid, user.email, file, user.supabaseToken, user.photoVersion);
      
      const userUpdate = { 
        photoURL: uploadResult.publicUrl,
        photoPath: uploadResult.photoPath,
        photoVersion: uploadResult.photoVersion
      };

      if (!isMountedRef.current) return;

      useAppStore.setState({ user: { ...user, ...userUpdate } });
      await updateUserProfile(user.uid, user.email, userUpdate, user.supabaseToken);
      if (!isMountedRef.current) return;

      showToast.success('globalSettings.profile.avatarUpdateSuccess');
    } catch (error) {
      if (!isMountedRef.current) return;

      console.error('Failed to upload avatar:', error);
      showToast.error('globalSettings.profile.avatarUpdateError');
    } finally {
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      useAppStore.setState({ user: { ...user, displayName } });
      await updateUserProfile(user.uid, user.email, { displayName }, user.supabaseToken);
      if (!isMountedRef.current) return;

      showToast.success('preferencesSaveSuccess');
    } catch (error) {
      if (!isMountedRef.current) return;

      console.error('Failed to update profile:', error);
      showToast.error('globalSettings.profile.saveChangesError');
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleToggleTheme = () => {
    if (!user) return;

    const nextMode = !darkMode;
    setDarkMode(nextMode);
    void updateUserProfile(user.uid, user.email, { metadata: { ...user.metadata, dark_mode: nextMode } }, user.supabaseToken);
  };

  const handleResetTour = () => {
    updateTourStatus(false);
    localStorage.removeItem('jozor_onboarding_completed');
    onClose();
    resetTourTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('start-onboarding-tour'));
      resetTourTimerRef.current = null;
    }, 300);
  };

  const executeDelete = async () => {
    if (!user || deleteInFlightRef.current) return;

    deleteInFlightRef.current = true;
    setIsDeleting(true);
    setIsDeletionBillingBlocked(false);
    try {
      const deletionStatus = await deleteUserAccount(user.uid, user.email, user.supabaseToken);
      await logout({ accountDeleted: true });
      onClose();
      showToast.success(deletionStatus === 'pending' ? 'globalSettings.security.deletePending' : 'globalSettings.security.deleteSuccess');
    } catch (error) {
      if (error instanceof AccountDeletionSubscriptionError) {
        if (isMountedRef.current) {
          cancelDeleteHold();
          setIsDeleting(false);
          setIsDeletionBillingBlocked(true);
          setIsDeletionCheckoutBlocked(error instanceof AccountDeletionCheckoutError);
        }
        return;
      }
      console.error('Delete failed:', error);
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
      showToast.error(error instanceof AccountDeletionRetainedFilesError ? 'globalSettings.security.retainedUploads' : 'globalSettings.security.deleteError');
    } finally {
      deleteInFlightRef.current = false;
    }
  };

  const openSubscriptionManagement = () => {
    if (deleteInFlightRef.current) return;
    cancelDeleteHold();
    onClose();
    window.dispatchEvent(new CustomEvent('open-paywall'));
  };

  const startDeleteHold = () => {
    if (!user || !isOpen || activeTab !== 'security' || !showDeleteConfirm
      || deleteInFlightRef.current || isDeleting) return;

    cancelDeleteHold();
    const duration = 5000;
    const startedAt = Date.now();

    deleteTimerRef.current = setInterval(() => {
      const progress = Math.min(100, ((Date.now() - startedAt) / duration) * 100);
      setDeleteProgress(progress);
      if (progress >= 100) {
        if (deleteTimerRef.current !== null) clearInterval(deleteTimerRef.current);
        deleteTimerRef.current = null;
        // React may replay state updaters; destructive work must run outside them.
        void executeDelete();
      }
    }, 20);
  };

  return {
    t,
    language,
    setLanguage,
    user,
    darkMode,
    activeTab,
    setActiveTab,
    displayName,
    setDisplayName,
    isUploading,
    isSaving,
    deleteProgress,
    setDeleteProgress,
    isDeleting,
    isDeletionBillingBlocked,
    isDeletionCheckoutBlocked,
    openSubscriptionManagement,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showTourConfirm,
    setShowTourConfirm,
    fileInputRef,
    isLowGraphicsMode,
    setIsLowGraphicsMode,
    handleAvatarClick,
    onFileChange,
    handleSaveProfile,
    handleToggleTheme,
    handleResetTour,
    startDeleteHold,
    cancelDeleteHold,
  };
};

export type GlobalSettingsModalState = ReturnType<typeof useGlobalSettingsModalState>;
