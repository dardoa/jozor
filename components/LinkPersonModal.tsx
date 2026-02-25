import React, { memo } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { Person, Gender, FamilyActionsProps } from '../types';
import { CreateNewPersonSection } from './linkPersonModal/CreateNewPersonSection';
import { SelectExistingPersonSection } from './linkPersonModal/SelectExistingPersonSection';

interface LinkPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  type: 'parent' | 'spouse' | 'child' | null;
  gender: Gender | null;
  currentPersonId: string;
  familyActions: FamilyActionsProps;
}

export const LinkPersonModal: React.FC<LinkPersonModalProps> = memo(
  ({ isOpen, onClose, people, type, gender, currentPersonId, familyActions }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const typeLabel =
      type === 'parent'
        ? gender === 'male'
          ? t.addFather
          : t.addMother
        : type === 'spouse'
          ? gender === 'male'
            ? t.addHusband
            : t.addWife
          : type === 'child'
            ? gender === 'male'
              ? t.addSon
              : t.addDaughter
            : t.add;

    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
        <div className='bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] animate-scale-in border border-stone-200 dark:border-stone-700'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50'>
            <div>
              <h3 className='text-lg font-bold text-stone-800 dark:text-white'>
                {t.add} {typeLabel}
              </h3>
              <p className='text-sm text-stone-500 dark:text-stone-400'>{t.howToAdd}</p>
            </div>
            <button
              onClick={onClose}
              className='p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='p-6 space-y-6 overflow-y-auto bg-white dark:bg-stone-800'>
            {/* Option 1: Create New Person */}
            <CreateNewPersonSection
              type={type}
              gender={gender}
              familyActions={familyActions}
              onClose={onClose}
            />

            <div className='relative flex items-center py-2'>
              <div className='flex-grow border-t border-stone-200 dark:border-stone-700'></div>
              <span className='flex-shrink-0 mx-4 text-stone-400 text-xs font-medium uppercase'>
                {t.or}
              </span>
              <div className='flex-grow border-t border-stone-200 dark:border-stone-700'></div>
            </div>

            {/* Option 2: Select Existing Person */}
            <SelectExistingPersonSection
              people={people}
              type={type}
              gender={gender}
              currentPersonId={currentPersonId}
              familyActions={familyActions}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    );
  }
);
