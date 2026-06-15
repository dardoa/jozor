import * as React from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import type { AuthProps, Person } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../context/TranslationContext';
import { SharedTreeLoader } from '../../features/tree-manager';
import { InvitePage } from '../InvitePage';
import { NotFound } from '../NotFound';
import { ProtectedRoute } from '../ProtectedRoute';
import { BootstrapStatusScreen } from './BootstrapStatusScreen';
import { MinimalLogin } from './MinimalLogin';

const HelpCenter = React.lazy(() =>
  import('../HelpCenter').then((module) => ({ default: module.HelpCenter }))
);
const InfoContentPage = React.lazy(() =>
  import('../info/InfoContentPage').then((module) => ({ default: module.InfoContentPage }))
);
const AdminDashboard = React.lazy(() =>
  import('../../features/admin/AdminDashboard').then((module) => ({
    default: module.AdminDashboard,
  }))
);

export type SharedTreeLoadHandler = (
  data: Record<string, Person>,
  fileId: string,
  isDbTree: boolean,
  role?: 'owner' | 'editor' | 'viewer',
  treeName?: string
) => void;

interface AppRoutesProps {
  auth: AuthProps;
  mainSurface: React.ReactNode;
  onSharedTreeLoaded: SharedTreeLoadHandler;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  auth,
  mainSurface,
  onSharedTreeLoaded,
}) => {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path='/help' element={<HelpCenter />} />
      <Route path='/support' element={<Navigate to='/help' replace />} />
      <Route path='/privacy' element={<InfoContentPage page="privacy" />} />
      <Route path='/terms' element={<InfoContentPage page="terms" />} />
      <Route path='/security' element={<InfoContentPage page="security" />} />
      <Route path='/about' element={<InfoContentPage page="about" />} />
      <Route path='/contact' element={<InfoContentPage page="contact" />} />
      <Route path='/admin' element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path='/admin/kindi-learning' element={<Navigate to='/admin?tab=kindi' replace />} />
      <Route path='/admin/tree-defaults' element={<Navigate to='/admin?tab=tree-defaults' replace />} />
      <Route path='/admin/diagnostics' element={<Navigate to='/admin?tab=diagnostics' replace />} />
      <Route path='/admin/billing-diagnostics' element={<Navigate to='/admin?tab=billing' replace />} />
      <Route path='/shared/:shareToken' element={<InvitePage />} />
      <Route
        path='/tree/db/:ownerUid/:fileId'
        element={
          <SharedTreeRouteElement
            auth={auth}
            onLoadComplete={onSharedTreeLoaded}
            onCancel={() => navigate('/', { replace: true })}
          />
        }
      />
      <Route path='/tree/:treeId' element={<ProtectedRoute>{mainSurface}</ProtectedRoute>} />
      <Route path='/person/:personId' element={<ProtectedRoute>{mainSurface}</ProtectedRoute>} />
      <Route path='/login' element={<LoginRouteElement auth={auth} />} />
      <Route path='/' element={mainSurface} />
      <Route path='*' element={<NotFound />} />
    </Routes>
  );
};

interface SharedTreeRouteElementProps {
  auth: AuthProps;
  onLoadComplete: SharedTreeLoadHandler;
  onCancel: () => void;
}

const SharedTreeRouteElement: React.FC<SharedTreeRouteElementProps> = ({
  auth,
  onLoadComplete,
  onCancel,
}) => {
  const { ownerUid, fileId } = useParams<{ ownerUid: string; fileId: string }>();
  const location = useLocation();
  const inviteToken = new URLSearchParams(location.search).get('invite');

  if (!ownerUid || !fileId) {
    return <Navigate to='/' replace />;
  }
  if (inviteToken) {
    return <Navigate to={`/shared/${inviteToken}`} replace />;
  }

  return (
    <SharedTreeLoader
      ownerUid={ownerUid}
      fileId={fileId}
      auth={auth}
      onLoadComplete={onLoadComplete}
      onCancel={onCancel}
      isDbTree
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
