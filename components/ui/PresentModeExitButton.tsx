import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface PresentModeExitButtonProps {
  onExit: () => void;
}

export const PresentModeExitButton: React.FC<PresentModeExitButtonProps> = ({ onExit }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onExit}
      className='fixed top-4 right-4 z-[100] bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur hover:bg-black/70 flex items-center gap-2'
    >
      <X className='w-4 h-4' /> {t.exitPresentMode}
    </button>
  );
};
