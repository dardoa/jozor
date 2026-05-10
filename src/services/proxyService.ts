import { Person } from '../types';
import { getUserFacingErrorInfo } from '../utils/errorLogger';
import { fetchTree } from './supabaseTreeReadService';
import { authTokenService } from './authTokenService';

const PROXY_API = '/api/proxy';
const LEGACY_DRIVE_SHARING_DISABLED_MESSAGE =
  'Legacy Google Drive shared links are no longer supported. Ask the owner to share the database-backed tree link.';

export interface SharedTreePayload {
  people: Record<string, Person>;
  treeName?: string;
}

async function getPreferredApiToken(customToken?: string): Promise<string | null> {
  return authTokenService.getPreferredSupabaseToken(customToken);
}

export const loadSharedFile = async (
  id: string,
  isDbTree: boolean = false,
  supabaseToken?: string
): Promise<SharedTreePayload> => {
  if (!isDbTree) {
    throw new Error(LEGACY_DRIVE_SHARING_DISABLED_MESSAGE);
  }

  const token = supabaseToken || authTokenService.getStoredSupabaseToken();
  if (!token) {
    throw new Error('Please sign in to view this shared tree.');
  }

  const payload = parseJwtPayload(token);
  const uid = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email : '';

  if (!uid || !email) {
    throw new Error('Your session is missing required identity information.');
  }

  const snapshot = await fetchTree(id, uid, email, token);
  return {
    people: snapshot.people,
    treeName: snapshot.name,
  };
};

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const saveSharedFile = async (
  treeId: string,
  content: Record<string, Person>,
  supabaseToken?: string
): Promise<void> => {
  const token = await getPreferredApiToken(supabaseToken);
  if (!token) throw new Error('Authentication required');

  const res = await fetch(PROXY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ treeId, content }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      res.status === 401 ? 'Your session has expired. Please sign in again.' :
      res.status === 403 ? 'You do not have permission to update this shared tree.' :
      res.status === 404 ? 'This shared tree could not be found.' :
      err.error?.message ||
      err.error ||
      'Failed to save shared file.';
    const userFacing = getUserFacingErrorInfo(message, 'Failed to save shared file.');
    throw new Error(userFacing.message);
  }
};
