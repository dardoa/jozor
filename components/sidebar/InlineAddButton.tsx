import { memo } from 'react';
import { Plus } from 'lucide-react';
import { Gender } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

interface InlineAddButtonProps {
  onClick: () => void;
  gender: Gender;
}

export const InlineAddButton = memo(({ onClick, gender }: InlineAddButtonProps) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${gender === 'male'
          ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male-text)] hover:shadow-sm'
          : 'bg-[var(--gender-female-bg)] text-[var(--gender-female-text)] hover:shadow-sm'
        }`}
      title={t.add}
      aria-label={t.add || 'Add'}
    >
      <Plus className='w-3 h-3' strokeWidth={3} />
    </button>
  );
});
