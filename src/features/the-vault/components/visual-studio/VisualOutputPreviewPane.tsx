import React from 'react';
import { Eye } from 'lucide-react';

interface VisualOutputPreviewPaneProps {
  language: 'ar' | 'en';
}

export const VisualOutputPreviewPane: React.FC<VisualOutputPreviewPaneProps> = ({ language }) => {
  const isAr = language === 'ar';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-[var(--border-soft)] bg-[var(--surface-subtle)] p-6 text-center select-none"
      data-testid="visual-studio-preview-pane"
    >
      <div className="rounded-full bg-[var(--surface-panel)] border border-[var(--border-soft)] p-4 text-[var(--text-secondary)] shadow-sm mb-3">
        <Eye className="h-6 w-6 opacity-60" />
      </div>
      <h5 className="text-sm font-bold text-[var(--text-main)]">
        {isAr ? 'ستظهر المعاينة البصرية هنا' : 'Visual preview will appear here'}
      </h5>
      <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-[280px] leading-normal">
        {isAr
          ? 'ستتمكن لاحقاً من رؤية الشجرة وتكبيرها وتحريكها مباشرة قبل التصدير.'
          : 'You will be able to see the tree, zoom, and pan live before exporting.'}
      </p>
    </div>
  );
};
