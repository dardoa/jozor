import * as React from 'react';

import { Person } from '../types';
import { SharedTreeLoader } from './SharedTreeLoader';
import { WelcomeScreen } from './WelcomeScreen';
import { AppLayout } from './AppLayout';
import { TreeSelector } from './TreeSelector';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { ModalManagerContainer } from './ModalManagerContainer';
import { HelpCenter } from './HelpCenter';
import { useAppOrchestration } from '../hooks/useAppOrchestration';

interface AppUIManagerProps {
  sharedTreeParams: { ownerUid: string; fileId: string } | null;
  setSharedTreeParams: (value: { ownerUid: string; fileId: string } | null) => void;
}

export const AppUIManager: React.FC<AppUIManagerProps> = ({
  sharedTreeParams,
  setSharedTreeParams,
}) => {
  const orchestrationObj = useAppOrchestration(!!sharedTreeParams);
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

  // Expose Debug Helpers
  React.useEffect(() => {
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
      setSharedTreeParams(null);
      welcomeScreen.setShowWelcome(false);
    } else {
      // Legacy Drive-centric sharing
      googleSync.handleLoadDriveFile(fileId)
        .catch((e) => {
          console.error('Failed to handle shared tree load via Google Sync', e);
        })
        .finally(() => {
          setSharedTreeParams(null);
          welcomeScreen.setShowWelcome(false);
        });
    }
  };


  const renderContent = () => {
    const path = window.location.pathname;
    if (path === '/help' || path === '/support') {
      return <HelpCenter />;
    }

    if (sharedTreeParams) {
      return (
        <SharedTreeLoader
          ownerUid={sharedTreeParams.ownerUid}
          fileId={sharedTreeParams.fileId}
          auth={auth}
          onLoadComplete={handleSharedTreeLoaded}
          onCancel={() => {
            setSharedTreeParams(null);
            window.history.pushState({}, '', '/');
          }}
        />
      );
    }

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
        aria-label='Import Family Tree File'
      />

      {renderContent()}

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
