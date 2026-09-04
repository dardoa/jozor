import { memo, useEffect, useState } from 'react';
import { BriefcaseBusiness, ChevronDown, Info, Mail } from 'lucide-react';

import { FamilyActionsProps, Person, PersonUpdateHandler, SmartPersonaFieldId, TreeSettings } from '../../../../types';
import { useTranslation } from '../../../../context/TranslationContext';
import { AboutSectionContent } from './AboutSectionContent';
// AboutSectionPicker removed in favor of mobile Accordion layout
import type { AboutSectionCard, AboutSectionId } from '../../types';

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
  targetSection?: AboutSectionId | 'relationships' | null;
  targetField?: SmartPersonaFieldId | null;
}

const createDefaultExpandedSections = (): Record<AboutSectionId, boolean> => ({
  overview: true,
  workBio: false,
  contact: false,
});

interface ExpandedSectionsState {
  personId: string;
  sections: Record<AboutSectionId, boolean>;
}

export const AboutTab = memo<AboutTabProps>(
  ({ person, people, isEditing, canEdit, onUpdate, onSelect, onOpenModal, familyActions, settings, isMobileLayout = false, targetSection, targetField }) => {
    const { t } = useTranslation();
    const [expandedSectionsState, setExpandedSectionsState] = useState<ExpandedSectionsState>(() => ({
      personId: person.id,
      sections: createDefaultExpandedSections(),
    }));
    const expandedSections = expandedSectionsState.personId === person.id
      ? expandedSectionsState.sections
      : createDefaultExpandedSections();

    useEffect(() => {
      if (!isMobileLayout || isEditing || !targetSection || targetSection === 'relationships') return;
      const frame = window.requestAnimationFrame(() => {
        setExpandedSectionsState((previous) => ({
          personId: person.id,
          sections: {
            ...(previous.personId === person.id
              ? previous.sections
              : createDefaultExpandedSections()),
            [targetSection]: true,
          },
        }));
      });
      return () => window.cancelAnimationFrame(frame);
    }, [isEditing, isMobileLayout, person.id, targetSection]);

    const toggleSection = (id: AboutSectionId) => {
      setExpandedSectionsState((previous) => {
        const sections = previous.personId === person.id
          ? previous.sections
          : createDefaultExpandedSections();
        return {
          personId: person.id,
          sections: {
            ...sections,
            [id]: !sections[id],
          },
        };
      });
    };

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
        <div className="divide-y divide-[var(--border-soft)] animate-in fade-in duration-300">
          {sectionCards.map((card) => {
            const isExpanded = expandedSections[card.id];
            const Icon = card.icon;

            return (
              <div
                key={card.id}
                data-smart-persona-section={card.id}
                data-smart-persona-expanded={isExpanded ? 'true' : 'false'}
                tabIndex={-1}
                className="scroll-mt-4 overflow-hidden rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50"
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(card.id)}
                  className="flex w-full items-center justify-between p-2.5 px-3.5 text-start cursor-pointer hover:bg-[var(--surface-subtle)] transition-colors duration-200"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg transition-all duration-200 ${isExpanded ? 'bg-[var(--primary-50)] text-[var(--primary-600)]' : 'bg-[var(--surface-subtle)] text-[var(--text-dim)]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-extrabold text-[var(--text-main)]">{card.label}</h3>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-dim)] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[var(--primary-600)]' : ''}`}
                  />
                </button>

                {/* Content area with smooth transition */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? 'max-h-[1000px] border-t border-[var(--border-soft)] opacity-100'
                      : 'max-h-0 overflow-hidden opacity-0'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <AboutSectionContent
                      section={card.id}
                      person={person}
                      people={people}
                      isEditing={isEditing}
                      canEdit={canEdit}
                      onUpdate={onUpdate}
                      onSelect={onSelect}
                      onOpenModal={onOpenModal}
                      familyActions={familyActions}
                      settings={settings}
                      targetField={targetField}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-8">
        <section data-smart-persona-section="overview" tabIndex={-1} className="scroll-mt-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50">
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
            targetField={targetField}
          />
        </section>

        <section data-smart-persona-section="workBio" tabIndex={-1} className="scroll-mt-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50">
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
            targetField={targetField}
          />
        </section>

        <section data-smart-persona-section="contact" tabIndex={-1} className="scroll-mt-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50">
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
            targetField={targetField}
          />
        </section>
      </div>
    );
  }
);
