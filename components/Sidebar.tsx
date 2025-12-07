import React, { useState, useEffect, useMemo, memo } from 'react';
import { X } from 'lucide-react';
import { InfoTab } from './sidebar/InfoTab';
import { PartnersTab } from './sidebar/PartnersTab';
import { ContactTab } from './sidebar/ContactTab';
import { BioTab } from './sidebar/BioTab';
import { MediaTab } from './sidebar/MediaTab';
import { SourcesTab } from './sidebar/SourcesTab'; // Import SourcesTab
import { EventsTab } from './sidebar/EventsTab'; // Import new EventsTab
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarTabs } from './sidebar/SidebarTabs';
import { Person, Language, UserProfile, FamilyActionsProps } from '../types';
import { useTranslation } from '../context/TranslationContext';

interface SidebarProps {
  person: Person;
  people: Record<string, Person>;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isOpen: boolean; 
  onClose: () => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  user: UserProfile | null;
  familyActions: FamilyActionsProps;
  onOpenCleanTreeOptions: () => void; // New prop
  onTriggerImportFile: () => void; // New prop
}

export const Sidebar: React.FC<SidebarProps> = memo(({
  person, people, onUpdate, onDelete, onSelect, isOpen, onClose, onOpenModal, user,
  familyActions, onOpenCleanTreeOptions, onTriggerImportFile // Destructure new props
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'info' | 'partners' | 'bio' | 'contact' | 'media' | 'sources' | 'events'>('info'); // Add 'events' to activeTab
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when person changes
  useEffect(() => {
    setIsEditing(false);
    if (activeTab === 'partners' && person.spouses.length === 0) {
        setActiveTab('info');
    }
  }, [person.id]);

  // Tab definitions
  const tabs = useMemo(() => [
    { id: 'info', label: t.profile, show: true },
    { id: 'partners', label: t.partners, show: person.spouses.length > 0 },
    { id: 'contact', label: t.contact, show: true },
    { id: 'bio', label: t.bio, show: true },
    { id: 'media', label: t.galleryTab, show: true },
    { id: 'sources', label: t.sourcesTab, show: true },
    { id: 'events', label: t.eventsTab, show: true } // Add Events tab
  ], [person.spouses.length, t]);

  return (
    <>
        {/* Mobile Overlay */}
        {isOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-in fade-in" onClick={onClose} />
        )}

        {/* Sidebar Container */}
        <div className={`
            fixed md:relative inset-y-0 start-0 z-40
            w-[360px] h-full
            bg-white dark:bg-stone-900 border-e border-stone-200/50 dark:border-stone-800/50 
            flex flex-col shadow-xl transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : 'translate-x-[-100%] rtl:translate-x-[100%]'} md:!transform-none
        `}>
        
            {/* Header / Tabs */}
            <SidebarTabs 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                tabs={tabs} 
                onClose={onClose} 
            />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-700 bg-white dark:bg-stone-900">
                {activeTab === 'info' && (
                    <InfoTab 
                        person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect}
                        onOpenModal={onOpenModal}
                        familyActions={familyActions}
                    />
                )}
                {activeTab === 'partners' && <PartnersTab person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect} />}
                {activeTab === 'contact' && <ContactTab person={person} isEditing={isEditing} onUpdate={onUpdate} />}
                {activeTab === 'bio' && <BioTab person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} />}
                {activeTab === 'media' && <MediaTab person={person} isEditing={isEditing} onUpdate={onUpdate} user={user} />}
                {activeTab === 'sources' && <SourcesTab person={person} isEditing={isEditing} onUpdate={onUpdate} />}
                {activeTab === 'events' && <EventsTab person={person} isEditing={isEditing} onUpdate={onUpdate} />} {/* Render EventsTab */}
            </div>
            
            <SidebarFooter 
                person={person} isEditing={isEditing} setIsEditing={setIsEditing}
                onDelete={onDelete}
                onOpenCleanTreeOptions={onOpenCleanTreeOptions} // Pass the new prop
            />
        </div>
    </>
  );
});