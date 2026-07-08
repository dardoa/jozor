import React, { useState } from 'react';
import { VisualOutputReadinessNotice } from './VisualOutputReadinessNotice';
import { VisualOutputPreviewPane } from './VisualOutputPreviewPane';
import { VisualOutputConfigPanel } from './VisualOutputConfigPanel';
import { VisualOutputActionBar } from './VisualOutputActionBar';
import {
  getVisualOutputDefinition,
  listVisualOutputDefinitions,
  getVisualPreviewAdapter,
} from '../../../publishing';

interface VisualPublishingStudioProps {
  language: 'ar' | 'en';
  isPreviewOnly?: boolean;
}

export const VisualPublishingStudio: React.FC<VisualPublishingStudioProps> = ({
  language,
  isPreviewOnly = false,
}) => {
  const isAr = language === 'ar';
  const definitions = listVisualOutputDefinitions();

  const [selectedDefinitionId, setSelectedDefinitionId] = useState('classic-ancestor-poster');

  const fallbackDefinition = getVisualOutputDefinition('classic-ancestor-poster') || definitions[0];
  const selectedDefinition = getVisualOutputDefinition(selectedDefinitionId) || fallbackDefinition;

  // Build the sanitized preview model using the preview adapter (Phase 3B)
  const adapter = getVisualPreviewAdapter(selectedDefinition.productType);
  const previewModel = adapter?.createPreviewModel({
    definitionId: selectedDefinition.id,
    mode: 'static-mock',
    privacyMode: 'masked',
    language,
    maxNodes: 5, // Small cap limit to trigger truncation on poster mock (7 nodes) and not snapshot (3 nodes)
  });

  return (
    <div
      className="flex flex-col gap-4 rounded-[20px] border border-[var(--primary-500)]/20 bg-gradient-to-br from-[var(--surface-panel)] via-[var(--surface-panel)] to-[var(--primary-500)]/5 p-5 shadow-sm relative overflow-hidden"
      data-testid="visual-publishing-studio"
    >
      <div className="flex flex-col gap-1 text-start">
        <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">
          {isAr ? 'استوديو النشر البصري' : 'Visual Publishing Studio'}
        </h4>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          {isAr
            ? 'تصميم وتهيئة لوحات شجرة العائلة وبوسترات الأسلاف بجودة طباعة عالية.'
            : 'Design and configure family tree charts and ancestor posters with high print fidelity.'}
        </p>
      </div>

      <VisualOutputReadinessNotice language={language} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <VisualOutputPreviewPane
            language={language}
            selectedDefinition={selectedDefinition}
            previewModel={previewModel}
          />
        </div>
        <div>
          <VisualOutputConfigPanel
            language={language}
            definitions={definitions}
            selectedDefinitionId={selectedDefinitionId}
            selectedDefinition={selectedDefinition}
            onSelectDefinition={setSelectedDefinitionId}
            previewModel={previewModel}
          />
        </div>
      </div>

      {!isPreviewOnly && <VisualOutputActionBar language={language} selectedDefinition={selectedDefinition} />}
    </div>
  );
};
export default VisualPublishingStudio;
