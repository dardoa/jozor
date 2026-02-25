import React from 'react';
import { Maximize2, Wrench, User } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface MobileActionBarProps {
  onCenterView: () => void;
  onOpenTools: () => void;
  onOpenAccount: () => void;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({
  onCenterView,
  onOpenTools,
  onOpenAccount,
}) => {
  const { language } = useTranslation();
  const isRtl = language === 'ar';

  const centerLabel = isRtl ? 'تمركز' : 'Center';
  const toolsLabel = isRtl ? 'أدوات' : 'Tools';
  const accountLabel = isRtl ? 'الحساب' : 'Account';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[var(--card-bg)]/95 border-t border-[var(--border-main)] shadow-soft px-4 py-2 flex justify-between items-center gap-3 sm:hidden">
      <button
        type="button"
        onClick={onCenterView}
        className="flex-1 flex flex-col items-center justify-center text-[10px] text-[var(--text-dim)] hover:text-[var(--text-main)]"
      >
        <Maximize2 className="w-5 h-5 mb-0.5" />
        <span>{centerLabel}</span>
      </button>
      <button
        type="button"
        onClick={onOpenTools}
        className="flex-1 flex flex-col items-center justify-center text-[10px] text-[var(--text-dim)] hover:text-[var(--text-main)]"
      >
        <Wrench className="w-5 h-5 mb-0.5" />
        <span>{toolsLabel}</span>
      </button>
      <button
        type="button"
        onClick={onOpenAccount}
        className="flex-1 flex flex-col items-center justify-center text-[10px] text-[var(--text-dim)] hover:text-[var(--text-main)]"
      >
        <User className="w-5 h-5 mb-0.5" />
        <span>{accountLabel}</span>
      </button>
    </div>
  );
};

