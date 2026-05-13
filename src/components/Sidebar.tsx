import { useEffect, useMemo, memo, useRef, useState } from 'react';
import { InfoTab } from './sidebar/InfoTab';
import { PartnersTab } from './sidebar/PartnersTab';
import { ContactTab } from './sidebar/ContactTab';
import { BioTab } from './sidebar/BioTab';
import { MediaTab } from './sidebar/MediaTab';
import { SidebarFooter } from './sidebar/SidebarFooter';
import { SidebarTabs } from './sidebar/SidebarTabs';
import {
  Person,
  FamilyActionsProps,
  PersonUpdateHandler,
  TreeSettings,
  UserProfile,
  ModalType,
  PersonSidebarTabId,
} from '../types';
import { useTranslation } from '../context/TranslationContext';
import { Skeleton } from './ui/Skeleton';
import { useAppStore } from '../store/useAppStore';

interface SidebarProps {
  person: Person;
  people: Record<string, Person>;
  onUpdate: PersonUpdateHandler;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (type: ModalType, data?: unknown) => void;
  familyActions: FamilyActionsProps;
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
    settings,
    user,
    canEdit = true,
    isOwner = true,
  }) => {
    const { t } = useTranslation();
    const activeTab = useAppStore((state) => state.personSidebarTab);
    const setActiveTab = useAppStore((state) => state.setPersonSidebarTab);
    const isEditing = useAppStore((state) => state.isPersonSidebarEditing);
    const setIsEditing = useAppStore((state) => state.setPersonSidebarEditing);
    const spouseCount = person.spouses?.length ?? 0;

    // Reset tab if partners tab becomes invalid
    useEffect(() => {
      if ((activeTab as string) === 'partners' && spouseCount === 0) {
        const timer = setTimeout(() => setActiveTab('info' as any), 0);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [activeTab, setActiveTab, spouseCount]);

    const tabs = useMemo(() => {
      const allTabs = [
        { id: 'info', label: t.profile, show: true, priority: 1 },
        { id: 'partners', label: t.partners, show: !!(person.spouses && person.spouses.length > 0), priority: 3 },
        { id: 'bio', label: t.biography, show: true, priority: 2 },
        { id: 'contact', label: t.contact, show: true, priority: 4 },
        { id: 'media', label: t.galleryTab, show: true, priority: 5 },
      ] as { id: PersonSidebarTabId; label: string; show: boolean; priority: number }[];

      // Note: On mobile < 640px, SidebarTabs already handles the overflow-x-auto scroll.
      return allTabs.filter(tab => tab.show);
    }, [person.spouses, t]);

    // Removal of early return to allow transitions to play

    // --- Swipe-to-Close Logic ---
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
      // Only initiate drag from the handle or non-scrollable areas
      const target = e.target as HTMLElement;
      // Block drag if inside a scrollable content area or interactive element
      if (target.closest('.no-drag')) return;
      if (target.closest('button, a, input, select, textarea')) return;
      
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) return;
      const currentY = e.touches[0].clientY;
      const deltaY = Math.max(0, currentY - startYRef.current);
      // Only start dragging after 10px threshold to avoid accidental dismissal
      if (deltaY > 10) {
        setDragY(deltaY);
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      if (dragY > 80) {
        onClose();
      }
      setDragY(0);
    };

    return (
      <>
        {/* Backdrop for Mobile */}
        {isOpen && (
          <div
            className="ds-overlay-backdrop fixed inset-0 z-[var(--z-index-drawer)] sm:hidden animate-in fade-in duration-300"
            onClick={onClose}
          />
        )}

        <aside
          aria-label="Person details"
          className={`ds-sidebar-shell fixed inset-x-0 bottom-[56px] sm:bottom-auto sm:top-14 md:top-16 z-[40] w-full sm:w-[380px] md:w-[420px] lg:w-[450px] xl:w-[480px] h-[70vh] sm:h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] border-t sm:border-t-0 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] rounded-t-[24px] sm:rounded-none sm:end-0 sm:start-auto sm:border-inline-start-0 ltr:sm:start-0 ltr:sm:end-auto ltr:sm:border-r rtl:sm:right-0 rtl:sm:left-auto rtl:sm:border-l ${
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

          <div className="no-drag ds-sidebar-header">
             <SidebarTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                onClose={onClose}
              />
          </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-6 custom-scrollbar no-drag">
          {!canEdit && (
            <div className="mb-5 ds-status-note">
              {t.readOnly}
            </div>
          )}
          {!person ? (
            <div className="space-y-6">
              <div className="ds-empty-state flex flex-col gap-5">
              <div className="flex gap-4 items-center">
                <Skeleton variant="circular" width={112} height={112} />
                <div className="flex-1 space-y-3">
                  <Skeleton width="80%" height={32} />
                  <Skeleton width="40%" height={16} />
                </div>
              </div>
              <div className="h-px bg-[var(--border-main)]/80" />
              <div className="grid grid-cols-4 gap-2">
                <Skeleton height={32} className="rounded-2xl" />
                <Skeleton height={32} className="rounded-2xl" />
                <Skeleton height={32} className="rounded-2xl" />
                <Skeleton height={32} className="rounded-2xl" />
              </div>
              <div className="space-y-4 pt-4">
                <Skeleton height={200} />
                <Skeleton height={150} />
              </div>
              </div>
            </div>
          ) : (
            <>
              {(activeTab as string) === 'info' && (
                <div id="sidebar-panel-info" role="tabpanel" aria-labelledby="sidebar-tab-info">
                  <InfoTab
                    person={person}
                    people={people}
                    isEditing={isEditing}
                    canEdit={canEdit}
                    onUpdate={onUpdate}
                    onSelect={onSelect}
                    onOpenModal={onOpenModal as any}
                    familyActions={familyActions}
                    settings={settings}
                  />
                </div>
              )}
              {(activeTab as string) === 'partners' && (
                <div id="sidebar-panel-partners" role="tabpanel" aria-labelledby="sidebar-tab-partners">
                  <PartnersTab person={person} people={people} onSelect={onSelect} isEditing={isEditing} onUpdate={onUpdate} />
                </div>
              )}
              {(activeTab as string) === 'bio' && (
                <div id="sidebar-panel-bio" role="tabpanel" aria-labelledby="sidebar-tab-bio">
                  <BioTab person={person} onUpdate={onUpdate} people={people} isEditing={isEditing} />
                </div>
              )}
              {(activeTab as string) === 'contact' && (
                <div id="sidebar-panel-contact" role="tabpanel" aria-labelledby="sidebar-tab-contact">
                  <ContactTab person={person} onUpdate={onUpdate} isEditing={isEditing} />
                </div>
              )}
              {activeTab === 'media' && (
                <div id="sidebar-panel-media" role="tabpanel" aria-labelledby="sidebar-tab-media">
                  <MediaTab
                    person={person}
                    onUpdate={onUpdate}
                    isEditing={isEditing}
                    user={user}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="no-drag">
          <SidebarFooter
            person={person}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onDelete={onDelete}
            canEdit={canEdit}
            isOwner={isOwner}
          />
        </div>

        </aside>
      </>
    );
  }
);
