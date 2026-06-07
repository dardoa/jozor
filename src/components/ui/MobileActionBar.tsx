import { FolderArchive, Palette, Plus, type LucideIcon } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface MobileActionBarProps {
  onOpenVault: () => void;
  onOpenAppearance: () => void;
  onAddPerson: () => void;
  canAddPerson?: boolean;
  activeTab?: 'vault' | 'appearance' | 'add' | null;
}

type MobileActionButtonId = 'vault' | 'appearance' | 'add';

interface MobileActionButton {
  id: MobileActionButtonId;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

type MobileActionTranslations = {
  appearance?: string;
  addShort?: string;
  vaultTitle?: string;
  settings?: {
    appearanceLab?: string;
  };
};

export const MobileActionBar: React.FC<MobileActionBarProps> = ({
  onOpenVault,
  onOpenAppearance,
  onAddPerson,
  canAddPerson = true,
  activeTab = null,
}) => {
  const { t } = useTranslation();
  const text = t as typeof t & MobileActionTranslations;

  const runWithFeedback = (action: () => void) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
    action();
  };

  const buttons: MobileActionButton[] = [
    {
      id: 'appearance',
      label: text.settings?.appearanceLab || text.appearance || 'Appearance',
      icon: Palette,
      onClick: onOpenAppearance,
    },
    {
      id: 'add',
      label: text.addShort || 'Add',
      icon: Plus,
      onClick: onAddPerson,
      disabled: !canAddPerson,
    },
    {
      id: 'vault',
      label: text.vaultTitle || 'The Vault',
      icon: FolderArchive,
      onClick: onOpenVault,
    },
  ];

  return (
    <nav
      aria-label="Mobile actions"
      className="fixed inset-x-0 bottom-0 z-[calc(var(--z-index-nav)+6)] flex items-end justify-between border-t border-[var(--border-main)] bg-[var(--theme-bg)]/96 px-4 pt-2 pb-[calc(0.9rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(44,24,16,0.14)] sm:hidden"
    >
      {buttons.map((btn) => {
        const isActive = activeTab === btn.id;
        const Icon = btn.icon;
        const isPrimary = btn.id === 'add';

        return (
          <button
            key={btn.id}
            type="button"
            onClick={() => runWithFeedback(btn.onClick)}
            disabled={btn.disabled}
            aria-label={btn.label}
            aria-current={isActive ? 'page' : undefined}
            title={btn.label}
            className={`relative flex min-h-11 items-center justify-center transition-all duration-200 active:scale-95 ${
              isPrimary
                ? `min-w-11 rounded-full border px-0 shadow-[0_16px_28px_rgba(197,160,89,0.24)] ${
                    btn.disabled
                      ? 'cursor-not-allowed border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)] opacity-60'
                      : 'border-[var(--color-accent-500)] bg-[var(--color-accent-500)] text-[color:var(--surface-app)]'
                  }`
                : `min-w-[72px] flex-col gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold ${
                    isActive
                      ? 'border border-[var(--color-accent-500)] bg-[color:rgba(197,160,89,0.14)] text-[var(--primary-700)] shadow-[var(--shadow-sm)]'
                      : 'border border-transparent text-[var(--text-dim)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
                  }`
            }`}
          >
            <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive || isPrimary ? 'scale-110' : ''}`} />
            {!isPrimary && <span className="max-w-[72px] truncate leading-tight">{btn.label}</span>}
            {isPrimary && <span className="sr-only">{btn.label}</span>}
            {isActive && !isPrimary && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[var(--primary-600)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
