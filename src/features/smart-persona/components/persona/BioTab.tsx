import { lazy, memo, Suspense } from 'react';

import type { Person } from '../../../../types';
import { useTranslation } from '../../../../context/TranslationContext';
import { BioWorkInterestsCard } from './BioWorkInterestsCard';
import { usePersonBio } from './usePersonBio';

const BioBiographySection = lazy(() =>
  import('./BioBiographySection').then((module) => ({ default: module.BioBiographySection }))
);
const BioSourcesSection = lazy(() =>
  import('./BioSourcesSection').then((module) => ({ default: module.BioSourcesSection }))
);
const BioEventsSection = lazy(() =>
  import('./BioEventsSection').then((module) => ({ default: module.BioEventsSection }))
);

interface BioTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const BioTab = memo<BioTabProps>(({ person, people, isEditing, onUpdate }) => {
  const { t } = useTranslation();
  const bio = usePersonBio({ person, people, isEditing, onUpdate, t });

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @keyframes bioTimelineFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <BioWorkInterestsCard
        person={person}
        isEditing={isEditing}
        hasWorkInterests={bio.hasWorkInterests}
        t={t}
        onChange={bio.updateEditableField}
      />

      <Suspense fallback={null}>
        <BioBiographySection
          person={person}
          isEditing={isEditing}
          isOpen={bio.expandedSections.bio}
          hasBio={bio.hasBio}
          bioTone={bio.bioTone}
          isGenerating={bio.isGenerating}
          t={t}
          onToggle={() => bio.toggleSection('bio')}
          onToneChange={bio.setBioTone}
          onGenerate={bio.handleGenerateBio}
          onChange={bio.updateEditableField}
        />
      </Suspense>

      <Suspense fallback={null}>
        <BioSourcesSection
          person={person}
          isEditing={isEditing}
          isOpen={bio.expandedSections.sources}
          hasSources={bio.hasSources}
          t={t}
          draft={bio.sourceDraft}
          onToggle={() => bio.toggleSection('sources')}
          onAdd={bio.addSource}
          onUpdate={bio.updateSource}
          onRemove={bio.removeSource}
        />
      </Suspense>

      <Suspense fallback={null}>
        <BioEventsSection
          person={person}
          isEditing={isEditing}
          isOpen={bio.expandedSections.events}
          hasEvents={bio.hasEvents}
          groupedLifeEvents={bio.groupedLifeEvents}
          t={t}
          draft={bio.eventDraft}
          onToggle={() => bio.toggleSection('events')}
          onAdd={bio.addEvent}
          onUpdate={bio.updateEvent}
          onRemove={bio.removeEvent}
        />
      </Suspense>
    </div>
  );
});
