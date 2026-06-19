import { memo, useCallback } from 'react';

import { useTranslation } from '../../../context/TranslationContext';
import {
  type FamilyActionsProps,
  type ModalOpenContext,
  type ModalRouteType,
  type Person,
  type PersonUpdateHandler,
  type TreeSettings,
  type UserProfile,
} from '../../../types';
import { PersonaFooter } from './persona/PersonaFooter';
import { PersonaTabs } from './persona/PersonaTabs';
import { SmartAvatar } from '../../../components/ui/SmartAvatar';
import { SmartPersonaDrawerBody } from './SmartPersonaDrawerBody';
import { useSmartPersonaDrawerState } from '../hooks/useSmartPersonaDrawerState';

interface SmartPersonaDrawerProps {
  person: Person | null;
  people: Record<string, Person>;
  onUpdate: PersonUpdateHandler;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenModal: (type: ModalRouteType, context?: ModalOpenContext) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
  user: UserProfile | null;
  canEdit?: boolean;
}

type AboutModalType = 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'map';

export const SmartPersonaDrawer = memo<SmartPersonaDrawerProps>(
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
    canEdit = false,
  }) => {
    const { t } = useTranslation();
    const {
      activeTab,
      setActiveTab,
      isEditing,
      setIsEditing,
      smartPersonaSize,
      setSmartPersonaSize,
      dragY,
      isDragging,
      isMobileViewport,
      safeDisplayName,
      safeBirthYear,
      tabBoundaryKey,
      tabs,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      sizeClasses,
    } = useSmartPersonaDrawerState({
      person,
      isOpen,
      fallbackProfileLabel: t.profile || 'Profile',
      unnamedPersonLabel: t.unnamedPerson,
      tabLabels: {
        about: t.aboutTab || 'About',
        links: t.linksTab || 'Links',
        media: t.galleryTab || 'Media',
      },
    });

    const handleAboutModalOpen = useCallback((modalType: AboutModalType) => {
      onOpenModal(modalType, person ? { sourcePersonId: person.id } : undefined);
    }, [onOpenModal, person]);

    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-[var(--z-index-drawer)] animate-in fade-in bg-[color:rgba(24,16,12,0.16)] duration-300 sm:hidden"
            style={{ backdropFilter: 'blur(1px)' }}
            onClick={onClose}
          />
        )}

        <aside
          aria-label="Person details"
          className={`ds-persona-shell fixed inset-x-0 bottom-0 sm:bottom-auto sm:top-14 md:top-16 z-[calc(var(--z-index-drawer)+1)] flex w-full max-w-full min-h-0 flex-col border-t sm:border-t-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] rounded-t-[24px] sm:rounded-none sm:end-0 sm:start-auto sm:border-inline-start-0 ltr:sm:start-0 ltr:sm:end-auto ltr:sm:border-r rtl:sm:right-0 rtl:sm:left-auto rtl:sm:border-l ${isMobileViewport ? 'inset-0 rounded-none border-0' : ''} ${sizeClasses}`}
          style={{
            transform: isDragging && isOpen && !isMobileViewport ? `translateY(${Math.max(dragY, 0)}px)` : undefined,
            transition: isDragging ? 'none' : undefined,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => handleTouchEnd(onClose)}
          id="smart-persona-drawer"
        >
          <div className="flex translate-y-0 justify-center pb-1 pt-3 transition-transform active:scale-95 sm:hidden">
            <div className="h-1.5 w-12 rounded-full bg-[var(--border-main)] opacity-30" />
          </div>

          <div className="no-drag ds-persona-header shrink-0">
            {smartPersonaSize !== 'collapsed' && (
              <PersonaTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                onClose={onClose}
                showCloseButton={isMobileViewport}
              />
            )}

            {smartPersonaSize === 'collapsed' && person && (
              <div className="flex min-h-[88px] items-center justify-between gap-3 px-4 pb-3 pt-2">
                <div className="flex min-w-0 items-center gap-3">
                  <SmartAvatar person={person} size={44} className="rounded-full" />
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold leading-tight">{safeDisplayName}</h3>
                    <p className="mt-0.5 min-h-[18px] text-xs text-[var(--text-muted)]">{safeBirthYear || '\u00A0'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSmartPersonaSize('expanded')}
                  className="min-h-11 shrink-0 rounded-full bg-[var(--primary-100)] px-4 py-2 text-xs font-medium text-[var(--primary-600)]"
                >
                  Expand
                </button>
              </div>
            )}
          </div>

          <SmartPersonaDrawerBody
            person={person}
            people={people}
            activeTab={activeTab}
            isEditing={isEditing}
            canEdit={canEdit}
            onUpdate={onUpdate}
            onSelect={onSelect}
            onOpenModal={handleAboutModalOpen}
            familyActions={familyActions}
            settings={settings}
            user={user}
            isMobileViewport={isMobileViewport}
            smartPersonaSize={smartPersonaSize}
            tabBoundaryKey={tabBoundaryKey}
            t={t}
          />

          {smartPersonaSize !== 'collapsed' && person && (
            <div className="no-drag shrink-0">
              <PersonaFooter
                person={person}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onDelete={onDelete}
                canEdit={canEdit}
              />
            </div>
          )}
        </aside>
      </>
    );
  }
);
