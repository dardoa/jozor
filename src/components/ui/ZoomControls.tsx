import React from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset }) => (
  <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10 print:hidden">
    <button onClick={onZoomIn} className="p-2.5 bg-white dark:bg-stone-800 rounded-full shadow-lg text-stone-600 dark:text-stone-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-stone-700 transition-all" aria-label="Zoom In"><ZoomIn className="w-5 h-5" /></button>
    <button onClick={onZoomOut} className="p-2.5 bg-white dark:bg-stone-800 rounded-full shadow-lg text-stone-600 dark:text-stone-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-stone-700 transition-all" aria-label="Zoom Out"><ZoomOut className="w-5 h-5" /></button>
    <button onClick={onReset} className="p-2.5 bg-white dark:bg-stone-800 rounded-full shadow-lg text-stone-600 dark:text-stone-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-stone-700 transition-all" aria-label="Reset Zoom"><Maximize className="w-5 h-5" /></button>
  </div>
);