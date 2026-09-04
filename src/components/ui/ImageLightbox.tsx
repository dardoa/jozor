import { X, Download, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { logError } from '../../utils/errorLogger';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  altPrefix?: string;
  labels?: {
    download: string;
    close: string;
    previous: string;
    next: string;
    closeHint: string;
  };
}

const DEFAULT_LABELS = {
  download: 'Download image',
  close: 'Close gallery',
  previous: 'Previous image',
  next: 'Next image',
  closeHint: 'Click outside or press Escape to close',
};

export const ImageLightbox = memo<ImageLightboxProps>(({ 
  images, 
  currentIndex, 
  onClose, 
  onNavigate,
  altPrefix = 'Gallery Image',
  labels = DEFAULT_LABELS,
}) => {
  const hasMultiple = images.length > 1;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpen = currentIndex !== null;
  
  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex === null || images.length === 0) return;
    const nextIndex = (currentIndex + 1) % images.length;
    onNavigate(nextIndex);
  }, [currentIndex, images.length, onNavigate]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex === null || images.length === 0) return;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    onNavigate(prevIndex);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Tab') {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (first && last && !dialogRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (first && last && e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (first && last && !e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, handlePrev, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (
    currentIndex === null ||
    currentIndex < 0 ||
    currentIndex >= images.length ||
    typeof document === 'undefined'
  ) return null;

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
      logError('GALLERY_IMAGE_DOWNLOAD_FAILED', err, { showToast: false });
    }
  };

  return createPortal(
    <div 
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={altPrefix}
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
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--primary-600)] transition-colors bg-white/20 rounded-full backdrop-blur-sm"
            title={labels.download}
            aria-label={labels.download}
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors bg-white/20 rounded-full backdrop-blur-sm"
            title={labels.close}
            aria-label={labels.close}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-4 p-3 z-20 text-[var(--text-muted)] hover:text-[var(--primary-600)] bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95"
            title={labels.previous}
            aria-label={labels.previous}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-4 p-3 z-20 text-[var(--text-muted)] hover:text-[var(--primary-600)] bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95"
            title={labels.next}
            aria-label={labels.next}
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
        <span className="flex items-center gap-1"><ChevronLeft className="w-3 h-3"/> {labels.previous}</span>
        <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> {labels.closeHint}</span>
        <span className="flex items-center gap-1">{labels.next} <ChevronRight className="w-3 h-3"/></span>
      </div>
    </div>,
    document.body
  );
});
