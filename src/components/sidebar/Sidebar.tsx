import React from 'react';
import { SidebarTabs } from './SidebarTabs';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import { Person, Gender } from '../../types'; // Import Gender type
import { useTranslation } from '../../context/TranslationContext';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const tabs = [
    { id: 'info', label: t.info, show: true },
    { id: 'partners', label: t.partners, show: true },
    { id: 'bio', label: t.bio, show: true },
    { id: 'contact', label: t.contact, show: true },
    { id: 'media', label: t.media, show: true },
  ];
  const [activeTab, setActiveTab] = React.useState<'info' | 'partners' | 'bio' | 'contact' | 'media'>('info');

  // Dummy data for FamilyRelationshipsSection
  const dummyPerson: Person = {
    id: '1',
    name: 'Dummy Person',
    gender: 'male',
    parents: ['p1', 'p2'],
    spouses: ['s1'],
    children: ['c1', 'c2'],
  };
  const dummyPeople: Record<string, Person> = {
    '1': dummyPerson,
    'p1': { id: 'p1', name: 'Parent 1', gender: 'male', parents: [], spouses: [], children: ['1'] },
    'p2': { id: 'p2', name: 'Parent 2', gender: 'female', parents: [], spouses: [], children: ['1'] },
    's1': { id: 's1', name: 'Spouse 1', gender: 'female', parents: [], spouses: ['1'], children: ['c1', 'c2'] },
    'c1': { id: 'c1', name: 'Child 1', gender: 'male', parents: ['1', 's1'], spouses: [], children: [] },
    'c2': { id: 'c2', name: 'Child 2', gender: 'female', parents: ['1', 's1'], spouses: [], children: [] },
  };
  const dummyFamilyActions = {
    onAddParent: (g: Gender) => console.log(`Add parent ${g}`),
    onAddSpouse: (g: Gender) => console.log(`Add spouse ${g}`),
    onAddChild: (g: Gender) => console.log(`Add child ${g}`),
    onRemoveRelationship: (pId: string, rId: string, type: 'parent' | 'spouse' | 'child') => console.log(`Remove ${type} relationship between ${pId} and ${rId}`),
  };

  return (
    <aside className="w-80 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col">
      <SidebarTabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} onClose={() => {}} />
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Sidebar content based on activeTab */}
        {activeTab === 'info' && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-stone-100">{t.familyRelationships}</h2>
            <FamilyRelationshipsSection
              person={dummyPerson}
              people={dummyPeople}
              isEditing={true}
              onUpdate={() => {}}
              onSelect={() => {}}
              familyActions={dummyFamilyActions}
            />
          </div>
        )}
        {activeTab === 'partners' && <p className="text-stone-500 dark:text-stone-400">Partners content.</p>}
        {activeTab === 'bio' && <p className="text-stone-500 dark:text-stone-400">Biography content.</p>}
        {activeTab === 'contact' && <p className="text-stone-500 dark:text-stone-400">Contact content.</p>}
        {activeTab === 'media' && <p className="text-stone-500 dark:text-stone-400">Media content.</p>}
      </div>
    </aside>
  );
};