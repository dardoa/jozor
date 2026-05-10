import { X, Download, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  altPrefix?: string;
}

export const ImageLightbox = memo<ImageLightboxProps>(({ 
  images, 
  currentIndex, 
  onClose, 
  onNavigate,
  altPrefix = 'Gallery Image'
}) => {
  const hasMultiple = images.length > 1;
  
  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex === null) return;
    const nextIndex = (currentIndex + 1) % images.length;
    onNavigate(nextIndex);
  }, [currentIndex, images.length, onNavigate]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex === null) return;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    onNavigate(prevIndex);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    
    if (currentIndex !== null) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, currentIndex, handleNext, handlePrev]);

  if (currentIndex === null || typeof document === 'undefined') return null;

  const currentSrc = images[currentIndex];
  const alt = `${altPrefix} ${currentIndex + 1} / ${images.length}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(currentSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jozor-gallery-${Date.now()}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[var(--surface-panel)]/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div 
        className="absolute top-0 inset-x-0 p-4 flex justify-between items-center bg-gradient-to-b from-[var(--surface-subtle)]/80 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[var(--text-main)] text-sm font-bold px-4 truncate max-w-[70%] drop-shadow-sm">
          {alt}
        </div>
        <div className="flex gap-4 px-4">
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--primary-600)] transition-colors bg-white/20 rounded-full backdrop-blur-sm"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors bg-white/20 rounded-full backdrop-blur-sm"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      {hasMultiple && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 p-3 z-20 text-[var(--text-muted)] hover:text-[var(--primary-600)] bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95"
            title="Previous"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 p-3 z-20 text-[var(--text-muted)] hover:text-[var(--primary-600)] bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95"
            title="Next"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Image Container */}
      <div 
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center p-2 rounded-2xl bg-white/10 shadow-2xl border border-white/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          key={currentSrc}
          src={currentSrc} 
          alt={alt} 
          className="max-w-full max-h-[80vh] object-contain rounded-xl animate-in zoom-in-95 duration-500"
        />
      </div>

      {/* Hint */}
      <div className="absolute bottom-8 text-[var(--text-muted)] text-[10px] uppercase tracking-widest flex items-center gap-4 font-bold opacity-60">
        <span className="flex items-center gap-1"><ChevronLeft className="w-3 h-3"/> Prev</span>
        <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Click outside to close</span>
        <span className="flex items-center gap-1">Next <ChevronRight className="w-3 h-3"/></span>
      </div>
    </div>,
    document.body
  );
});
