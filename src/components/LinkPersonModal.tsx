import React, { memo, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { Person, Gender, FamilyActionsProps } from '../types';
import { CreateNewPersonSection } from './linkPersonModal/CreateNewPersonSection';
import { SelectExistingPersonSection } from './linkPersonModal/SelectExistingPersonSection';
import { OverlayPrimitive } from '../context/OverlayContext';
import { getSelectableCoParents } from '../domain/relationshipRules';

interface LinkPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  type: 'parent' | 'spouse' | 'child' | null;
  gender: Gender | null;
  currentPersonId: string;
  familyActions: FamilyActionsProps;
  initialMode?: 'create' | 'existing';
}

export const LinkPersonModal: React.FC<LinkPersonModalProps> = memo(
  ({ isOpen, onClose, people, type, gender, currentPersonId, familyActions, initialMode = 'create' }) => {
    const { t } = useTranslation();
    const relatedCandidates = useMemo(() => {
      return getSelectableCoParents(people, currentPersonId, type);
    }, [type, currentPersonId, people]);
    const requiresRelatedSelection = type === 'child' && relatedCandidates.length > 1;
    const [selectedRelatedId, setSelectedRelatedId] = useState<string>('');

    const resolvedRelatedId =
      type === 'child' && relatedCandidates.length === 1
        ? relatedCandidates[0].id
        : selectedRelatedId;

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
      <OverlayPrimitive
        isOpen={isOpen}
        onClose={onClose}
        id='link-person-modal'
      >
        <div
          className='ds-overlay-card flex max-h-[92dvh] w-full sm:max-w-md animate-scale-in flex-col overflow-hidden'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='ds-modal-header'>
            <div>
              <h3 className='ds-heading'>
                {t.add} {typeLabel}
              </h3>
            </div>
            <button
              onClick={onClose}
              className='inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='ds-modal-body space-y-5 overflow-y-auto bg-[var(--surface-app)]/45'>
            {type === 'child' && relatedCandidates.length > 0 && (
              <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2'>
                <div className='text-sm font-bold text-amber-900 dark:text-amber-200'>
                  {relatedCandidates.length > 1 ? 'حدد الوالد الآخر' : 'سيتم اعتبار الشريك الحالي والدًا ثانيًا'}
                </div>
                {relatedCandidates.length > 1 ? (
                  <select
                    value={selectedRelatedId}
                    onChange={(e) => setSelectedRelatedId(e.target.value)}
                    className='w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-sm text-stone-800 dark:text-stone-100 outline-none'
                  >
                    <option value=''>اختر الشريك المرتبط بهذا الطفل</option>
                    {relatedCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {[candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || t.unnamedPerson}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className='text-sm text-amber-700 dark:text-amber-300'>
                    {[relatedCandidates[0].firstName, relatedCandidates[0].lastName].filter(Boolean).join(' ') || t.unnamedPerson}
                  </div>
                )}
              </div>
            )}

            {initialMode === 'existing' ? (
              <>
                <SelectExistingPersonSection
                  people={people}
                  type={type}
                  gender={gender}
                  currentPersonId={currentPersonId}
                  familyActions={familyActions}
                  relatedPersonId={resolvedRelatedId || undefined}
                  requiresRelatedPerson={requiresRelatedSelection}
                  autoFocusSearch
                  onClose={onClose}
                />

                <div className='relative flex items-center py-1'>
                  <div className='flex-grow border-t border-[var(--border-soft)]'></div>
                  <span className='mx-4 flex-shrink-0 text-xs font-medium uppercase text-[var(--text-muted)]'>
                    {t.or}
                  </span>
                  <div className='flex-grow border-t border-[var(--border-soft)]'></div>
                </div>

                <CreateNewPersonSection
                  type={type}
                  gender={gender}
                  familyActions={familyActions}
                  relatedPersonId={resolvedRelatedId || undefined}
                  requiresRelatedPerson={requiresRelatedSelection}
                  onClose={onClose}
                />
              </>
            ) : (
              <>
                <CreateNewPersonSection
                  type={type}
                  gender={gender}
                  familyActions={familyActions}
                  relatedPersonId={resolvedRelatedId || undefined}
                  requiresRelatedPerson={requiresRelatedSelection}
                  onClose={onClose}
                />

                <div className='relative flex items-center py-1'>
                  <div className='flex-grow border-t border-[var(--border-soft)]'></div>
                  <span className='mx-4 flex-shrink-0 text-xs font-medium uppercase text-[var(--text-muted)]'>
                    {t.or}
                  </span>
                  <div className='flex-grow border-t border-[var(--border-soft)]'></div>
                </div>

                <SelectExistingPersonSection
                  people={people}
                  type={type}
                  gender={gender}
                  currentPersonId={currentPersonId}
                  familyActions={familyActions}
                  relatedPersonId={resolvedRelatedId || undefined}
                  requiresRelatedPerson={requiresRelatedSelection}
                  onClose={onClose}
                />
              </>
            )}
          </div>
        </div>
      </OverlayPrimitive>
    );
  }
);
