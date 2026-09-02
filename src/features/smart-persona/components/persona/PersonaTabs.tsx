import { memo } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';
import { SmartPersonaTabId } from '../../../../types';

interface PersonaTabsProps {
  activeTab: SmartPersonaTabId;
  setActiveTab: (tab: SmartPersonaTabId) => void;
  tabs: { id: SmartPersonaTabId; label: string; show: boolean }[];
  onClose: () => void;
  showCloseButton?: boolean;
}

export const PersonaTabs = memo<PersonaTabsProps>(({ activeTab, setActiveTab, tabs, onClose, showCloseButton = true }) => {
  const { t } = useTranslation();
  const visibleTabs = tabs.filter((tab) => tab.show);

  const moveFocus = (currentId: SmartPersonaTabId, direction: 1 | -1) => {
    const currentIndex = visibleTabs.findIndex((tab) => tab.id === currentId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + visibleTabs.length) % visibleTabs.length;
    setActiveTab(visibleTabs[nextIndex].id);
  };

  return (
    <div className='flex min-w-0 items-end justify-between gap-2 px-3 pt-3 sm:px-4 sm:pt-3'>
      <div
        className='flex min-w-0 flex-1 gap-1.5 overflow-x-auto no-scrollbar scroll-smooth'
        role='tablist'
        aria-label={t.profile}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            id={`persona-tab-${tab.id}`}
            role='tab'
            aria-selected={activeTab === tab.id}
            aria-controls={`persona-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                moveFocus(tab.id, 1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveFocus(tab.id, -1);
              }
            }}
            className={`ds-tab flex-none min-w-[72px] sm:flex-1 text-center px-3.5 py-2.5 border border-transparent relative top-[1px] whitespace-nowrap
            ${activeTab === tab.id
              ? 'ds-tab-active border-x border-t z-10'
              : ''
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                className='absolute bottom-[-1px] left-3 right-3 h-[2px] bg-[var(--primary-600)] shadow-[var(--shadow-sm)] z-20'
                aria-hidden='true'
              />
            )}
          </button>
        ))}
      </div>
      {showCloseButton && (
        <button
          type='button'
          onClick={onClose}
          className='flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-main)] shadow-[var(--shadow-sm)] transition-all active:scale-95'
          aria-label={t.close}
          title={t.close}
        >
          <X className='h-4 w-4 sm:h-5 sm:w-5' />
        </button>
      )}
    </div>
  );
});
