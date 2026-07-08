import React from 'react';
import { Eye, FileText, ImageIcon } from 'lucide-react';
import type { VisualOutputDefinition } from '../../../publishing';

interface VisualOutputActionBarProps {
  language: 'ar' | 'en';
  selectedDefinition?: VisualOutputDefinition;
}

export const VisualOutputActionBar: React.FC<VisualOutputActionBarProps> = ({
  language,
  selectedDefinition,
}) => {
  const isAr = language === 'ar';
  const supportedTargets = selectedDefinition?.capabilities.rendererTargets || [];
  const supportsPng = supportedTargets.includes('png');
  const supportsPdf = supportedTargets.includes('pdf');

  return (
    <div
      className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-4 mt-2 sm:flex-row"
      data-testid="visual-studio-action-bar"
    >
      <div className="text-[10px] font-medium text-[var(--text-muted)] select-none">
        {isAr ? 'إجراءات الاستوديو غير مفعلة بعد' : 'Studio actions are not active yet'}
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          type="button"
          disabled
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-main)] px-3 py-2 text-xs font-bold opacity-50 cursor-not-allowed select-none"
        >
          <Eye className="h-3.5 w-3.5" />
          {isAr ? 'معاينة الاستوديو' : 'Studio Preview'}
        </button>
        {supportsPng && (
          <button
            type="button"
            disabled
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-main)] px-3 py-2 text-xs font-bold opacity-50 cursor-not-allowed select-none"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {isAr ? 'تصدير PNG' : 'Export PNG'}
          </button>
        )}
        {supportsPdf && (
          <button
            type="button"
            disabled
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-[var(--primary-600)] text-white px-3 py-2 text-xs font-bold opacity-50 cursor-not-allowed select-none"
          >
            <FileText className="h-3.5 w-3.5" />
            {isAr ? 'تصدير PDF' : 'Export PDF'}
          </button>
        )}
      </div>
    </div>
  );
};
