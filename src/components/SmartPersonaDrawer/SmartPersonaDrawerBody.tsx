import React, { Component, type ErrorInfo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { logError } from '../../utils/errorLogger';
import type { TranslationSchema } from '../../utils/translationLoader';
import type {
  FamilyActionsProps,
  Person,
  PersonSidebarTabId,
  PersonUpdateHandler,
  TreeSettings,
  UserProfile,
} from '../../types';
import { Skeleton } from '../ui/Skeleton';

const AboutTab = React.lazy(() =>
  import('./tabs/AboutTab').then((module) => ({ default: module.AboutTab }))
);

const LinksTab = React.lazy(() =>
  import('./tabs/LinksTab').then((module) => ({ default: module.LinksTab }))
);

const MediaTab = React.lazy(() =>
  import('../sidebar/MediaTab').then((module) => ({ default: module.MediaTab }))
);

type AboutModalType = 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'map';

interface DrawerSectionErrorBoundaryProps {
  resetKey: string;
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface DrawerSectionErrorBoundaryState {
  hasError: boolean;
}

class DrawerSectionErrorBoundary extends Component<
  DrawerSectionErrorBoundaryProps,
  DrawerSectionErrorBoundaryState
> {
  public state: DrawerSectionErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): DrawerSectionErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError('SmartPersonaDrawer', error, {
      category: 'RENDER',
      severity: 'HIGH',
      metadata: { componentStack: errorInfo.componentStack },
    });
  }

  public componentDidUpdate(prevProps: DrawerSectionErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

interface SmartPersonaDrawerBodyProps {
  person: Person | null;
  people: Record<string, Person>;
  activeTab: PersonSidebarTabId;
  isEditing: boolean;
  canEdit: boolean;
  onUpdate: PersonUpdateHandler;
  onSelect: (id: string) => void;
  onOpenModal: (modalType: AboutModalType) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
  user: UserProfile | null;
  isMobileViewport: boolean;
  smartPersonaSize: string;
  tabBoundaryKey: string;
  t: TranslationSchema;
}

export const SmartPersonaDrawerBody: React.FC<SmartPersonaDrawerBodyProps> = ({
  person,
  people,
  activeTab,
  isEditing,
  canEdit,
  onUpdate,
  onSelect,
  onOpenModal,
  familyActions,
  settings,
  user,
  isMobileViewport,
  smartPersonaSize,
  tabBoundaryKey,
  t,
}) => {
  const tabLoader = (
    <div className="space-y-4 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={44} height={44} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton width="55%" height={18} />
          <Skeleton width="35%" height={14} />
        </div>
      </div>
      <Skeleton width="100%" height={80} />
      <Skeleton width="78%" height={16} />
    </div>
  );

  const drawerFallback = (
    <div className="m-1 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-6 text-center shadow-[var(--shadow-sm)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[color:rgba(179,92,75,0.12)] text-[var(--danger-600)]">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-[var(--text-main)]">Unable to render this profile section.</h3>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        The drawer frame is still active. Try switching tabs or reopening the profile.
      </p>
    </div>
  );

  return (
    <div
      className="custom-scrollbar no-drag flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:px-6"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {!canEdit && <div className="mb-5 ds-status-note">{t.readOnly}</div>}

      {!person ? (
        <div className="space-y-5 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--primary-600)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[var(--text-main)]">Loading profile...</div>
              <div className="text-xs text-[var(--text-muted)]">Preparing the person drawer.</div>
            </div>
          </div>
          <div className="ds-empty-state flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" width={96} height={96} />
              <div className="flex-1 space-y-3">
                <Skeleton width="80%" height={28} />
                <Skeleton width="40%" height={16} />
              </div>
            </div>
            <div className="h-px bg-[var(--border-main)]/80" />
          </div>
        </div>
      ) : (
        smartPersonaSize !== 'collapsed' && (
          <DrawerSectionErrorBoundary resetKey={tabBoundaryKey} fallback={drawerFallback}>
            <React.Suspense fallback={tabLoader}>
              {activeTab === 'about' && (
                <div id="sidebar-panel-about" role="tabpanel" aria-labelledby="sidebar-tab-about">
                  <AboutTab
                    person={person}
                    people={people}
                    isEditing={isEditing}
                    canEdit={canEdit}
                    onUpdate={onUpdate}
                    onSelect={onSelect}
                    onOpenModal={onOpenModal}
                    familyActions={familyActions}
                    settings={settings}
                    isMobileLayout={isMobileViewport}
                  />
                </div>
              )}
              {activeTab === 'links' && (
                <div id="sidebar-panel-links" role="tabpanel" aria-labelledby="sidebar-tab-links">
                  <LinksTab
                    person={person}
                    people={people}
                    onSelect={onSelect}
                    isEditing={isEditing}
                    onUpdate={onUpdate}
                    familyActions={familyActions}
                    settings={settings}
                    isMobileLayout={isMobileViewport}
                  />
                </div>
              )}
              {activeTab === 'media' && (
                <div id="sidebar-panel-media" role="tabpanel" aria-labelledby="sidebar-tab-media">
                  <MediaTab person={person} onUpdate={onUpdate} isEditing={isEditing} user={user} />
                </div>
              )}
            </React.Suspense>
          </DrawerSectionErrorBoundary>
        )
      )}
    </div>
  );
};
