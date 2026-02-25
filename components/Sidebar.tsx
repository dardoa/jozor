import { useState, useEffect, useMemo, memo } from 'react';
import { InfoTab } from './sidebar/InfoTab';
import { PartnersTab } from './sidebar/PartnersTab';
import { ContactTab } from './sidebar/ContactTab';
import { BioTab } from './sidebar/BioTab';
import { MediaTab } from './sidebar/MediaTab';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarTabs } from './sidebar/SidebarTabs';
import { ConfirmationModal } from './ConfirmationModal';
import { Person, FamilyActionsProps, ModalStateAndActions, TreeSettings, UserProfile } from '../types';
import { useTranslation } from '../context/TranslationContext';

interface SidebarProps {
  person: Person;
  people: Record<string, Person>;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (type: any, data?: any) => void;
  familyActions: FamilyActionsProps;
  onOpenCleanTreeOptions: ModalStateAndActions['onOpenCleanTreeOptions'];
  settings: TreeSettings;
  user: UserProfile | null;
  canEdit?: boolean;
  isOwner?: boolean;
}

export const Sidebar = memo<SidebarProps>(
  ({
    person,
    people,
    onUpdate,
    onDelete,
    onSelect,
    isOpen,
    onClose,
    onOpenModal,
    familyActions,
    onOpenCleanTreeOptions,
    settings,
    user,
    canEdit = true,
    isOwner = true,
  }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'info' | 'partners' | 'bio' | 'contact' | 'media'>(
      'info'
    );
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Reset tab if partners tab becomes invalid
    useEffect(() => {
      if (activeTab === 'partners' && (!person.spouses || person.spouses.length === 0)) {
        const timer = setTimeout(() => setActiveTab('info'), 0);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [person.spouses?.length, activeTab]);

    const tabs = useMemo(() => {
      return [
        { id: 'info', label: t.profile || 'Info', show: true },
        { id: 'partners', label: t.partners || 'Partners', show: !!(person.spouses && person.spouses.length > 0) },
        { id: 'bio', label: t.biography || 'Bio', show: true },
        { id: 'contact', label: t.contact || 'Contact', show: true },
        { id: 'media', label: t.galleryTab || 'Media', show: true },
      ] as { id: 'info' | 'partners' | 'bio' | 'contact' | 'media'; label: string; show: boolean }[];
    }, [person.spouses, t]);

    if (!isOpen) return null;

    const handleDeleteClick = () => setDeleteModalOpen(true);
    const handleConfirmDelete = () => {
      onDelete(person.id);
      setDeleteModalOpen(false);
      onClose();
    };

    return (
      <aside
        className="fixed inset-y-0 right-0 z-40 w-full sm:w-[450px] md:relative bg-[var(--theme-bg-elevated)] border-l border-[var(--border-main)] flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.05)] transition-all duration-300 animate-in slide-in-from-right h-full"
        id="person-sidebar"
      >
        <SidebarTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {activeTab === 'info' && (
            <InfoTab
              person={person}
              people={people}
              isEditing={isEditing}
              onUpdate={onUpdate}
              onSelect={onSelect}
              onOpenModal={onOpenModal as any}
              familyActions={familyActions}
              settings={settings}
            />
          )}
          {activeTab === 'partners' && (
            <PartnersTab person={person} people={people} onSelect={onSelect} isEditing={isEditing} onUpdate={onUpdate} />
          )}
          {activeTab === 'bio' && <BioTab person={person} onUpdate={onUpdate} people={people} isEditing={isEditing} />}
          {activeTab === 'contact' && <ContactTab person={person} onUpdate={onUpdate} isEditing={isEditing} />}
          {activeTab === 'media' && (
            <MediaTab
              person={person}
              onUpdate={onUpdate}
              isEditing={isEditing}
              user={user}
            />
          )}
        </div>

        <SidebarFooter
          person={person}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onDelete={onDelete}
          onOpenCleanTreeOptions={onOpenCleanTreeOptions}
          canEdit={canEdit}
          isOwner={isOwner}
        />

        <ConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={t.deletePerson || 'Delete Person'}
          message={`${t.personDeleteConfirm || 'Are you sure you want to delete this person?'} (${person.firstName} ${person.lastName})`}
        />
      </aside>
    );
  }
);
