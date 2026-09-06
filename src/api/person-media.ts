import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  detectPersonMediaImageMimeType,
  createPersonMediaAssetRef,
  isPersonMediaImageMimeType,
  isPersonMediaAssetForTree,
  isPersonMediaAssetRef,
  PERSON_MEDIA_MAX_IMAGE_BYTES,
  type PersonMediaAssetKind,
  type PersonMediaAssetRef,
} from '../types';
import { resolvedSupabaseUrl } from '../services/supabaseConfig';
import { authenticateUser, createSupabaseClientForUser } from '../utils/authUtils';
import {
  buildCorsHeaders,
  getHeaderOrigin,
  isRequestOriginAllowed,
  resolveAllowedOriginFromEnv,
} from '../../shared/http/cors';
import { isUuid } from '../utils/isUuid';

interface SecurePersonMediaRow {
  readonly id: string;
  readonly tree_id: string;
  readonly custom_fields?: Record<string, unknown> | null;
}

let adminClient: SupabaseClient | null = null;

const getAdminClient = (): SupabaseClient | null => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!resolvedSupabaseUrl || !serviceRoleKey) return null;
  adminClient ??= createClient(resolvedSupabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
};

const isMediaKind = (value: unknown): value is PersonMediaAssetKind =>
  value === 'profile-photo' || value === 'gallery-photo';

const isSafePersonId = (value: string): boolean => (
  value.length > 0
  && value.length <= 256
  && !Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  })
);

export function resolveAuthorizedPersonMediaAsset(
  row: SecurePersonMediaRow,
  kind: PersonMediaAssetKind,
  assetId: string
): PersonMediaAssetRef | null {
  const customFields = row.custom_fields;
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) return null;

  if (kind === 'profile-photo') {
    const asset = customFields.photoAsset;
    return isPersonMediaAssetRef(asset)
      && asset.kind === kind
      && asset.assetId === assetId
      && isPersonMediaAssetForTree(asset, row.tree_id)
      ? asset
      : null;
  }

  const gallery = customFields.gallery;
  if (!Array.isArray(gallery)) return null;
  for (const item of gallery) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const asset = (item as Record<string, unknown>).asset;
    if (
      isPersonMediaAssetRef(asset)
      && asset.kind === kind
      && asset.assetId === assetId
      && isPersonMediaAssetForTree(asset, row.tree_id)
    ) {
      return asset;
    }
  }
  return null;
}

const applyCors = (req: VercelRequest, res: VercelResponse): boolean => {
  const allowedOrigin = resolveAllowedOriginFromEnv(process.env);
  if (!allowedOrigin) {
    res.status(500).json({
      error: { message: 'Server configuration error.', code: 'SERVER_CONFIGURATION_ERROR' },
    });
    return false;
  }

  const origin = getHeaderOrigin(req.headers);
  Object.entries(buildCorsHeaders(allowedOrigin, {
    methods: 'GET, OPTIONS',
    allowCredentials: true,
  }, origin)).forEach(([key, value]) => res.setHeader(key, value));
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Origin, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!isRequestOriginAllowed(origin, allowedOrigin)) {
    res.status(400).json({
      error: { message: 'Invalid request origin.', code: 'INVALID_ORIGIN' },
    });
    return false;
  }
  return true;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return;
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({
      error: { message: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' },
    });
  }

  try {
    const user = await authenticateUser(req.headers.authorization);
    if (!user || user.type !== 'internal' || !user.token) {
      return res.status(401).json({
        error: { message: 'Invalid or expired auth token.', code: 'UNAUTHORIZED' },
      });
    }

    const treeId = typeof req.query.treeId === 'string' ? req.query.treeId : '';
    const personId = req.query.personId;
    const assetId = typeof req.query.assetId === 'string' ? req.query.assetId : '';
    const kind = req.query.kind;
    const assetOnly = personId === undefined;
    const byteLength = typeof req.query.byteLength === 'string' && /^[1-9][0-9]*$/.test(req.query.byteLength)
      ? Number(req.query.byteLength) : 0;
    if (!isUuid(treeId) || !isUuid(assetId) || !isMediaKind(kind)
      || (!assetOnly && (typeof personId !== 'string' || !isSafePersonId(personId)))
      || (assetOnly && (!isPersonMediaImageMimeType(req.query.mimeType)
        || !Number.isSafeInteger(byteLength) || byteLength <= 0 || byteLength > PERSON_MEDIA_MAX_IMAGE_BYTES))) {
      return res.status(400).json({
        error: { message: 'Invalid media request.', code: 'INVALID_MEDIA_REQUEST' },
      });
    }

    const userClient = createSupabaseClientForUser(user);
    let asset: PersonMediaAssetRef | null = null;
    if (assetOnly && isPersonMediaImageMimeType(req.query.mimeType)) {
      // Archive/checkpoint assets may not be attached to a current person row.
      // Never trust the client role or accept a client-supplied storage path.
      const owner = await userClient.rpc('is_tree_owner', { p_tree_id: treeId });
      const editor = owner.error || owner.data === true ? null
        : await userClient.rpc('is_tree_collaborator', { p_tree_id: treeId, p_required_role: 'editor' });
      if (!owner.error && (owner.data === true || (!editor?.error && editor?.data === true))) {
        asset = createPersonMediaAssetRef({ treeId, assetId, kind,
          mimeType: req.query.mimeType, byteLength });
      }
    } else {
      const { data: row, error: rowError } = await userClient
        .from('people_secure')
        .select('id,tree_id,custom_fields')
        .eq('tree_id', treeId)
        .eq('id', personId)
        .maybeSingle();
      if (!rowError && row) asset = resolveAuthorizedPersonMediaAsset(row as SecurePersonMediaRow, kind, assetId);
    }
    if (!asset) {
      return res.status(404).json({
        error: { message: 'Media not found.', code: 'MEDIA_NOT_FOUND' },
      });
    }

    const storageAdmin = getAdminClient();
    if (!storageAdmin) {
      return res.status(500).json({
        error: { message: 'Server configuration error.', code: 'SERVER_CONFIGURATION_ERROR' },
      });
    }

    const { data: blob, error: downloadError } = await storageAdmin.storage
      .from(asset.bucket)
      .download(asset.objectPath);
    if (
      downloadError
      || !blob
      || blob.size <= 0
      || blob.size > PERSON_MEDIA_MAX_IMAGE_BYTES
    ) {
      return res.status(404).json({
        error: { message: 'Media not found.', code: 'MEDIA_NOT_FOUND' },
      });
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (
      bytes.byteLength !== asset.byteLength
      ||
      (blob.type && blob.type !== asset.mimeType)
      || detectPersonMediaImageMimeType(bytes) !== asset.mimeType
    ) {
      return res.status(404).json({
        error: { message: 'Media not found.', code: 'MEDIA_NOT_FOUND' },
      });
    }

    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(bytes.byteLength));
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error('[PERSON_MEDIA_DELIVERY_FAILED]', { errorType: error instanceof Error ? error.name : 'UnknownError' });
    return res.status(500).json({
      error: { message: 'Unable to deliver media.', code: 'MEDIA_DELIVERY_FAILED' },
    });
  }
}
