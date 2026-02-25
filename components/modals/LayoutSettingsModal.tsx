import React, { memo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { shallow } from 'zustand/shallow'; // Not available in all versions, better to split manually

interface LayoutSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Local Dictionary
const LOCAL_LABELS = {
    en: {
        layoutSettings: 'Layout Settings',
        orientation: 'Orientation',
        vertical: 'Vertical',
        horizontal: 'Horizontal',
        spacing: 'Spacing',
        horizX: 'Horizontal (X)',
        vertY: 'Vertical (Y)',
        close: 'Close',
        closeAria: 'Close'
    },
    ar: {
        layoutSettings: 'إعدادات المخطط',
        orientation: 'الاتجاه',
        vertical: 'عمودي',
        horizontal: 'أفقي',
        spacing: 'المسافات',
        horizX: 'أفقي (س)',
        vertY: 'عمودي (ص)',
        close: 'إغلاق',
        closeAria: 'إغلاق'
    }
};

export const LayoutSettingsModal = memo(({ isOpen, onClose }: LayoutSettingsModalProps) => {
    // Get language
    const language = useAppStore((state) => state.language);
    const t = LOCAL_LABELS[(language || 'en') as 'en' | 'ar'] || LOCAL_LABELS.en;

    const treeSettings = useAppStore((state) => state.treeSettings);
    const setTreeSettings = useAppStore((state) => state.setTreeSettings);

    if (!treeSettings) return null;
    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
            <div
                className='bg-white dark:bg-stone-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-stone-200 dark:border-stone-800'
                role='dialog'
                aria-modal='true'
            >
                {/* Header */}
                <div className='flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50'>
                    <h2 className='font-semibold text-stone-800 dark:text-stone-100'>
                        {t.layoutSettings}
                    </h2>
                    <button
                        onClick={onClose}
                        className='p-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 transition-colors'
                        aria-label={t.closeAria}
                    >
                        ✕
                    </button>
                </div>

                <div className='p-6 space-y-6'>
                    {/* Orientation */}
                    <div className='space-y-4'>
                        <h3 className='text-sm font-medium text-stone-700 dark:text-stone-300'>{t.orientation}</h3>
                        <div className='grid grid-cols-2 gap-2'>
                            {(['vertical', 'horizontal'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setTreeSettings({ ...treeSettings, layoutMode: mode })}
                                    className={`flex items-center justify-center p-3 rounded-xl border transition-all ${treeSettings.layoutMode === mode
                                        ? 'bg-[var(--primary-600)] text-white border-transparent'
                                        : 'bg-transparent border-stone-200 dark:border-stone-700 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800'
                                        }`}
                                >
                                    <span className='text-xs font-semibold uppercase'>
                                        {mode === 'vertical' ? t.vertical : t.horizontal}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Spacing */}
                    <div className='space-y-4 pt-2'>
                        <h3 className='text-sm font-medium text-stone-700 dark:text-stone-300'>{t.spacing}</h3>

                        {/* Horizontal Spacing */}
                        <div className='bg-stone-50/50 dark:bg-stone-900/30 p-2 rounded-lg border border-transparent hover:border-stone-200 dark:hover:border-stone-800 transition-colors'>
                            <div className='flex items-center gap-3'>
                                <label className='w-24 text-xs text-stone-600 dark:text-stone-400 font-medium'>
                                    {t.horizX}
                                </label>
                                <input
                                    type='range'
                                    className='w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-600)]'
                                    value={treeSettings.nodeSpacingX}
                                    onChange={(e) => setTreeSettings({ ...treeSettings, nodeSpacingX: Number(e.target.value) })}
                                    min={20} max={200} step={10}
                                />
                                <span className='text-[10px] font-mono w-8 text-right'>{treeSettings.nodeSpacingX}px</span>
                            </div>
                        </div>

                        {/* Vertical Spacing */}
                        <div className='bg-stone-50/50 dark:bg-stone-900/30 p-2 rounded-lg border border-transparent hover:border-stone-200 dark:hover:border-stone-800 transition-colors'>
                            <div className='flex items-center gap-3'>
                                <label className='w-24 text-xs text-stone-600 dark:text-stone-400 font-medium'>
                                    {t.vertY}
                                </label>
                                <input
                                    type='range'
                                    className='w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[var(--primary-600)]'
                                    value={treeSettings.nodeSpacingY}
                                    onChange={(e) => setTreeSettings({ ...treeSettings, nodeSpacingY: Number(e.target.value) })}
                                    min={50} max={300} step={10}
                                />
                                <span className='text-[10px] font-mono w-8 text-right'>{treeSettings.nodeSpacingY}px</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20 flex justify-end'>
                    <Button onClick={onClose} variant='secondary'>
                        {t.close}
                    </Button>
                </div>
            </div>
        </div>
    );
});
