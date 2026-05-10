import { lazy, memo, Suspense, useState } from 'react';
import { Person, FamilyActionsProps, PersonUpdateHandler } from '../../types';
import { Card } from '../ui/Card';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

const PersonIdentityEdit = lazy(() =>
  import('./PersonIdentityEdit').then((module) => ({ default: module.PersonIdentityEdit }))
);
const PersonStatusEdit = lazy(() =>
  import('./PersonStatusEdit').then((module) => ({ default: module.PersonStatusEdit }))
);
const PersonBirthDeathEdit = lazy(() =>
  import('./PersonBirthDeathEdit').then((module) => ({ default: module.PersonBirthDeathEdit }))
);
const FamilyRelationshipsSection = lazy(() =>
  import('./FamilyRelationshipsSection').then((module) => ({ default: module.FamilyRelationshipsSection }))
);

interface InfoTabEditProps {
  person: Person;
  people: Record<string, Person>;
  onUpdate: PersonUpdateHandler;
  onSelect: (id: string) => void;
  familyActions: FamilyActionsProps;
}

export const InfoTabEdit = memo<InfoTabEditProps>(
  ({ person, people, onUpdate, onSelect, familyActions }) => {
    const { t } = useTranslation();
    const [showFamilyRelationships, setShowFamilyRelationships] = useState(true);

    return (
      <div className='flex flex-col gap-4 animate-in fade-in duration-200'>
        <Suspense fallback={null}>
          <PersonIdentityEdit person={person} onUpdate={onUpdate} />
        </Suspense>

        <Suspense fallback={null}>
          <PersonStatusEdit person={person} onUpdate={onUpdate} />
        </Suspense>

        <Suspense fallback={null}>
          <PersonBirthDeathEdit person={person} onUpdate={onUpdate} />
        </Suspense>

        <Card title={t.familyRelationships} tone='flat'>
          <button
            onClick={() => setShowFamilyRelationships(!showFamilyRelationships)}
            className='w-full flex items-center justify-between text-xs font-medium text-[var(--text-muted)] hover:text-[var(--primary-600)] py-1 px-0.5 -mx-0.5 rounded-md transition-colors'
            aria-label={
              showFamilyRelationships ? t.hideFamilyRelationships : t.showFamilyRelationships
            }
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showFamilyRelationships ? 'rotate-180' : ''}`}
            />
          </button>

          {showFamilyRelationships && (
            <div className='mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
              <Suspense fallback={null}>
                <FamilyRelationshipsSection
                  person={person}
                  people={people}
                  isEditing={true}
                  onUpdate={onUpdate}
                  onSelect={onSelect}
                  familyActions={familyActions}
                />
              </Suspense>
            </div>
          )}
        </Card>
      </div>
    );
  }
);
