import * as React from 'react';
import { Routes, Route, Navigate, useMatch, useNavigate, useParams, useLocation } from 'react-router-dom';

import { Person, AuthProps } from '../types';
import { SharedTreeLoader } from './SharedTreeLoader';
import { WelcomeScreen } from './WelcomeScreen';
import { AppLayout } from './AppLayout';
import { TreeSelector } from './TreeSelector';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { ModalManagerContainer } from './ModalManagerContainer';
import { useAppOrchestration } from '../hooks/useAppOrchestration';
import { NotFound } from './NotFound';
import { useTranslation } from '../context/TranslationContext';

const HelpCenter = React.lazy(() => import('./HelpCenter').then(m => ({ default: m.HelpCenter })));

export const AppUIManager: React.FC = () => {
  const { t } = useTranslation();
  const sharedMatch = useMatch('/tree/:ownerUid/:fileId');
  const isSharedMode = !!sharedMatch;
  const orchestrationObj = useAppOrchestration(isSharedMode);
  const navigate = useNavigate();
  const {
    appState,
    welcomeScreen,
    modals,
    googleSync,
    historyControls,
    themeLanguage,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    sidebarFamilyActions,
    coreFamilyActions,
    isPresentMode,
    setIsPresentMode,
    sidebarOpen,
    setSidebarOpen,
    auth,
    svgRef,
    isActivityLogOpen,
    setActivityLogOpen,
  } = orchestrationObj;
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);

  // Expose Debug Helpers ONLY in development
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).jozorDebug = {
        clearSyncQueue: async () => {
          const { deltaSyncService } = await import('../services/deltaSyncService');
          await deltaSyncService.clearOutgoingQueue();
        },
        forceSync: async () => {
          const { deltaSyncService } = await import('../services/deltaSyncService');
          await deltaSyncService.flushOutgoingBatch();
        },
        getQueueSize: async () => {
          // This is a bit hacky as queue is private, but good for debug
          console.log('Check console logs for queue status');
        }
      };
      console.log('🔧 Jozor Debug Tools available via window.jozorDebug');
      
      return () => {
        delete (window as any).jozorDebug;
      };
    }
  }, []);

  const { fileInputRef, onFileUpload, showWelcome, handleStartNewTree } = welcomeScreen;

  const handleSharedTreeLoaded = (
    data: Record<string, Person>,
    fileId: string,
    isDbTree: boolean,
    role: 'owner' | 'editor' | 'viewer' = 'owner'
  ) => {
    if (isDbTree) {
      // Modern DB-centric sharing (independent of Google Drive)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (uuidRegex.test(fileId)) {
        setCurrentTreeId(fileId);
        setCurrentUserRole(role);
      } else {
        console.warn(`[AppUIManager] handleSharedTreeLoaded: Invalid Tree ID detected (${fileId}). Loading as local-only.`);
        // We do NOT set currentTreeId, so it stays null (local mode)
        // But we still load the data below
      }

      loadFullState({
        version: 1,
        people: data,
        settings: {},
      });
      navigate('/', { replace: true });
      welcomeScreen.setShowWelcome(false);
    } else {
      // Legacy Drive-centric sharing
      googleSync.handleLoadDriveFile(fileId)
        .catch((e) => {
          console.error('Failed to handle shared tree load via Google Sync', e);
        })
        .finally(() => {
          navigate('/', { replace: true });
          welcomeScreen.setShowWelcome(false);
        });
    }
  };


  const renderMainLayout = () => {
    if (showWelcome) {
      return (
        <WelcomeScreen
          onStartNew={handleStartNewTree}
          onImport={welcomeScreen.onTriggerImportFile}
          onLogin={auth.onOpenLoginModal}
        />
      );
    }

    if (!showWelcome && auth.user && !currentTreeId) {
      return (
        <TreeSelector
          ownerId={auth.user.uid}
          userEmail={auth.user.email || ''}
          currentTreeId={currentTreeId}
          supabaseToken={auth.user.supabaseToken}
          onTreeSelected={(id, role) => {
            setCurrentTreeId(id);
            setCurrentUserRole(role);
          }}
        />
      );
    }

    return (
      <AppLayout
        appState={appState}
        modals={modals}
        googleSync={googleSync}
        welcomeScreen={welcomeScreen}
        historyControls={historyControls}
        themeLanguage={themeLanguage}
        viewSettings={viewSettings}
        toolsActions={toolsActions}
        exportActions={exportActions}
        searchProps={searchProps}
        sidebarFamilyActions={sidebarFamilyActions}
        coreFamilyActions={coreFamilyActions}
        isPresentMode={isPresentMode}
        setIsPresentMode={setIsPresentMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        auth={auth}
        svgRef={svgRef}
        isActivityLogOpen={isActivityLogOpen}
        setActivityLogOpen={setActivityLogOpen}
      />
    );
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept='.json,.ged,.jozor,.zip'
        className='hidden'
        onChange={onFileUpload}
        aria-label={t.header.importFile}
      />

      <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--theme-bg)] text-[var(--text-main)] animate-pulse">{t.loading}</div>}>
        <Routes>
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/support" element={<Navigate to="/help" replace />} />
          
          {/* Clean DB tree route (new format) */}
          <Route 
            path="/tree/db/:ownerUid/:fileId" 
            element={
              <SharedTreeRouteWrapper 
                auth={auth} 
                isDbTree={true}
                onLoadComplete={handleSharedTreeLoaded} 
                onCancel={() => navigate('/', { replace: true })} 
              />
            } 
          />

          {/* Legacy route — redirects ?type=db to new /tree/db path, otherwise loads Drive tree */}
          <Route 
            path="/tree/:ownerUid/:fileId" 
            element={<LegacySharedTreeRedirect auth={auth} onLoadComplete={handleSharedTreeLoaded} onCancel={() => navigate('/', { replace: true })} />} 
          />

          <Route path="/" element={renderMainLayout()} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </React.Suspense>

      <ModalManagerContainer
        appState={appState}
        modals={modals}
        googleSync={googleSync}
        welcomeScreen={welcomeScreen}
        familyActions={coreFamilyActions}
        themeLanguage={themeLanguage}
        auth={auth}
      />
    </>
  );
};

