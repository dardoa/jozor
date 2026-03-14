import React from 'react';
import { ZoomIn, ZoomOut, Maximize, Crop, Settings2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen: () => void;
  onOpenAdvanced?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset, onFitToScreen, onOpenAdvanced }) => {
  const { t } = useTranslation();

  return (
    <div className="absolute bottom-6 end-6 flex flex-col gap-2 z-10 print:hidden">
      <button
        onClick={onZoomIn}
        className='p-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-full shadow-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all'
        aria-label={t.help?.zoomIn || 'Zoom In'}
        title={t.help?.zoomIn || 'Zoom In'}
      >
        <ZoomIn className='w-5 h-5' />
      </button>
      <button
        onClick={onZoomOut}
        className='p-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-full shadow-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all'
        aria-label={t.help?.zoomOut || 'Zoom Out'}
        title={t.help?.zoomOut || 'Zoom Out'}
      >
        <ZoomOut className='w-5 h-5' />
      </button>
      <button
        onClick={onReset}
        className='p-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-full shadow-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all'
        aria-label={t.help?.resetZoom || 'Reset Zoom'}
        title={t.help?.resetZoom || 'Reset Zoom'}
      >
        <Maximize className='w-5 h-5' />
      </button>
      <button
        onClick={onFitToScreen}
        className='p-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-full shadow-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 hover:scale-110 active:scale-95 transition-all'
        aria-label={t.help?.fitToScreen || 'Fit to Screen'}
        title={t.help?.fitToScreen || 'Fit to Screen'}
      >
        <Crop className='w-5 h-5' />
      </button>
      {onOpenAdvanced && (
        <button
          onClick={onOpenAdvanced}
          className='p-2.5 bg-[#E1AD01] text-black rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all mt-2'
          aria-label={t.help?.advancedSettings || 'Advanced Layout Settings'}
          title={t.help?.advancedSettings || 'Advanced Layout Settings'}
        >
          <Settings2 className='w-5 h-5' />
        </button>
      )}
    </div>
  );
};