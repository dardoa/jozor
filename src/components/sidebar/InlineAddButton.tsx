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
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${gender === 'male' 
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400'}`}
            title={t.add}
        >
            <Plus className="w-3 h-3" strokeWidth={3} />
        </button>
    );
});