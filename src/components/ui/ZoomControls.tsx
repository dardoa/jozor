import React from 'react';
import { ZoomIn, ZoomOut, Maximize, Crop, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface ZoomControlsProps {
  onOpenPreferences?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen: () => void;
}

const controlButtonClassName =
  'rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)]/92 p-2.5 text-[var(--text-default)] shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-600)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]';

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onOpenPreferences,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 print:hidden">
      {onOpenPreferences && (
        <button
          type="button"
          onClick={onOpenPreferences}
          className={`hidden sm:inline-flex ${controlButtonClassName}`}
          aria-label={t.help?.advancedSettings}
          title={t.help?.advancedSettings}
        >
          <SlidersHorizontal className='w-5 h-5' />
        </button>
      )}
      <button
        type="button"
        onClick={onZoomIn}
        className={controlButtonClassName}
        aria-label={t.help?.zoomIn}
        title={t.help?.zoomIn}
      >
        <ZoomIn className='w-5 h-5' />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className={controlButtonClassName}
        aria-label={t.help?.zoomOut}
        title={t.help?.zoomOut}
      >
        <ZoomOut className='w-5 h-5' />
      </button>
      <button
        type="button"
        onClick={onReset}
        className={controlButtonClassName}
        aria-label={t.help?.resetZoom}
        title={t.help?.resetZoom}
      >
        <Maximize className='w-5 h-5' />
      </button>
      <button
        type="button"
        onClick={onFitToScreen}
        className={controlButtonClassName}
        aria-label={t.help?.fitToScreen}
        title={t.help?.fitToScreen}
      >
        <Crop className='w-5 h-5' />
      </button>
    </div>
  );
};
