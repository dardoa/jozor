import React from 'react';
import { Info } from 'lucide-react';

import type { Person } from '../../types';
import type { TranslationSchema } from '../../utils/translationLoader';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { FormField } from '../ui/FormField';
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
}) => (
  <Card title={t.workInterests} tone="flat">
    {!hasWorkInterests && !isEditing ? (
      <EmptyState
        icon={<Info className="w-8 h-8" />}
        title={t.noWorkInterests}
      />
    ) : (
      <div className="space-y-3 pt-2">
        <FormField
          label={t.profession}
          value={person.profession || ''}
          onCommit={(value: string | number) => onChange('profession', value)}
          disabled={!isEditing}
          placeholder={isEditing ? t.professionPlaceholder : ''}
          labelWidthClass="w-24"
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
