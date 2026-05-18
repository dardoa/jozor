import React, { lazy, memo, Suspense } from 'react';
import { useTranslation } from '../../../../context/TranslationContext';
import { GitBranchPlus, Heart, HeartHandshake, Users } from 'lucide-react';

import { FamilyActionsProps, Person, TreeSettings } from '../../../../types';
import { calculateAgeAtEvent, calculateAgeDifference } from '../../../../domain/relationshipCalculations';
import { sortPeopleByBirthDate } from '../../../../utils/familyLogic';
import { Card } from '../../../../components/ui/Card';

const FamilyRelationshipsSection = lazy(() =>
  import('../persona/FamilyRelationshipsSection').then((module) => ({ default: module.FamilyRelationshipsSection }))
);
const PartnersTab = lazy(() =>
  import('../persona/PartnersTab').then((module) => ({ default: module.PartnersTab }))
);

interface LinksTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
  isMobileLayout?: boolean;
}

const relationshipDetailsHelp = 'Edit marriage dates, status, and locations.';

export const LinksTab = memo<LinksTabProps>(
  ({ person, people, isEditing, onUpdate, onSelect, familyActions, settings, isMobileLayout = false }) => {
    const { t } = useTranslation();

    const firstMarriageDate = person.spouses
      .map((id) => person.partnerDetails?.[id]?.startDate)
      .filter((date): date is string => Boolean(date))
      .sort()[0];

    const firstChildDate = sortPeopleByBirthDate(
      person.children.map((id) => people[id]).filter(Boolean) as Person[]
    )[0]?.birthDate;

    const ageAtFirstMarriage = firstMarriageDate
      ? calculateAgeAtEvent(person.birthDate, firstMarriageDate)
      : null;

    const ageAtFirstChild = firstChildDate
      ? calculateAgeAtEvent(person.birthDate, firstChildDate)
      : null;

    const contextItems = [
      person.spouses.length > 0 ? {
        label: 'Age at first marriage',
        value: ageAtFirstMarriage !== null ? `${ageAtFirstMarriage} years` : 'Unknown',
        icon: HeartHandshake,
      } : null,
      person.children.length > 0 ? {
        label: 'Age at first child',
        value: ageAtFirstChild !== null ? `${ageAtFirstChild} years` : 'Unknown',
        icon: GitBranchPlus,
      } : null,
      person.parents.length > 0 ? {
        label: 'Known parents',
        value: `${person.parents.length}`,
        icon: Users,
      } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Users }>;

    return (
      <div className="flex flex-col space-y-6">
        {/* Integrated Partners Details Section */}
        {(person.spouses.length > 0 || isEditing) && (
          <section className={isMobileLayout ? 'rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-sm)]' : ''}>
            {isMobileLayout && (
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-700)]">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">{t.partners || 'Relationship Details'}</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{relationshipDetailsHelp}</p>
                </div>
              </div>
            )}
            <Suspense fallback={null}>
              <PartnersTab
                person={person}
                people={people}
                isEditing={isEditing}
                onUpdate={onUpdate}
                onSelect={onSelect}
              />
            </Suspense>
          </section>
        )}

        <section className={isMobileLayout ? 'rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-sm)]' : ''}>
          {isMobileLayout && (
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-700)]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Relationships</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Parents, spouses, children, and siblings are grouped into touch-friendly cards.</p>
              </div>
            </div>
          )}

          <Suspense fallback={null}>
            <FamilyRelationshipsSection
              person={person}
              people={people}
              isEditing={isEditing}
              onUpdate={onUpdate}
              onSelect={onSelect}
              familyActions={familyActions}
              hideSpouses={true}
            />
          </Suspense>
        </section>


        {!isEditing && (person.parents.length > 0 || person.children.length > 0 || person.spouses.length > 0) && (
          <Card title="Contextual insights" tone="flat" contentClassName="space-y-3">
            {isMobileLayout && contextItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {contextItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="min-h-[104px] rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-app)] p-4 shadow-[var(--shadow-sm)]">
                      <div className="mb-3 inline-flex rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-700)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">{item.label}</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">{item.value}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-[var(--text-main)]">
                {person.spouses.length > 0 && (
                  <li>
                    <span className="text-[var(--text-muted)]">Age at first marriage:</span>{' '}
                    <span className="font-semibold">
                      {ageAtFirstMarriage !== null ? `${ageAtFirstMarriage} years` : <span className="font-normal italic text-[var(--text-dim)]">Unknown</span>}
                    </span>
                  </li>
                )}

                {person.children.length > 0 && (
                  <li>
                    <span className="text-[var(--text-muted)]">Age at first child:</span>{' '}
                    <span className="font-semibold">
                      {ageAtFirstChild !== null ? `${ageAtFirstChild} years` : <span className="font-normal italic text-[var(--text-dim)]">Unknown</span>}
                    </span>
                  </li>
                )}

                {person.parents.map((parentId) => {
                  const parent = people[parentId];
                  if (!parent) return null;
                  const diff = calculateAgeDifference(person.birthDate, parent.birthDate);
                  return (
                    <li key={`parent-diff-${parentId}`}>
                      <span className="text-[var(--text-muted)]">Age gap with {parent.firstName}:</span>{' '}
                      <span className="font-semibold">
                        {diff !== null ? `${diff} years` : <span className="font-normal italic text-[var(--text-dim)]">Unknown</span>}
                      </span>
                    </li>
                  );
                })}

                {person.children.map((childId) => {
                  const child = people[childId];
                  if (!child) return null;
                  const diff = calculateAgeDifference(person.birthDate, child.birthDate);
                  return (
                    <li key={`child-diff-${childId}`}>
                      <span className="text-[var(--text-muted)]">Age gap with {child.firstName}:</span>{' '}
                      <span className="font-semibold">
                        {diff !== null ? `${diff} years` : <span className="font-normal italic text-[var(--text-dim)]">Unknown</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
    );
  }
);
