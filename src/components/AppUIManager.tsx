import * as React from 'react';

import {
  Routes,
  Route,
  Navigate,
  useMatch,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';

import { Person } from '../types';
import type { AuthProps } from '../types';
import { isUuid } from '../utils/isUuid';

import { EMPTY_STRING } from '../constants';

import { SharedTreeLoader } from './SharedTreeLoader';

import { WelcomeScreen } from './WelcomeScreen';

import { AppLayout } from './AppLayout';

import { TreeSelector } from './TreeSelector';

import { useAppStore, loadFullState } from '../store/useAppStore';

import { ModalManagerContainer } from './ModalManagerContainer';
import { BootstrapStatusScreen } from './app/BootstrapStatusScreen';
import { MinimalLogin } from './app/MinimalLogin';

import { useAppOrchestration } from '../hooks/useAppOrchestration';
import { useJozorDebugApi } from '../hooks/useJozorDebugApi';

import { NotFound } from './NotFound';

import { useTranslation } from '../context/TranslationContext';
import { InvitePage } from './InvitePage';
import { ProtectedRoute } from './ProtectedRoute';

const HelpCenter = React.lazy(() =>
  import('./HelpCenter').then((m) => ({ default: m.HelpCenter }))
);
const TheVaultDrawer = React.lazy(() =>
  import('./TheVault/TheVaultDrawer').then((m) => ({ default: m.TheVaultDrawer }))
);

export const AppUIManager: React.FC = () => {
  const { t } = useTranslation();

  const legacySharedMatch = useMatch('/tree/:ownerUid/:fileId');
  const dbSharedMatch = useMatch('/tree/db/:ownerUid/:fileId');
  const canonicalTreeMatch = useMatch('/tree/:treeId');
  const canonicalPersonMatch = useMatch('/person/:personId');
  const shareTokenMatch = useMatch('/shared/:shareToken');
  const location = useLocation();

  const isSharedMode = !!legacySharedMatch || !!dbSharedMatch || !!shareTokenMatch;
  const routeTreeId = canonicalTreeMatch?.params.treeId ?? null;
  const routePersonId = canonicalPersonMatch?.params.personId ?? null;
  const routeReturnTo =
    location.pathname === '/' && !location.search && !location.hash
      ? undefined
      : `${location.pathname}${location.search}${location.hash}`;

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
    sidebarFamilyActions,
    coreFamilyActions,
    isPresentMode,
    setIsPresentMode,
    sidebarOpen,
    setSidebarOpen,
    auth,
    svgRef,
    onAddPerson,
  } = orchestrationObj;

  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
  const authLoading = useAppStore((state) => state.authLoading);
  const isVaultOpen = useAppStore((state) => state.isVaultOpen);
  useJozorDebugApi(welcomeScreen.setShowWelcome);

  const { fileInputRef, onFileUpload, showWelcome, handleStartNewTree } = welcomeScreen;
  const isTreeBootstrapPending =
    Boolean(auth.user) &&
    authLoading &&
    (Boolean(routeTreeId) || Boolean(routePersonId) || Boolean(currentTreeId));

  const treeBootstrapTitle = routePersonId
    ? t.treeBootstrapResolvingTitle
    : routeTreeId
      ? t.treeBootstrapLoadingTitle
      : t.treeBootstrapGenericTitle;
  const treeBootstrapDescription = routePersonId
    ? t.treeBootstrapResolvingDescription
    : routeTreeId
      ? t.treeBootstrapLoadingDescription
      : t.treeBootstrapGenericDescription;

  const handleSharedTreeLoaded = (
    data: Record<string, Person>,
    fileId: string,
    isDbTree: boolean,
    role: 'owner' | 'editor' | 'viewer' = 'owner',
    treeName?: string
  ) => {
    if (isDbTree) {
      // Modern DB-centric sharing (independent of Google Drive)
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
    } else {
      // Legacy Drive-centric sharing
      googleSync
        .handleLoadDriveFile(fileId)
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
    if (authLoading && !auth.user) {
      return (
        <BootstrapStatusScreen
          title={t.authBootstrapTitle}
          description={t.authBootstrapDescription}
        />
      );
    }

    if (showWelcome) {
      return (
        <WelcomeScreen
          onStartNew={handleStartNewTree}
          onImport={welcomeScreen.onTriggerImportFile}
          onLogin={() => auth.onOpenLoginModal(routeReturnTo)}
        />
      );
    }

    if (!showWelcome && auth.user && !currentTreeId) {
      if (isTreeBootstrapPending) {
        return (
          <BootstrapStatusScreen
            title={treeBootstrapTitle}
            description={treeBootstrapDescription}
          />
        );
      }
      if (routeTreeId) {
        return <NotFound />;
      }
      return (
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
      );
    }

    if (routePersonId && currentTreeId && !appState.people[routePersonId]) {
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
        sidebarFamilyActions={sidebarFamilyActions}
        coreFamilyActions={coreFamilyActions}
        isPresentMode={isPresentMode}
        setIsPresentMode={setIsPresentMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        auth={auth}
        svgRef={svgRef}
        onAddPerson={onAddPerson}
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
        <Routes>
          <Route path='/help' element={<HelpCenter />} />
          <Route path='/support' element={<Navigate to='/help' replace />} />
          <Route path='/shared/:shareToken' element={<InvitePage />} />

          {/* Clean DB tree route (new format) */}
          <Route
            path='/tree/db/:ownerUid/:fileId'
            element={
              <SharedTreeRouteWrapper
                auth={auth}
                isDbTree={true}
                onLoadComplete={handleSharedTreeLoaded}
                onCancel={() => navigate('/', { replace: true })}
              />
            }
          />

          {/* Legacy route: redirects ?type=db to the DB route and disables old Drive links. */}
          <Route
            path='/tree/:ownerUid/:fileId'
            element={
              <LegacySharedTreeRedirect
                auth={auth}
                onLoadComplete={handleSharedTreeLoaded}
                onCancel={() => navigate('/', { replace: true })}
              />
            }
          />
          <Route path='/tree/:treeId' element={<ProtectedRoute>{renderMainLayout()}</ProtectedRoute>} />
          <Route path='/person/:personId' element={<ProtectedRoute>{renderMainLayout()}</ProtectedRoute>} />
          <Route path="/login" element={<LoginRouteElement auth={auth} />} />
          <Route path="/invite/:token" element={<LegacyInviteRedirect />} />
          <Route path='/' element={renderMainLayout()} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </React.Suspense>

      {isVaultOpen ? (
        <React.Suspense fallback={null}>
          <TheVaultDrawer googleSync={googleSync} auth={auth} exportActions={exportActions} toolsActions={toolsActions} onOpenDiagnostics={() => useAppStore.getState().setDiagnosticsDrawerOpen(true)} onOpenActivityLog={() => (useAppStore.getState() as any).setActivityLogOpen(true)} onOpenCleanTree={modals.onOpenCleanTreeOptions} />
        </React.Suspense>
      ) : null}

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
  onLoadComplete: (
    data: Record<string, Person>,
    fileId: string,
    isDbTree: boolean,
    role?: 'owner' | 'editor' | 'viewer',
    treeName?: string
  ) => void;
  onCancel: () => void;
  isDbTree?: boolean;
}

const SharedTreeRouteWrapper: React.FC<SharedTreeRouteWrapperProps> = ({
  auth,
  onLoadComplete,
  onCancel,
  isDbTree,
}) => {
  const { ownerUid, fileId } = useParams<{ ownerUid: string; fileId: string }>();
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get('invite');
  if (!ownerUid || !fileId) return <Navigate to='/' replace />;
  if (inviteToken) return <Navigate to={`/shared/${inviteToken}`} replace />;

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
 * Otherwise shows a disabled-state screen for old Drive sharing links.
 */
const LegacySharedTreeRedirect: React.FC<SharedTreeRouteWrapperProps> = ({
  onCancel,
}) => {
  const { ownerUid, fileId } = useParams<{ ownerUid: string; fileId: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const inviteToken = searchParams.get('invite');
  const isDbTree = searchParams.get('type') === 'db';

  if (!ownerUid || !fileId) return <Navigate to='/' replace />;
  if (inviteToken) {
    return <Navigate to={`/shared/${inviteToken}`} replace />;
  }

  // Upgrade old link to the clean URL format
  if (isDbTree) {
    return <Navigate to={`/tree/db/${ownerUid}/${fileId}`} replace />;
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-[var(--theme-bg)] px-6 text-center text-[var(--text-main)]'>
      <div className='max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-sm)]'>
        <h1 className='text-lg font-semibold'>Legacy Drive sharing is disabled</h1>
        <p className='mt-2 text-sm text-[var(--text-muted)]'>
          Ask the owner to send the database-backed shared tree link.
        </p>
        <button
          type='button'
          className='mt-5 rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white'
          onClick={onCancel}
        >
          Return home
        </button>
      </div>
    </div>
  );
};

const LoginRouteElement: React.FC<{ auth: AuthProps }> = ({ auth }) => {
  const { t } = useTranslation();
  const authLoading = useAppStore((state) => state.authLoading);
  const storedReturnTo =
    sessionStorage.getItem('jozor:return_to') ||
    sessionStorage.getItem('jozor:post-login-redirect') ||
    '/';

  if (auth.user) {
    return <Navigate to={storedReturnTo} replace />;
  }

  if (authLoading) {
    return (
      <BootstrapStatusScreen
        title={t.authBootstrapTitle}
        description={t.authBootstrapDescription}
      />
    );
  }

  return <MinimalLogin auth={auth} />;
};

const LegacyInviteRedirect: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  if (!token) return <Navigate to='/' replace />;
  return <Navigate to={`/shared/${token}`} replace />;
};
