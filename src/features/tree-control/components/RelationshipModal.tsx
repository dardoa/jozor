import { useMemo, useState } from 'react';
import { Person, Language } from '../../../types';
import { X, Calculator, User, Search } from 'lucide-react'; // Removed ArrowRight
import { calculateRelationship } from '../../../utils/relationshipLogic';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { SmartAvatar } from '../../../components/ui/SmartAvatar';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  language: Language;
}

const getPersonName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim();

const normalizeSearchText = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

interface PersonSearchSelectProps {
  label: string;
  people: Person[];
  value: string;
  onChange: (personId: string) => void;
  placeholder: string;
}

const PersonSearchSelect = ({
  label,
  people,
  value,
  onChange,
  placeholder,
}: PersonSearchSelectProps) => {
  const [query, setQuery] = useState('');
  const selectedPerson = value ? people.find((person) => person.id === value) : undefined;

  const filteredPeople = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const candidates = normalizedQuery
      ? people.filter((person) => {
          const haystack = normalizeSearchText([
            person.firstName,
            person.middleName,
            person.lastName,
            person.nickName,
            person.birthName,
          ].filter(Boolean).join(' '));
          return haystack.includes(normalizedQuery);
        })
      : people;

    return candidates.slice(0, 8);
  }, [people, query]);

  return (
    <div className="space-y-2">
      <label className="ds-label">{label}</label>
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-2 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>

        {selectedPerson ? (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-[var(--primary-50)] px-3 py-2 text-[var(--primary-700)]">
            <SmartAvatar person={selectedPerson} size={32} className="rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{getPersonName(selectedPerson)}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{selectedPerson.birthDate || '-'}</div>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-full p-1 text-[var(--text-muted)] hover:bg-white/80 hover:text-[var(--text-main)]"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {filteredPeople.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => {
                onChange(person.id);
                setQuery('');
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors hover:bg-[var(--surface-subtle)]"
            >
              <SmartAvatar person={person} size={34} className="rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text-main)]">{getPersonName(person)}</div>
                <div className="truncate text-[10px] text-[var(--text-muted)]">{person.birthPlace || person.birthDate || '-'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

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
  const searchPlaceholder = language === 'ar' ? 'ابحث بالاسم...' : 'Search by name...';

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
            <PersonSearchSelect
              label={t.person1}
              people={peopleList}
              value={person1Id}
              onChange={setPerson1Id}
              placeholder={searchPlaceholder}
            />

            <PersonSearchSelect
              label={t.person2}
              people={peopleList}
              value={person2Id}
              onChange={setPerson2Id}
              placeholder={searchPlaceholder}
            />

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
