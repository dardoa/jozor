import { memo } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface SidebarTabsProps {
  activeTab: 'info' | 'partners' | 'bio' | 'contact' | 'media'; // Removed 'sources' and 'events'
  setActiveTab: (tab: 'info' | 'partners' | 'bio' | 'contact' | 'media') => void; // Removed 'sources' and 'events'
  tabs: { id: string; label: string; show: boolean }[];
  onClose: () => void;
}

export const SidebarTabs = memo<SidebarTabsProps>(({ activeTab, setActiveTab, tabs, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className='flex items-end justify-between border-b border-[var(--border-main)] bg-[var(--theme-bg)] pt-4 sm:pt-3 px-4'>
      {/* تم التعديل: إزالة overflow-x-auto وجعل الحاوية تأخذ المساحة المتاحة */}
      <div className='flex flex-1 gap-1 overflow-x-auto no-scrollbar scroll-smooth'>
        {tabs
          .filter((tab) => tab.show)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-none min-w-[70px] sm:flex-1 text-center px-3 py-2 rounded-t-2xl text-xs font-semibold transition-all relative top-[1px] whitespace-nowrap
            ${activeTab === tab.id
                  ? 'bg-[var(--theme-bg)] text-[var(--primary-600)] border-x border-t border-[var(--border-main)] z-10 shadow-t-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
            >
              {tab.label}
            </button>
          ))}
      </div>
      <button
        onClick={onClose}
        aria-label={t.common?.close || 'Close'}
        title={t.common?.close || 'Close'}
        className='p-2 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors'
      >
        <X className='w-5 h-5' />
      </button>
    </div>
  );
});
