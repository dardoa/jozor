import { useState, useEffect, useMemo, memo, useRef } from 'react';
import { InfoTab } from './sidebar/InfoTab';
import { PartnersTab } from './sidebar/PartnersTab';
import { ContactTab } from './sidebar/ContactTab';
import { BioTab } from './sidebar/BioTab';
import { MediaTab } from './sidebar/MediaTab';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarTabs } from './sidebar/SidebarTabs';
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
      const allTabs = [
        { id: 'info', label: t.profile, show: true, priority: 1 },
        { id: 'partners', label: t.partners, show: !!(person.spouses && person.spouses.length > 0), priority: 3 },
        { id: 'bio', label: t.biography, show: true, priority: 2 },
        { id: 'contact', label: t.contact, show: true, priority: 4 },
        { id: 'media', label: t.galleryTab, show: true, priority: 5 },
      ] as { id: 'info' | 'partners' | 'bio' | 'contact' | 'media'; label: string; show: boolean; priority: number }[];

      // Note: On mobile < 640px, SidebarTabs already handles the overflow-x-auto scroll.
      return allTabs.filter(tab => tab.show);
    }, [person.spouses, t]);

    // Removal of early return to allow transitions to play

    // --- Swipe-to-Close Logic ---
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
      // Only allow dragging from the top area or handle
      const target = e.target as HTMLElement;
      if (target.closest('.no-drag')) return;
      
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) return;
      const currentY = e.touches[0].clientY;
      const deltaY = Math.max(0, currentY - startYRef.current);
      setDragY(deltaY);
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      if (dragY > 100) {
        onClose();
      }
      setDragY(0);
    };

    return (
      <>
        {/* Backdrop for Mobile */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[90] sm:hidden animate-in fade-in duration-300"
            onClick={onClose}
          />
        )}

        <aside
          className={`fixed inset-x-0 bottom-0 sm:inset-y-0 z-[100] w-full sm:w-[450px] h-[75vh] sm:h-full bg-[var(--theme-bg)] border-t sm:border-t-0 border-[var(--border-main)] flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.3)] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] rounded-t-[32px] sm:rounded-none sm:end-0 sm:start-auto sm:border-inline-start-0 ltr:sm:start-0 ltr:sm:end-auto ltr:sm:border-r rtl:sm:right-0 rtl:sm:left-auto rtl:sm:border-l ${
            isOpen
              ? 'translate-y-0 sm:translate-x-0'
              : `translate-y-full ltr:sm:-translate-x-full rtl:sm:translate-x-full pointer-events-none`
          }`}
          style={{ 
            transform: (isDragging && isOpen) ? `translateY(${dragY}px)` : undefined,
            transition: isDragging ? 'none' : undefined
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          id="person-sidebar"
        >
          {/* Mobile Drag Handle - Interactive Handle */}
          <div 
            className="flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing translate-y-0 active:scale-95 transition-transform"
          >
            <div className="w-12 h-1.5 rounded-full bg-[var(--border-main)] opacity-30" />
          </div>

          <div className="no-drag">
             <SidebarTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                onClose={onClose}
              />
          </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar no-drag">
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

        <div className="no-drag">
            <SidebarFooter
              person={person}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              onDelete={onDelete}
              onOpenCleanTreeOptions={onOpenCleanTreeOptions}
              canEdit={canEdit}
              isOwner={isOwner}
            />
        </div>

        </aside>
      </>
    );
  }
);

