import React from 'react';
import type { VisualOutputDefinition } from '../../../publishing';

interface VisualOutputPreviewPaneProps {
  language: 'ar' | 'en';
  selectedDefinition?: VisualOutputDefinition;
}

export const VisualOutputPreviewPane: React.FC<VisualOutputPreviewPaneProps> = ({
  language,
  selectedDefinition,
}) => {
  const displayName = selectedDefinition?.displayName[language] || '';
  const description = selectedDefinition?.description[language] || '';
  const previewAlt = selectedDefinition?.previewAsset?.alt[language] || '';
  const productType = selectedDefinition?.productType || 'poster';
  const definitionId = selectedDefinition?.id || '';

  // Determine mockup styling based on template theme
  const isDarkPreset = definitionId === 'modern-ancestor-poster';

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-6 text-center select-none"
      data-testid="visual-studio-preview-pane"
    >
      {/* Mockup Preview Frame */}
      <div
        className="w-full flex items-center justify-center p-4 bg-[var(--surface-panel)] rounded-xl border border-[var(--border-soft)]/60 min-h-[220px]"
        data-testid="visual-preview-frame"
        aria-label={previewAlt}
      >
        {productType === 'poster' ? (
          /* Poster Template Mockup (Portrait Frame) */
          <div
            className={`w-[140px] h-[190px] rounded-lg border-2 shadow-sm flex flex-col justify-between p-2 relative overflow-hidden transition-all duration-300 ${
              isDarkPreset
                ? 'border-slate-700 bg-slate-900/90 text-slate-300'
                : 'border-amber-700/30 bg-amber-50/60 text-amber-900'
            }`}
            data-testid="poster-preview-composition"
          >
            {/* Poster Header Mock */}
            <div className={`text-[8px] font-bold text-center border-b pb-1 truncate ${
              isDarkPreset ? 'border-slate-800 text-slate-400' : 'border-amber-200/60 text-amber-800'
            }`}>
              {displayName}
            </div>

            {/* Abstract Ancestor Tree Mock (Branching upwards from bottom root) */}
            <div className="flex-1 flex flex-col justify-end items-center gap-2.5 pb-2 relative">
              {/* Grandparents (Level 3) - 4 small nodes */}
              <div className="flex justify-between w-full px-2">
                <div className={`w-2 h-2 rounded-full ${isDarkPreset ? 'bg-indigo-500/80' : 'bg-amber-600/70'}`} />
                <div className={`w-2 h-2 rounded-full ${isDarkPreset ? 'bg-indigo-500/80' : 'bg-amber-600/70'}`} />
                <div className={`w-2 h-2 rounded-full ${isDarkPreset ? 'bg-indigo-500/80' : 'bg-amber-600/70'}`} />
                <div className={`w-2 h-2 rounded-full ${isDarkPreset ? 'bg-indigo-500/80' : 'bg-amber-600/70'}`} />
              </div>

              {/* Parents (Level 2) - 2 nodes */}
              <div className="flex justify-around w-[75%]">
                <div className={`w-3 h-3 rounded-full ${isDarkPreset ? 'bg-teal-500/80' : 'bg-amber-700/80'}`} />
                <div className={`w-3 h-3 rounded-full ${isDarkPreset ? 'bg-teal-500/80' : 'bg-amber-700/80'}`} />
              </div>

              {/* Root Person (Level 1) - 1 node */}
              <div className={`w-4 h-4 rounded-full ${isDarkPreset ? 'bg-indigo-600' : 'bg-amber-800'}`} />

              {/* Connecting lines via CSS absolute borders */}
              <div className={`absolute bottom-5 left-[50%] w-0.5 h-6 -translate-x-1/2 border-l border-dashed ${
                isDarkPreset ? 'border-slate-700' : 'border-amber-300'
              }`} />
            </div>
          </div>
        ) : (
          /* Viewport Snapshot Mockup (Landscape Frame) */
          <div
            className="w-[200px] h-[130px] rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] shadow-sm flex flex-col p-1.5 relative overflow-hidden"
            data-testid="snapshot-preview-composition"
          >
            {/* Viewport UI header mock */}
            <div className="flex items-center gap-1 border-b border-[var(--border-soft)] pb-1 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="text-[7px] text-[var(--text-muted)] font-mono ml-1">Jozor Workspace</div>
            </div>

            {/* Abstract Tree Nodes / Grid Mock */}
            <div className="flex-1 grid grid-cols-3 gap-2 p-1 relative bg-[var(--surface-panel)] border border-[var(--border-soft)]/40 rounded">
              <div className="flex flex-col gap-1.5 justify-center items-center">
                <div className="w-6 h-3 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
                <div className="w-6 h-3 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
              </div>
              <div className="flex flex-col justify-center items-center">
                <div className="w-8 h-4 rounded bg-[var(--primary-500)]/20 border border-[var(--primary-500)]/50" />
              </div>
              <div className="flex flex-col gap-1.5 justify-center items-center">
                <div className="w-6 h-3 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
                <div className="w-6 h-3 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
              </div>
              {/* Abstract grid background helper */}
              <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Template Metadata Details */}
      <div className="flex flex-col gap-1 text-center">
        <h5 className="text-sm font-bold text-[var(--text-main)]">
          {displayName}
        </h5>
        <p className="text-[11px] text-[var(--text-secondary)] max-w-[340px] leading-normal font-medium mx-auto">
          {description}
        </p>
      </div>
    </div>
  );
};