interface SharedTreeRouteWrapperProps {
  auth: AuthProps;
  onLoadComplete: (data: Record<string, Person>, fileId: string, isDbTree: boolean, role?: 'owner' | 'editor' | 'viewer') => void;
  onCancel: () => void;
  isDbTree?: boolean;
}

const SharedTreeRouteWrapper: React.FC<SharedTreeRouteWrapperProps> = ({ auth, onLoadComplete, onCancel, isDbTree }) => {
  const { ownerUid, fileId } = useParams<{ ownerUid: string; fileId: string }>();
  if (!ownerUid || !fileId) return <Navigate to="/" replace />;
  
  return (
    <SharedTreeLoader
      ownerUid={ownerUid}
      fileId={fileId}
      auth={auth}
      onLoadComplete={onLoadComplete}
      onCancel={onCancel}
      isDbTree={isDbTree}
    />
  );
};

/**
 * LegacySharedTreeRedirect
 * Handles old links: /tree/:ownerUid/:fileId?type=db
 * If ?type=db is present → redirects to /tree/db/:ownerUid/:fileId (new clean route)
 * Otherwise → renders shared Drive tree as before
 */
const LegacySharedTreeRedirect: React.FC<SharedTreeRouteWrapperProps> = ({ auth, onLoadComplete, onCancel }) => {
  const { ownerUid, fileId } = useParams<{ ownerUid: string; fileId: string }>();
  const location = useLocation();
  const isDbTree = new URLSearchParams(location.search).get('type') === 'db';

  if (!ownerUid || !fileId) return <Navigate to="/" replace />;

  // Upgrade old link to the clean URL format
  if (isDbTree) {
    return <Navigate to={`/tree/db/${ownerUid}/${fileId}`} replace />;
  }

  // Legacy Drive tree link (no ?type=db) — render as before
  return (
    <SharedTreeLoader
      ownerUid={ownerUid}
      fileId={fileId}
      auth={auth}
      onLoadComplete={onLoadComplete}
      onCancel={onCancel}
    />
  );
};
