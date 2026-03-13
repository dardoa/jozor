import React from 'react';
import { Maximize2, Wrench, User } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface MobileActionBarProps {
  onCenterView: () => void;
  onOpenTools: () => void;
  onOpenAccount: () => void;
  activeTab?: 'center' | 'tools' | 'account' | null;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({
  onCenterView,
  onOpenTools,
  onOpenAccount,
  activeTab = null,
}) => {
  const { language } = useTranslation();
  const isRtl = language === 'ar';

  const centerLabel = isRtl ? 'تمركز' : 'Center';
  const toolsLabel = isRtl ? 'أدوات' : 'Tools';
  const accountLabel = isRtl ? 'الحساب' : 'Account';

  const buttons = [
    {
      id: 'center',
      label: centerLabel,
      icon: Maximize2,
      onClick: onCenterView,
    },
    {
      id: 'tools',
      label: toolsLabel,
      icon: Wrench,
      onClick: onOpenTools,
    },
    {
      id: 'account',
      label: accountLabel,
      icon: User,
      onClick: onOpenAccount,
    },
  ];

  if (isRtl) buttons.reverse();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[var(--card-bg)]/95 border-t border-[var(--border-main)] shadow-soft px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-between items-center gap-3 sm:hidden">
      {buttons.map((btn) => {
        const isActive = activeTab === btn.id;
        const Icon = btn.icon;

        return (
          <button
            key={btn.id}
            type="button"
            onClick={btn.onClick}
            className={`flex-1 flex flex-col items-center justify-center text-xs font-medium transition-all min-h-[44px] rounded-2xl py-1 relative ${
              isActive
                ? 'text-[var(--primary-600)] bg-[var(--primary-600)]/[0.08] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--primary-600)]/[0.02]'
            }`}
          >
            <Icon className={`w-5 h-5 mb-1 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
            <span className={isActive ? 'font-bold' : ''}>{btn.label}</span>
            {isActive && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--primary-600)] animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
};

