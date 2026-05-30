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

import { SharedTreeLoader } from '../features/tree-manager';

import { LandingPage } from '../features/landing';

import { AppLayout } from './AppLayout';

import { TreeSelector } from '../features/tree-manager';

import { useAppStore, loadFullState } from '../store/useAppStore';

import { ModalManagerContainer } from './ModalManagerContainer';
import { BootstrapStatusScreen } from './app/BootstrapStatusScreen';
import { MinimalLogin } from './app/MinimalLogin';

import { useAppOrchestration } from '../hooks/ui/useAppOrchestration';
import { useJozorDebugApi } from '../hooks/utils/useJozorDebugApi';

import { NotFound } from './NotFound';

import { useTranslation } from '../context/TranslationContext';
import { InvitePage } from './InvitePage';
import { ProtectedRoute } from './ProtectedRoute';
import { MobileActionBar } from './ui/MobileActionBar';

const HelpCenter = React.lazy(() =>
  import('./HelpCenter').then((m) => ({ default: m.HelpCenter }))
);
const TheVaultDrawer = React.lazy(() =>
  import('../features/the-vault').then((m) => ({ default: m.TheVaultDrawer }))
);
const AdminKindiLearningReports = React.lazy(() =>
  import('../features/admin/AdminKindiLearningReports').then((m) => ({ default: m.AdminKindiLearningReports }))
);
const AdminDefaultTreeSettings = React.lazy(() =>
  import('../features/admin/AdminDefaultTreeSettings').then((m) => ({ default: m.AdminDefaultTreeSettings }))
);
const DiagnosticsDrawer = React.lazy(() =>
  import('../features/diagnostics').then((m) => ({ default: m.DiagnosticsDrawer }))
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
  const isVaultOpen = useAppStore((state) => state.isVaultOpen);
  const setVaultOpen = useAppStore((state) => state.setVaultOpen);
  const setVaultTab = useAppStore((state) => state.setVaultTab);
  const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);
  const darkMode = useAppStore((state) => state.darkMode);
  const isDiagnosticsDrawerOpen = useAppStore((state) => state.isDiagnosticsDrawerOpen);
  const setDarkMode = useAppStore((state) => state.setDarkMode);
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
    // Guard: if OAuth callback params exist in the URL, wait for auth to resolve
    // This prevents the flash of LandingPage before Supabase picks up the session
    const isOAuthCallback =
      location.hash.includes('access_token') ||
      location.search.includes('code=') ||
      location.search.includes('error=');

    if (authLoading || (isOAuthCallback && !auth.user)) {
      return (
        <BootstrapStatusScreen
          title={t.authBootstrapTitle}
          description={t.authBootstrapDescription}
        />
      );
    }

    if (showWelcome) {
      return (
        <LandingPage
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
          <Route path='/admin/kindi-learning' element={<ProtectedRoute><AdminKindiLearningReports /></ProtectedRoute>} />
          <Route path='/admin/tree-defaults' element={<ProtectedRoute><AdminDefaultTreeSettings /></ProtectedRoute>} />
          <Route path='/shared/:shareToken' element={<InvitePage />} />

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

          <Route path='/tree/:treeId' element={<ProtectedRoute>{renderMainLayout()}</ProtectedRoute>} />
          <Route path='/person/:personId' element={<ProtectedRoute>{renderMainLayout()}</ProtectedRoute>} />
          <Route path="/login" element={<LoginRouteElement auth={auth} />} />
          <Route path='/' element={renderMainLayout()} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </React.Suspense>

      {isVaultOpen ? (
        <React.Suspense fallback={null}>
          <TheVaultDrawer
            googleSync={googleSync}
            auth={auth}
            exportActions={exportActions}
            toolsActions={toolsActions}
            onOpenDiagnostics={() => useAppStore.getState().setDiagnosticsDrawerOpen(true)}
            onOpenActivityLog={() => setActivityLogOpen(true)}
            onOpenCleanTree={modals.onOpenCleanTreeOptions}
          />
        </React.Suspense>
      ) : null}

      {isDiagnosticsDrawerOpen ? (
        <React.Suspense fallback={null}>
          <DiagnosticsDrawer />
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

