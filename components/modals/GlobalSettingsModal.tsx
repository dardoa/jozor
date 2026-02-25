import React, { useState, useRef, useEffect } from 'react';
import {
    X, User, Settings, ShieldAlert, Camera, Loader2,
    Trash2, Moon, Sun, Languages, RotateCcw, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { SupabaseStorageService } from '../../services/SupabaseStorageService';
import { updateUserProfile } from '../../services/supabaseTreeService';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';

interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'profile' | 'preferences' | 'security';

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose }) => {
    const { t, language, setLanguage } = useTranslation();
    const user = useAppStore((state) => state.user);
    const darkMode = useAppStore((state) => state.darkMode);
    const setDarkMode = useAppStore((state) => state.setDarkMode);
    const updateTourStatus = useAppStore((state) => state.updateTourStatus);
    const logout = useAppStore((state) => state.logout);

    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTourConfirm, setShowTourConfirm] = useState(false);
    const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) setDisplayName(user.displayName);
    }, [user]);

    if (!isOpen || !user) return null;

    const handleAvatarClick = () => fileInputRef.current?.click();

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const publicUrl = await SupabaseStorageService.uploadUserAvatar(user.uid, user.email, file, user.supabaseToken);

            // Update local state and backend
            const updatedUser = { ...user, photoURL: publicUrl };
            useAppStore.setState({ user: updatedUser });
            await updateUserProfile(user.uid, user.email, { photoURL: publicUrl }, user.supabaseToken);
            toast.success(t.avatarUpdateSuccess);
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            toast.error(language === 'ar' ? 'فشل تحديث الصورة' : 'Failed to update avatar');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const updatedUser = { ...user, displayName };
            useAppStore.setState({ user: updatedUser });
            await updateUserProfile(user.uid, user.email, { displayName }, user.supabaseToken);
            toast.success(t.preferencesSaveSuccess);
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast.error(language === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleTheme = () => {
        const nextMode = !darkMode;
        setDarkMode(nextMode);
        // Explicitly update profile in Supabase for persistence across devices
        updateUserProfile(user.uid, user.email, { metadata: { ...user.metadata, dark_mode: nextMode } }, user.supabaseToken);
    };

    const handleResetTour = () => {
        updateTourStatus(false);
        localStorage.removeItem('jozor_onboarding_completed');
        onClose();
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('start-onboarding-tour'));
        }, 300);
    };

    // Delete Account Logic
    const startDeleteHold = () => {
        setDeleteProgress(0);
        const step = 20; // ms
        const duration = 5000;
        const increment = (step / duration) * 100;

        deleteTimerRef.current = setInterval(() => {
            setDeleteProgress(prev => {
                if (prev >= 100) {
                    clearInterval(deleteTimerRef.current!);
                    executeDelete();
                    return 100;
                }
                return prev + increment;
            });
        }, step);
    };

    const cancelDeleteHold = () => {
        if (deleteTimerRef.current) {
            clearInterval(deleteTimerRef.current);
            setDeleteProgress(0);
        }
    };

    const executeDelete = async () => {
        setIsDeleting(true);
        try {
            // 1. Delete all storage
            await SupabaseStorageService.deleteUserStorage(user.uid, user.email, user.supabaseToken);

            // 2. Trigger cascade delete in backend
            const { deleteUserAccount } = await import('../../services/supabaseTreeService');
            await deleteUserAccount(user.uid, user.email, user.supabaseToken);

            // 3. Logout
            await logout();
            onClose();
            toast.success(language === 'ar' ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
        } catch (error) {
            console.error('Delete failed:', error);
            setIsDeleting(false);
            toast.error(language === 'ar' ? 'فشل حذف الحساب' : 'Failed to delete account');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[var(--theme-bg)]/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-xl text-blue-500">
                            <Settings className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-main)]">
                            {language === 'ar' ? 'الإعدادات العامة' : 'Global Settings'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-[var(--text-dim)]">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex px-6 border-b border-white/5 bg-black/5">
                    {[
                        { id: 'profile', icon: User, label: language === 'ar' ? 'الملف الشخصي' : 'Profile' },
                        { id: 'preferences', icon: Settings, label: language === 'ar' ? 'التفضيلات' : 'Preferences' },
                        { id: 'security', icon: ShieldAlert, label: language === 'ar' ? 'الأمان' : 'Security' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'profile' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col items-center gap-4">
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={handleAvatarClick}
                                >
                                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/10 shadow-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-[var(--text-dim)]" />
                                        )}

                                        {/* Upload Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white text-xs font-bold">
                                            <Camera className="w-6 h-6" />
                                            <span>{language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}</span>
                                        </div>

                                        {/* Progress Indicator */}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={onFileChange}
                                    />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-[var(--text-main)]">{user.displayName}</h3>
                                    <p className="text-xs text-[var(--text-dim)]">{user.email}</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <FormField
                                    label={language === 'ar' ? 'اسم العرض' : 'Display Name'}
                                    value={displayName}
                                    onCommit={setDisplayName}
                                />
                                <Button
                                    className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 font-bold"
                                    onClick={handleSaveProfile}
                                    isLoading={isSaving}
                                >
                                    {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {/* Theme Toggle */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-[var(--text-main)]">
                                            {language === 'ar' ? 'المظهر' : 'Appearance'}
                                        </h4>
                                        <p className="text-[10px] text-[var(--text-dim)]">
                                            {darkMode ? (language === 'ar' ? 'الوضع الليلي' : 'Dark Mode') : (language === 'ar' ? 'الوضع النهاري' : 'Light Mode')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggleTheme}
                                    className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-blue-500' : 'bg-stone-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${darkMode ? 'right-1' : 'right-7'}`} />
                                </button>
                            </div>

                            {/* Language Selector */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                        <Languages className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-[var(--text-main)]">
                                            {language === 'ar' ? 'اللغة' : 'Language'}
                                        </h4>
                                        <p className="text-[10px] text-[var(--text-dim)]">
                                            {language === 'en' ? 'English' : 'العربية'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${language === 'en' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'border-white/10 text-[var(--text-dim)]'}`}
                                    >
                                        EN
                                    </button>
                                    <button
                                        onClick={() => setLanguage('ar')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${language === 'ar' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'border-white/10 text-[var(--text-dim)]'}`}
                                    >
                                        AR
                                    </button>
                                </div>
                            </div>

                            {/* Reset Tour */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                        <RotateCcw className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-[var(--text-main)]">
                                            {language === 'ar' ? 'الجولة الإرشادية' : 'Interactive Tour'}
                                        </h4>
                                        <p className="text-[10px] text-[var(--text-dim)]">
                                            {language === 'ar' ? 'إعادة تشغيل الجولة التعليمية' : 'Restart the onboarding guide'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="rounded-xl font-bold"
                                    onClick={() => setShowTourConfirm(true)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Check className="w-3 h-3" />
                                        {language === 'ar' ? 'إعادة' : 'Reset'}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {!showDeleteConfirm ? (
                                <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 space-y-4">
                                    <div className="flex items-center gap-3 text-red-500">
                                        <ShieldAlert className="w-6 h-6" />
                                        <h4 className="font-bold">{t.deleteAccountPermanentTitle}</h4>
                                    </div>
                                    <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                                        {t.deleteAccountPermanentBody}
                                    </p>
                                    <Button
                                        variant="danger"
                                        className="w-full h-12 rounded-2xl font-bold"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        {language === 'ar' ? 'بدء إجراء الحذف' : 'Start Deletion Process'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 space-y-4 animate-in zoom-in-95 duration-200">
                                    <div className="text-center space-y-2">
                                        <h4 className="text-lg font-bold text-red-500">{t.deleteAccountPermanentTitle}</h4>
                                        <p className="text-xs text-[var(--text-dim)]">
                                            {language === 'ar' ? 'اضغط مع الاستمرار على الزر أدناه لمدة 5 ثوانٍ للتأكيد.' : 'Hold the button below for 5 seconds to confirm.'}
                                        </p>
                                    </div>

                                    <div className="pt-4 space-y-3">
                                        <button
                                            onMouseDown={startDeleteHold}
                                            onMouseUp={cancelDeleteHold}
                                            onMouseLeave={cancelDeleteHold}
                                            onTouchStart={startDeleteHold}
                                            onTouchEnd={cancelDeleteHold}
                                            disabled={isDeleting}
                                            className="w-full h-16 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 relative overflow-hidden group bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white"
                                        >
                                            {/* Gradient Progress Overlay */}
                                            <div
                                                className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-90 transition-all duration-100 ease-linear pointer-events-none"
                                                style={{
                                                    width: `${deleteProgress}%`,
                                                    left: language === 'ar' ? 'auto' : 0,
                                                    right: language === 'ar' ? 0 : 'auto'
                                                }}
                                            />

                                            <span className="relative z-10 flex items-center gap-3">
                                                {isDeleting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-5 h-5 transition-transform group-active:scale-110" />
                                                        {t.deleteAccountAction}
                                                    </>
                                                )}
                                            </span>
                                        </button>

                                        <Button
                                            variant="ghost"
                                            className="w-full h-12 rounded-2xl font-bold text-[var(--text-dim)] hover:text-[var(--text-main)]"
                                            onClick={() => {
                                                setShowDeleteConfirm(false);
                                                setDeleteProgress(0);
                                            }}
                                            disabled={isDeleting}
                                        >
                                            {t.deleteAccountCancel}
                                        </Button>

                                        <p className="text-[10px] text-center text-red-400/80 font-medium italic">
                                            {language === 'ar'
                                                ? '* سيتم حذف جميع الأشجار والملفات المرفوعة نهائياً.'
                                                : '* All owned trees and uploaded media will be destroyed permanently.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/10 flex justify-between items-center text-[10px] text-[var(--text-dim)]">
                    <div>
                        Jozor 1.1 Gold Standard • {user.uid.slice(0, 8)}
                    </div>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-blue-400 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-blue-400 transition-colors">Terms</a>
                    </div>
                </div>
            </div>

            {/* Tour Confirmation Overlay */}
            {showTourConfirm && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[var(--theme-bg)] border border-white/10 rounded-3xl shadow-2xl p-8 max-w-sm text-center space-y-6">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
                            <RotateCcw className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-bold text-[var(--text-main)]">
                                {language === 'ar' ? 'إعادة الجولة' : 'Restart Tour'}
                            </h4>
                            <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                                {t.tourRestartBody}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1 rounded-xl font-bold"
                                onClick={() => setShowTourConfirm(false)}
                            >
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </Button>
                            <Button
                                className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 font-bold"
                                onClick={handleResetTour}
                            >
                                {language === 'ar' ? 'نعم، ابدأ' : 'Yes, Start'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalSettingsModal;
