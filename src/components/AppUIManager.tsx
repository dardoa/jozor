import * as React from 'react';

import {
  useMatch,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import { Person } from '../types';
import { isUuid } from '../utils/isUuid';

import { EMPTY_STRING } from '../constants';

import { LandingPage } from '../features/landing';

import { TreeSelector } from '../features/tree-manager';

import { useAppStore, loadFullState } from '../store/useAppStore';

import { BootstrapStatusScreen } from './app/BootstrapStatusScreen';
import {
  getRouteReturnTo,
  hasOAuthCallbackParams,
  resolveAppSurface,
} from './app/appSurfaceDecision';
import { AppRoutes } from './app/AppRoutes';
import { AppGlobalOverlays } from './app/AppGlobalOverlays';

import { useAppOrchestration } from '../hooks/ui/useAppOrchestration';
import { useJozorDebugApi } from '../hooks/utils/useJozorDebugApi';

import { NotFound } from './NotFound';

import { useTranslation } from '../context/TranslationContext';
import { MobileActionBar } from './ui/MobileActionBar';

const AppLayout = React.lazy(() =>
  import('./AppLayout').then((module) => ({ default: module.AppLayout }))
);

export const AppUIManager: React.FC = () => {
  const { t } = useTranslation();

  const dbSharedMatch = useMatch('/tree/db/:ownerUid/:fileId');
  const canonicalTreeMatch = useMatch('/tree/:treeId');
  const canonicalPersonMatch = useMatch('/person/:personId');
  const shareTokenMatch = useMatch('/shared/:shareToken');
  const location = useLocation();

  const isSharedMode = !!dbSharedMatch || !!shareTokenMatch;
  const routeTreeId = canonicalTreeMatch?.params.treeId ?? null;
  const routePersonId = canonicalPersonMatch?.params.personId ?? null;
  const routeReturnTo = getRouteReturnTo(
    location.pathname,
    location.search,
    location.hash
  );

  const orchestrationObj = useAppOrchestration(isSharedMode, routeTreeId, routePersonId);

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
    detailsPanelFamilyActions,
    coreFamilyActions,
    isPresentMode,
    setIsPresentMode,
    detailsPanelOpen,
    setDetailsPanelOpen,
    auth,
    svgRef,
    onAddPerson,
  } = orchestrationObj;

  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
  const authLoading = useAppStore((state) => state.authLoading);
  const setVaultOpen = useAppStore((state) => state.setVaultOpen);
  const setVaultTab = useAppStore((state) => state.setVaultTab);
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);
  useJozorDebugApi(welcomeScreen.setShowWelcome);

  const { fileInputRef, onFileUpload, showWelcome, handleStartNewTree } = welcomeScreen;

  const handleSharedTreeLoaded = (
    data: Record<string, Person>,
    fileId: string,
    isDbTree: boolean,
    role: 'owner' | 'editor' | 'viewer' = 'owner',
    treeName?: string
  ) => {
    if (isDbTree) {
      if (isUuid(fileId)) {
        setCurrentTreeId(fileId);
        setCurrentUserRole(role);
      } else {
        console.warn(
          `[AppUIManager] handleSharedTreeLoaded: Invalid Tree ID detected (${fileId}). Loading as local-only.`
        );
        // We do NOT set currentTreeId, so it stays null (local mode)
        // But we still load the data below
      }

      loadFullState({
        version: 1,
        people: data,
        settings: {},
        treeName,
      });
      navigate(`/tree/${fileId}`, { replace: true });
      welcomeScreen.setShowWelcome(false);
    }
  };

  const renderMainLayout = () => {
    const surface = resolveAppSurface({
      authLoading,
      hasOAuthCallback: hasOAuthCallbackParams(location.search, location.hash),
      hasUser: Boolean(auth.user),
      showWelcome,
      hasCurrentTree: Boolean(currentTreeId),
      hasRouteTree: Boolean(routeTreeId),
      hasRoutePerson: Boolean(routePersonId),
      routePersonExists: routePersonId
        ? Boolean(appState.people[routePersonId])
        : true,
    });

    if (surface === 'auth-bootstrap') {
      return (
        <BootstrapStatusScreen
          title={t.authBootstrapTitle}
          description={t.authBootstrapDescription}
        />
      );
    }

    if (surface === 'landing') {
      return (
        <LandingPage
          onStartNew={handleStartNewTree}
          onImport={welcomeScreen.onTriggerImportFile}
          onLogin={() => auth.onOpenLoginModal(routeReturnTo)}
        />
      );
    }

    if (surface === 'tree-selector' && auth.user) {
      return (
        <>
          <TreeSelector
            ownerId={auth.user.uid}
            userEmail={auth.user.email || EMPTY_STRING}
            currentTreeId={currentTreeId}
            supabaseToken={auth.user.supabaseToken}
            onLogout={auth.onLogout}
            onTreeSelected={(id, role) => {
              setCurrentTreeId(id);
              setCurrentUserRole(role);
            }}
          />
          {/* Show mobile bottom bar in TreeSelector too */}
          <MobileActionBar
            activeTab={null}
            canAddPerson
            onOpenVault={() => {
              setVaultTab('trees');
              setVaultOpen(true);
            }}
            onOpenAppearance={() => setDarkMode(!darkMode)}
            onAddPerson={handleStartNewTree}
          />
        </>
      );
    }

    if (surface === 'not-found') {
      return <NotFound />;
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
        detailsPanelFamilyActions={detailsPanelFamilyActions}
        coreFamilyActions={coreFamilyActions}
        isPresentMode={isPresentMode}
        setIsPresentMode={setIsPresentMode}
        detailsPanelOpen={detailsPanelOpen}
        setDetailsPanelOpen={setDetailsPanelOpen}
        auth={auth}
        svgRef={svgRef}
        onAddPerson={onAddPerson}
      />
    );
  };
  const mainSurface = renderMainLayout();

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept='.json,.ged,.jozor,.zip'
        className='hidden'
        onChange={onFileUpload}
        aria-label={t.importFile}
      />

      <React.Suspense
        fallback={
          <div className='fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--theme-bg)]'>
            <style>
              {`
                @keyframes jozor-pulse {
                  0%, 100% { transform: scale(0.9); opacity: 0.6; }
                  50% { transform: scale(1.1); opacity: 1; }
                }
                .animate-jozor-pulse {
                  animation: jozor-pulse 2s ease-in-out infinite;
                }
              `}
            </style>
            <img 
              src="/jozor-icon.svg" 
              alt="Loading..." 
              className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] animate-jozor-pulse object-contain drop-shadow-2xl"
            />
          </div>
        }
      >
        <AppRoutes
          auth={auth}
          mainSurface={mainSurface}
          onSharedTreeLoaded={handleSharedTreeLoaded}
        />
      </React.Suspense>

      <AppGlobalOverlays
        appState={appState}
        modals={modals}
        googleSync={googleSync}
        welcomeScreen={welcomeScreen}
        familyActions={coreFamilyActions}
        themeLanguage={themeLanguage}
        auth={auth}
        exportActions={exportActions}
        toolsActions={toolsActions}
      />
    </>
  );
};

