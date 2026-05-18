import { useEffect, useState } from 'react';
import type { AuthProps, Person } from '../../types';
import { loadSharedFile } from '../../services/proxyService';
import { getUserFacingErrorInfo, logError } from '../../utils/errorLogger';
import { acceptTreeInvitation } from '../../services/treeInvitationService';
import { fetchTreeAccessRole } from '../../services/supabaseTreeAccessService';
import { authTokenService } from '../../services/authTokenService';

export type SharedTreeLoadStatus =
  | 'init'
  | 'checking_auth'
  | 'accepting_invite'
  | 'loading_file'
  | 'error'
  | 'unauthorized';

type SharedTreeRole = 'owner' | 'editor' | 'viewer';

interface UseSharedTreeLoadFlowParams {
  ownerUid: string;
  fileId: string;
  auth: AuthProps;
  isDbTree?: boolean;
  onLoadComplete: (
    data: Record<string, Person>,
    fileId: string,
    isDbTree: boolean,
    role: SharedTreeRole,
    treeName?: string
  ) => void;
  text: {
    acceptingInvitation?: string;
    invitationAccepted?: string;
  };
}

export interface SharedTreeLoadFlowState {
  status: SharedTreeLoadStatus;
  errorMsg: string;
  statusDetail: string;
  role: SharedTreeRole | null;
  payload: { people: Record<string, Person>; treeName?: string } | null;
}

const getCurrentUrlParams = () => new URLSearchParams(window.location.search);

const resolveIsDbTree = (explicitValue?: boolean) => {
  const urlParams = getCurrentUrlParams();
  return explicitValue ?? (urlParams.get('type') === 'db' || urlParams.get('treeId') !== null);
};

const removeInviteTokenFromUrl = (urlParams: URLSearchParams) => {
  urlParams.delete('invite');
  const nextUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
  window.history.replaceState({}, document.title, nextUrl);
};

export const useSharedTreeLoadFlow = ({
  ownerUid,
  fileId,
  auth,
  isDbTree: isDbTreeProp,
  onLoadComplete,
  text,
}: UseSharedTreeLoadFlowParams): SharedTreeLoadFlowState => {
  const [state, setState] = useState<SharedTreeLoadFlowState>({
    status: 'init',
    errorMsg: '',
    statusDetail: '',
    role: null,
    payload: null,
  });

  useEffect(() => {
    let isCancelled = false;

    const updateState = (patch: Partial<SharedTreeLoadFlowState>) => {
      if (!isCancelled) {
        setState((current) => ({ ...current, ...patch }));
      }
    };

    const load = async () => {
      updateState({ status: 'checking_auth', errorMsg: '', statusDetail: '', role: null, payload: null });

      if (!auth.user) {
        updateState({ status: 'unauthorized' });
        return;
      }

      const urlParams = getCurrentUrlParams();
      const isDbTree = resolveIsDbTree(isDbTreeProp);

      try {
        if (!isDbTree) {
          throw new Error('Shared tree links must use the database-backed route.');
        }

        const inviteToken = urlParams.get('invite');
        if (isDbTree && inviteToken && auth.user.email) {
          updateState({
            status: 'accepting_invite',
            statusDetail: text.acceptingInvitation || 'Accepting your invitation...',
          });

          await acceptTreeInvitation(
            inviteToken,
            auth.user.uid,
            auth.user.email,
            auth.user.supabaseToken
          );

          removeInviteTokenFromUrl(urlParams);
          updateState({
            statusDetail: text.invitationAccepted || 'Invitation accepted. Loading the shared tree...',
          });
        }

        updateState({ status: 'loading_file' });
        const token = auth.user.supabaseToken || await authTokenService.getPreferredSupabaseToken();
        const sharedTree = await loadSharedFile(fileId, isDbTree, token || undefined);

        let role: SharedTreeRole | null = 'viewer';
        if (isDbTree && auth.user.email) {
          role = await fetchTreeAccessRole(
            fileId,
            auth.user.uid,
            auth.user.email,
            token || auth.user.supabaseToken
          );
        }

        if (isDbTree && role === null) {
          throw new Error('Access denied: no collaborator access for this tree.');
        }

        const resolvedRole = role ?? 'viewer';
        updateState({
          status: 'loading_file',
          role: resolvedRole,
          payload: sharedTree,
        });
        onLoadComplete(sharedTree.people, fileId, isDbTree, resolvedRole, sharedTree.treeName);
      } catch (err: unknown) {
        logError('SharedTreeLoader loadSharedTree', err, {
          category: 'PERMISSION',
          severity: 'MEDIUM',
          metadata: { ownerUid, fileId, isDbTree },
        });
        const userFacing = getUserFacingErrorInfo(err, 'Failed to access the shared file.');
        updateState({ status: 'error', errorMsg: userFacing.message });
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [
    ownerUid,
    fileId,
    auth.user,
    isDbTreeProp,
    onLoadComplete,
    text.acceptingInvitation,
    text.invitationAccepted,
  ]);

  return state;
};
