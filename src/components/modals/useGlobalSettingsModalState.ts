import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { showToast } from '../../utils/showToast';

import { EMPTY_STRING } from '../../constants';
import { useTranslation } from '../../context/TranslationContext';
import { deleteUserAccount, updateUserProfile } from '../../services/supabaseProfileService';
import { useAppStore } from '../../store/useAppStore';

export type GlobalSettingsTab = 'profile' | 'preferences' | 'security';

export const useGlobalSettingsModalState = (onClose: () => void) => {
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
  const [showTourConfirm, setShowTourConfirm] = useState(false);

  const deleteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!user) return;

    setIsDeleting(true);
    try {
      await deleteUserAccount(user.uid, user.email, user.supabaseToken);
      await logout();
      onClose();
      showToast.success('globalSettings.security.deleteSuccess');
    } catch (error) {
      console.error('Delete failed:', error);
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
      showToast.error('globalSettings.security.deleteError');
    }
  };

  const startDeleteHold = () => {
    if (deleteTimerRef.current) {
      clearInterval(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    setDeleteProgress(0);
    const step = 20;
    const duration = 5000;
    const increment = (step / duration) * 100;

    deleteTimerRef.current = setInterval(() => {
      setDeleteProgress((previous) => {
        if (previous >= 100) {
          if (deleteTimerRef.current) clearInterval(deleteTimerRef.current);
          void executeDelete();
          return 100;
        }
        return previous + increment;
      });
    }, step);
  };

  const cancelDeleteHold = () => {
    if (deleteTimerRef.current) {
      clearInterval(deleteTimerRef.current);
      deleteTimerRef.current = null;
      setDeleteProgress(0);
    }
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
