import { Target, Settings, Wrench, Trash2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface MobileActionBarProps {
  onCenterView: () => void;
  onOpenAdmin: () => void;
  onOpenTools: () => void;
  onDelete: () => void;
  activeTab?: 'center' | 'admin' | 'tools' | 'delete' | null;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({
  onCenterView,
  onOpenAdmin,
  onOpenTools,
  onDelete,
  activeTab = null,
}) => {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';

  const buttons = [
    {
      id: 'center',
      label: t.general.center,
      icon: Target,
      onClick: onCenterView,
    },
    {
      id: 'admin',
      label: t.header.tooltips.adminHub,
      icon: Settings,
      onClick: onOpenAdmin,
    },
    {
      id: 'tools',
      label: t.general.tools,
      icon: Wrench,
      onClick: onOpenTools,
    },
    {
      id: 'delete',
      label: t.general.delete,
      icon: Trash2,
      onClick: onDelete,
    },
  ];

  // Logic: [Center] -> [Rel] -> [Tools] -> [Delete]
  // In RTL, we want Center to stay near the thumb (right in RTL), but we reverse the array if we use justify-around/between
  // Actually, if we want [Center][Rel][Tools][Delete] in RTL it should be rendered in that order from right to left.
  const displayButtons = buttons;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] bg-[var(--theme-bg)] border-t border-[var(--border-main)] shadow-[0_-8px_20px_rgba(0,0,0,0.1)] px-3 pt-2 pb-[calc(1.2rem+env(safe-area-inset-bottom))] flex flex-row rtl:flex-row-reverse justify-around items-center gap-2 sm:hidden">
      {displayButtons.map((btn) => {
        const isActive = activeTab === btn.id;
        const Icon = btn.icon;
        const isDelete = btn.id === 'delete';

        return (
          <button
            key={btn.id}
            type="button"
            onClick={btn.onClick}
            aria-label={btn.label}
            title={btn.label}
            className={`flex-1 flex flex-col items-center justify-center text-[10px] font-bold transition-all min-h-[44px] rounded-2xl py-1 relative ${
              isActive
                ? 'text-[var(--primary-600)] bg-[var(--primary-600)]/[0.08] shadow-sm'
                : isDelete
                ? 'text-red-500/70 hover:text-red-500'
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--primary-600)]/[0.02]'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
            <span className="truncate max-w-[64px]">{btn.label}</span>
            {isActive && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[var(--primary-600)] animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

