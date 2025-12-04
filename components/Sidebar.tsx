import React, { useState, useEffect, useMemo, memo } from 'react';
import { X } from 'lucide-react';
import { InfoTab } from './sidebar/InfoTab';
import { PartnersTab } from './sidebar/PartnersTab';
import { ContactTab } from './sidebar/ContactTab';
import { BioTab } from './sidebar/BioTab';
import { MediaTab } from './sidebar/MediaTab';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarTabs } from './sidebar/SidebarTabs';
import { getTranslation } from '../utils/translations';
import { Person, Language, UserProfile, FamilyActionsProps } from '../types';

interface SidebarProps {
  person: Person;
  people: Record<string, Person>;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  language: Language;
  isOpen: boolean; 
  onClose: () => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  user: UserProfile | null;
  familyActions: FamilyActionsProps; // New grouped prop
}

export const Sidebar: React.FC<SidebarProps> = memo(({
  person, people, onUpdate, onDelete, onSelect, language, isOpen, onClose, onOpenModal, user,
  familyActions // Destructure new grouped prop
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'partners' | 'bio' | 'contact' | 'media'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const t = getTranslation(language);

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
    { id: 'media', label: t.galleryTab, show: true }
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
                        person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect} t={t}
                        onOpenModal={onOpenModal}
                        familyActions={familyActions} // Pass new grouped prop
                    />
                )}
                {activeTab === 'partners' && <PartnersTab person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect} t={t} />}
                {activeTab === 'contact' && <ContactTab person={person} isEditing={isEditing} onUpdate={onUpdate} t={t} />}
                {activeTab === 'bio' && <BioTab person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} t={t} />}
                {activeTab === 'media' && <MediaTab person={person} isEditing={isEditing} onUpdate={onUpdate} t={t} user={user} />}
            </div>
            
            <SidebarFooter 
                person={person} isEditing={isEditing} setIsEditing={setIsEditing}
                onDelete={onDelete} t={t}
                familyActions={familyActions} // Pass new grouped prop
            />
        </div>
    </>
  );
});