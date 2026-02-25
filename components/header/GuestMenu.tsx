import { memo } from 'react';
import { ThemeLanguageProps } from '../../types';
import { Languages, Moon, Sun, LogIn } from 'lucide-react';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider } from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';

interface GuestMenuProps {
    themeLanguage: ThemeLanguageProps;
    onLogin: () => Promise<void>;
    onClose?: () => void;
}

export const GuestMenu = memo(({ themeLanguage, onLogin, onClose }: GuestMenuProps) => {
    const { t } = useTranslation();

    return (
        <DropdownContent className='w-56' onClose={onClose}>
            <div className='px-4 py-2 border-b border-[var(--border-main)] bg-[var(--theme-bg)]/50 rounded-t-2xl'>
                <p className='text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest'>
                    {t.settings || 'Settings'}
                </p>
            </div>

            <div className='p-1'>
                <DropdownMenuItem
                    onClick={() => {
                        const newLanguage = themeLanguage.language === 'en' ? 'ar' : 'en';
                        themeLanguage.setLanguage(newLanguage);
                    }}
                    icon={<Languages className='w-4 h-4' />}
                    label={themeLanguage.language === 'en' ? t.switchToArabic : t.switchToEnglish}
                    rightElement={
                        <span className='text-[10px] font-bold bg-[var(--theme-bg)] text-[var(--text-main)] px-1.5 py-0.5 rounded'>
                            {themeLanguage.language === 'en' ? 'AR' : 'EN'}
                        </span>
                    }
                />

                <DropdownMenuItem
                    onClick={() => themeLanguage.setDarkMode(!themeLanguage.darkMode)}
                    icon={themeLanguage.darkMode ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
                    label={themeLanguage.darkMode ? t.switchToLightMode : t.switchToDarkMode}
                />
            </div>

            <DropdownMenuDivider />

            <div className='p-1'>
                <button
                    onClick={() => {
                        onLogin();
                        onClose?.();
                    }}
                    className='w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--primary-600)] hover:bg-[var(--primary-600)]/5'
                >
                    <LogIn className='w-4 h-4' />
                    <span>{t.signIn}</span>
                </button>
            </div>
        </DropdownContent>
    );
});
