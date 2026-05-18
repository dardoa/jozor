import { useState } from 'react';
import { Person, Language } from '../../../types';
import { X, Calculator, User } from 'lucide-react'; // Removed ArrowRight
import { calculateRelationship } from '../../../utils/relationshipLogic';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  language: Language;
}

export const RelationshipModal = ({
  isOpen,
  onClose,
  people,
  language,
}: RelationshipModalProps) => {
  const { t } = useTranslation();
  const [person1Id, setPerson1Id] = useState<string>('');
  const [person2Id, setPerson2Id] = useState<string>('');
  const [result, setResult] = useState<{ text: string; commonAncestor?: string } | null>(null);

  const peopleList = (Object.values(people) as Person[]).sort((a, b) =>
    a.firstName.localeCompare(b.firstName)
  );

  const handleClose = () => {
    setResult(null);
    setPerson1Id('');
    setPerson2Id('');
    onClose();
  };

  const handleCalculate = () => {
    if (!person1Id || !person2Id) return;
    const res = calculateRelationship(person1Id, person2Id, people, language);
    setResult(res);
  };

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={handleClose}
      id='relationship-modal'
    >
      <div
        className='ds-overlay-card flex max-h-[92dvh] w-full sm:max-w-md flex-col overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='ds-modal-header'>
          <div className='flex items-center gap-2'>
            <div className='rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--color-info-500)]'>
              <Calculator className='w-5 h-5' />
            </div>
            <h3 className='ds-heading'>
              {t.calculateRelationship}
            </h3>
          </div>
          <button
            onClick={handleClose}
            aria-label={t.close}
            className='inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='ds-modal-body space-y-5 overflow-y-auto bg-[var(--surface-app)]/45'>
          <div className='space-y-4'>
            <div className='space-y-1'>
              <label className='ds-label'>{t.person1}</label>
              <select
                value={person1Id}
                onChange={(e) => setPerson1Id(e.target.value)}
                aria-label={t.person1}
                className='ds-input w-full px-4 py-3 text-sm'
              >
                <option value=''>-- Select --</option>
                {peopleList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-1'>
              <label className='ds-label'>{t.person2}</label>
              <select
                value={person2Id}
                onChange={(e) => setPerson2Id(e.target.value)}
                aria-label={t.person2}
                className='ds-input w-full px-4 py-3 text-sm'
              >
                <option value=''>-- Select --</option>
                {peopleList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCalculate}
              disabled={!person1Id || !person2Id}
              className='mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-info-500)] px-4 py-3 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:opacity-50'
            >
              <Calculator className='w-4 h-4' />
              {t.calculate}
            </button>
          </div>

          {result && (
            <div className='rounded-2xl bg-white/55 p-4 animate-in zoom-in-95 duration-200'>
              <div className='flex flex-col items-center text-center gap-2'>
                <span className='ds-label text-[var(--color-success-500)]'>
                  {t.relationshipIs}
                </span>
                <span className='text-xl font-bold text-[var(--text-main)]'>
                  {result.text}
                </span>

                {result.commonAncestor && people[result.commonAncestor] && (
                  <div className='mt-2 flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1.5 text-sm text-[var(--text-dim)] shadow-[var(--shadow-sm)]'>
                    <span className='text-[10px] uppercase text-[var(--text-muted)]'>
                      {t.commonAncestor}:
                    </span>
                    <span className='font-semibold flex items-center gap-1'>
                      <User className='w-3 h-3' />
                      {people[result.commonAncestor].firstName}{' '}
                      {people[result.commonAncestor].lastName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </OverlayPrimitive>
  );
};
