import React from 'react';
import { Info } from 'lucide-react';

import type { Person } from '../../../../types';
import type { TranslationSchema } from '../../../../utils/translationLoader';
import { Card } from '../../../../components/ui/Card';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { FormField } from '../../../../components/ui/FormField';
import type { BioEditableField } from './usePersonBio';

interface BioWorkInterestsCardProps {
  person: Person;
  isEditing: boolean;
  hasWorkInterests: boolean;
  t: TranslationSchema;
  onChange: (field: BioEditableField, value: string | number) => void;
}

export const BioWorkInterestsCard: React.FC<BioWorkInterestsCardProps> = ({
  person,
  isEditing,
  hasWorkInterests,
  t,
  onChange,
}) => {
  const recordedFields = [
    { field: 'profession', label: t.profession, value: person.profession },
    { field: 'residence', label: t.residence, value: person.residence },
    { field: 'company', label: t.company, value: person.company },
    { field: 'interests', label: t.interests, value: person.interests },
  ].filter((entry) => typeof entry.value === 'string' && entry.value.trim());

  return (
    <Card title={t.workInterests} tone="flat">
      {!isEditing && !hasWorkInterests ? (
        <EmptyState
          icon={<Info className="w-8 h-8" />}
          title={t.noWorkInterests}
        />
      ) : !isEditing ? (
        <dl className="divide-y divide-[var(--border-soft)]">
          {recordedFields.map(({ field, label, value }) => (
            <div
              key={field}
              data-smart-persona-field={field}
              tabIndex={-1}
              className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.2fr)] gap-3 py-3 first:pt-1 last:pb-1 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]/50"
            >
              <dt className="text-xs font-semibold text-[var(--text-muted)]">{label}</dt>
              <dd className="min-w-0 break-words text-sm font-medium text-[var(--text-main)]">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
      <div className="space-y-3 pt-2">
        <FormField
          label={t.profession}
          value={person.profession || ''}
          onCommit={(value: string | number) => onChange('profession', value)}
          disabled={!isEditing}
          placeholder={isEditing ? t.professionPlaceholder : ''}
          labelWidthClass="w-24"
          focusTarget="profession"
        />
        <FormField
          label={t.residence}
          value={person.residence || ''}
          onCommit={(value: string | number) => onChange('residence', value)}
          disabled={!isEditing}
          labelWidthClass="w-24"
          focusTarget="residence"
        />
        <FormField
          label={t.company}
          value={person.company || ''}
          onCommit={(value: string | number) => onChange('company', value)}
          disabled={!isEditing}
          placeholder={isEditing ? t.companyPlaceholder : ''}
          labelWidthClass="w-24"
        />
        <FormField
          label={t.interests}
          value={person.interests || ''}
          onCommit={(value: string | number) => onChange('interests', value)}
          disabled={!isEditing}
          placeholder={isEditing ? t.interestsPlaceholder : ''}
          labelWidthClass="w-24"
        />
      </div>
      )}
    </Card>
  );
};
