import React from 'react';
import { Eye } from 'lucide-react';
import type { VisualOutputDefinition } from '../../../publishing';

interface VisualOutputPreviewPaneProps {
  language: 'ar' | 'en';
  selectedDefinition?: VisualOutputDefinition;
}

export const VisualOutputPreviewPane: React.FC<VisualOutputPreviewPaneProps> = ({
  language,
  selectedDefinition,
}) => {
  const isAr = language === 'ar';
  const displayName = selectedDefinition?.displayName[language] || '';
  const description = selectedDefinition?.description[language] || '';
  const previewType = selectedDefinition?.previewAsset?.type || 'placeholder';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-[var(--border-soft)] bg-[var(--surface-subtle)] p-6 text-center select-none"
      data-testid="visual-studio-preview-pane"
    >
      <div className="rounded-full bg-[var(--surface-panel)] border border-[var(--border-soft)] p-4 text-[var(--text-secondary)] shadow-sm mb-3">
        <Eye className="h-6 w-6 opacity-60" />
      </div>
      <h5 className="text-sm font-bold text-[var(--text-main)]">
        {displayName || (isAr ? 'ستظهر المعاينة البصرية هنا' : 'Visual preview will appear here')}
      </h5>
      <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-[340px] leading-normal font-medium">
        {description}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
        {isAr
          ? `نوع المعاينة: ${previewType} (ستتمكن لاحقاً من رؤية الشجرة وتكبيرها وتحريكها مباشرة)`
          : `Preview type: ${previewType} (dynamic zoom/pan live preview coming soon)`}
      </p>
    </div>
  );
};
