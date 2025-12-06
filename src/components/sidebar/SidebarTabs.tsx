import React, { memo } from 'react';
import { X } from 'lucide-react';

interface SidebarTabsProps {
  activeTab: 'info' | 'partners' | 'bio' | 'contact' | 'media';
  setActiveTab: (tab: 'info' | 'partners' | 'bio' | 'contact' | 'media') => void;
  tabs: { id: string; label: string; show: boolean; }[];
  onClose: () => void;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = memo(({ activeTab, setActiveTab, tabs, onClose }) => {
  return (
    <div className="flex items-end justify-between border-b border-stone-200/50 dark:border-stone-800/50 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-sm pt-3 px-4">
      {/* تم التعديل: إزالة overflow-x-auto وجعل الحاوية تأخذ المساحة المتاحة */}
      <div className="flex flex-1 gap-0.5">
        {tabs.filter(tab => tab.show).map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            // تم التعديل: جعل كل زر يأخذ مساحة متساوية ويتوسط النص
            className={`flex-1 min-w-0 text-center px-2.5 py-1.5 rounded-t-lg text-xs font-semibold transition-all relative top-[1px] 
            ${activeTab === tab.id 
                ? 'bg-white dark:bg-stone-900 text-teal-600 dark:text-teal-400 border-x border-t border-stone-200/50 dark:border-stone-800/50 z-10 shadow-t-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button onClick={onClose} className="md:hidden p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"><X className="w-5 h-5" /></button>
    </div>
  );
});