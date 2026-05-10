import React, { memo, useEffect, useState } from 'react';
import { BriefcaseBusiness, Info, Mail } from 'lucide-react';

import { FamilyActionsProps, Person, PersonUpdateHandler, TreeSettings } from '../../../types';
import { useTranslation } from '../../../context/TranslationContext';
import { AboutSectionContent } from './AboutSectionContent';
import { AboutSectionPicker } from './AboutSectionPicker';
import type { AboutSectionCard, AboutSectionId } from './aboutTypes';

interface AboutTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  canEdit: boolean;
  onUpdate: PersonUpdateHandler;
  onSelect: (id: string) => void;
  onOpenModal: (
    modalType:
      | 'calculator'
      | 'stats'
      | 'chat'
      | 'consistency'
      | 'timeline'
      | 'map'
  ) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
  isMobileLayout?: boolean;
}

export const AboutTab = memo<AboutTabProps>(
  ({ person, people, isEditing, canEdit, onUpdate, onSelect, onOpenModal, familyActions, settings, isMobileLayout = false }) => {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState<AboutSectionId>('overview');

    useEffect(() => {
      setActiveSection('overview');
    }, [person.id]);

    const sectionCards: AboutSectionCard[] = [
      {
        id: 'overview',
        label: t.aboutSections.overview,
        icon: Info,
        blurb: t.aboutSections.overviewBlurb,
      },
      {
        id: 'workBio',
        label: t.aboutSections.workBio,
        icon: BriefcaseBusiness,
        blurb: t.aboutSections.workBioBlurb,
      },
      {
        id: 'contact',
        label: t.aboutSections.contact,
        icon: Mail,
        blurb: t.aboutSections.contactBlurb,
      },
    ];

    if (isMobileLayout && !isEditing) {
      return (
        <div className="space-y-5">
          <AboutSectionPicker
            activeSection={activeSection}
            sections={sectionCards}
            title={t.aboutSections.title}
            description={t.aboutSections.description}
            onChange={setActiveSection}
          />

          <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-1 shadow-[var(--shadow-sm)]">
            <AboutSectionContent
              section={activeSection}
              person={person}
              people={people}
              isEditing={isEditing}
              canEdit={canEdit}
              onUpdate={onUpdate}
              onSelect={onSelect}
              onOpenModal={onOpenModal}
              familyActions={familyActions}
              settings={settings}
              padded
            />
          </section>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-8">
        <section>
          <AboutSectionContent
            section="overview"
            person={person}
            people={people}
            isEditing={isEditing}
            canEdit={canEdit}
            onUpdate={onUpdate}
            onSelect={onSelect}
            onOpenModal={onOpenModal}
            familyActions={familyActions}
            settings={settings}
          />
        </section>

        <section>
          <AboutSectionContent
            section="workBio"
            person={person}
            people={people}
            isEditing={isEditing}
            canEdit={canEdit}
            onUpdate={onUpdate}
            onSelect={onSelect}
            onOpenModal={onOpenModal}
            familyActions={familyActions}
            settings={settings}
          />
        </section>

        <section>
          <AboutSectionContent
            section="contact"
            person={person}
            people={people}
            isEditing={isEditing}
            canEdit={canEdit}
            onUpdate={onUpdate}
            onSelect={onSelect}
            onOpenModal={onOpenModal}
            familyActions={familyActions}
            settings={settings}
          />
        </section>
      </div>
    );
  }
);
