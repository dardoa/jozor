import { Collaborator, GoogleSyncStateAndActions } from '../types';
import { getIdToken } from './firebaseAuthService';

export interface GetShareSettingsParams {
  driveFileId?: string;
  treeId?: string;
  ownerUid: string;
}

export interface UpdateShareParams extends GetShareSettingsParams {
  email: string;
  role: 'editor' | 'viewer';
}

const SHARE_API_BASE = '/api/share';

export async function getShareSettings(params: GetShareSettingsParams, customToken?: string): Promise<Collaborator[]> {
  const token = customToken || await getIdToken();
  if (!token) {
    throw new Error('Please sign in to manage sharing.');
  }

  const queryParams = new URLSearchParams();
  if (params.driveFileId) queryParams.set('driveFileId', params.driveFileId);
  if (params.treeId) queryParams.set('treeId', params.treeId);
  queryParams.set('ownerUid', params.ownerUid);

  const res = await fetch(`${SHARE_API_BASE}?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 403) throw new Error('Unauthorized');
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load share settings');
  }
  const data = await res.json();
  return data.collaborators || [];
}

export async function inviteCollaborator(params: UpdateShareParams, customToken?: string): Promise<Collaborator[]> {
  const token = customToken || await getIdToken();
  if (!token) throw new Error('Authentication required');

  const res = await fetch(`${SHARE_API_BASE}?action=invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to invite collaborator');
  }
  const data = await res.json();
  return data.collaborators || [];
}

export async function removeCollaborator(
  params: Omit<UpdateShareParams, 'role'>,
  customToken?: string
): Promise<Collaborator[]> {
  const token = customToken || await getIdToken();
  if (!token) throw new Error('Authentication required');

  const res = await fetch(`${SHARE_API_BASE}?action=remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to remove collaborator');
  }
  const data = await res.json();
  return data.collaborators || [];
}

export async function updateCollaboratorRole(params: UpdateShareParams, customToken?: string): Promise<Collaborator[]> {
  const token = customToken || await getIdToken();
  if (!token) throw new Error('Authentication required');

  const res = await fetch(`${SHARE_API_BASE}?action=update_role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update role');
  }
  const data = await res.json();
  return data.collaborators || [];
}

// Helper to build params from existing googleSync state
export function buildShareParams(
  googleSync: Pick<GoogleSyncStateAndActions, 'user' | 'currentActiveDriveFileId'>,
  currentTreeId?: string | null
) {
  if (!googleSync.user) return null;
  if (!googleSync.currentActiveDriveFileId && !currentTreeId) return null;
  return {
    driveFileId: googleSync.currentActiveDriveFileId || undefined,
    treeId: currentTreeId || undefined,
    ownerUid: googleSync.user.uid,
  };
}
