import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildMigratedGalleryItem,
  migrateLegacyPersonMediaPlan,
  planLegacyPersonMediaMigration,
  type LegacyPersonMediaMigrationAdapter,
  type LegacyPersonMediaMigrationResult,
  type LegacyPersonMediaRow,
} from '../services/privatePersonMediaLegacyMigration.js';
import { resolvedSupabaseUrl } from '../services/supabaseConfig.js';
import { cleanPersonMediaObject } from '../services/personMediaServerCleanup.js';
import { authenticateUser } from '../utils/authUtils.js';
import { PERSON_MEDIA_STORAGE_CACHE_CONTROL } from '../types/personMedia.js';
import {
  buildCorsHeaders,
  getHeaderOrigin,
  isRequestOriginAllowed,
  resolveAllowedOriginFromEnv,
} from '../../shared/http/cors.js';

const TREE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;
const MAX_OFFSET = 1_000_000;

interface MigrationBatchResponse extends LegacyPersonMediaMigrationResult {
  scannedCount: number;
  blockedCount: number;
  externalCount: number;
  nextOffset: number;
  complete: boolean;
  pendingCleanupCount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseBoundedInteger = (value: unknown, fallback: number, maximum: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > maximum) return fallback;
  return parsed;
};

const getAdminClient = (): SupabaseClient | null => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!resolvedSupabaseUrl || !serviceRoleKey) return null;
  return createClient(resolvedSupabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

const requireRpcSuccess = async (
  request: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
  operation: string
): Promise<boolean> => {
  const { data, error } = await request;
  if (error) throw new Error(`${operation} failed`);
  return data === true;
};

export function createLegacyPersonMediaMigrationAdapter(
  admin: SupabaseClient
): LegacyPersonMediaMigrationAdapter {
  return {
    async downloadLegacyObject(objectPath) {
      const { data, error } = await admin.storage.from('avatars').download(objectPath);
      if (error || !data) throw new Error('Legacy person media source was not found');
      return data;
    },

    async uploadPrivateObject(asset, blob) {
      const { error } = await admin.storage.from(asset.bucket).upload(asset.objectPath, blob, {
        cacheControl: PERSON_MEDIA_STORAGE_CACHE_CONTROL,
        contentType: asset.mimeType,
        upsert: false,
      });
      if (error) throw new Error('Private person media upload failed');
    },

    async downloadPrivateObject(asset) {
      const { data, error } = await admin.storage.from(asset.bucket).download(asset.objectPath);
      if (error || !data) throw new Error('Private person media verification failed');
      return data;
    },

    async attachPrivateAsset(task, asset) {
      if (task.kind === 'profile-photo') {
        return requireRpcSuccess(admin.rpc('attach_legacy_profile_person_media', {
          p_tree_id: task.treeId,
          p_person_id: task.personId,
          p_source_object_path: task.sourceObjectPath,
          p_expected_photo_path: task.expectedPhotoPath,
          p_expected_photo_url: task.expectedPhotoUrl,
          p_asset: asset,
        }), 'Legacy profile photo attachment');
      }

      return requireRpcSuccess(admin.rpc('attach_legacy_gallery_person_media', {
        p_tree_id: task.treeId,
        p_person_id: task.personId,
        p_source_object_path: task.sourceObjectPath,
        p_gallery_index: task.galleryIndex,
        p_expected_item: task.expectedGalleryItem,
        p_replacement_item: buildMigratedGalleryItem(task.expectedGalleryItem, asset),
      }), 'Legacy gallery photo attachment');
    },

    async removePrivateObject(asset) {
      await cleanPersonMediaObject(admin, { bucket: asset.bucket, object_path: asset.objectPath });
    },

    async removeLegacyObject(objectPath) {
      await cleanPersonMediaObject(admin, { bucket: 'avatars', object_path: objectPath });
    },

    async finalizeLegacyReference(task, asset) {
      if (task.kind === 'profile-photo') {
        return requireRpcSuccess(admin.rpc('finalize_legacy_profile_person_media', {
          p_tree_id: task.treeId,
          p_person_id: task.personId,
          p_source_object_path: task.sourceObjectPath,
          p_expected_photo_path: task.expectedPhotoPath,
          p_expected_photo_url: task.expectedPhotoUrl,
          p_asset_id: asset.assetId,
        }), 'Legacy profile photo finalization');
      }

      return requireRpcSuccess(admin.rpc('finalize_legacy_gallery_person_media_checked', {
        p_tree_id: task.treeId,
        p_person_id: task.personId,
        p_source_object_path: task.sourceObjectPath,
        p_asset_id: asset.assetId,
        p_expected_item: task.existingAsset ? task.expectedGalleryItem : buildMigratedGalleryItem(task.expectedGalleryItem, asset),
      }), 'Legacy gallery photo finalization');
    },
  };
}

const isLegacyPersonMediaRow = (value: unknown, treeId: string): value is LegacyPersonMediaRow => {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && value.id.length > 0
    && value.tree_id === treeId
    && (value.custom_fields === null || value.custom_fields === undefined || isRecord(value.custom_fields));
};

export async function migrateLegacyPersonMediaBatch(
  admin: SupabaseClient,
  treeId: string,
  offset: number,
  limit: number,
  supabaseUrl: string
): Promise<MigrationBatchResponse> {
  const { data, error } = await admin
    .from('people')
    .select('id,tree_id,photo_url,photo_path,photo_version,custom_fields')
    .eq('tree_id', treeId)
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error('Legacy person media scan failed');

  const rawRows: unknown[] = data ?? [];
  if (rawRows.some((row) => !isLegacyPersonMediaRow(row, treeId))) {
    throw new Error('Legacy person media scan returned an invalid row');
  }
  const rows = rawRows.filter((row): row is LegacyPersonMediaRow =>
    isLegacyPersonMediaRow(row, treeId)
  );
  const adapter = createLegacyPersonMediaMigrationAdapter(admin);
  const response: MigrationBatchResponse = {
    scannedCount: rows.length,
    migratedCount: 0,
    cleanedCount: 0,
    blockedCount: 0,
    externalCount: 0,
    failedCount: 0,
    nextOffset: offset + rawRows.length,
    complete: (data?.length ?? 0) < limit,
    pendingCleanupCount: 0,
  };

  for (const row of rows) {
    const plan = planLegacyPersonMediaMigration(row, supabaseUrl);
    response.blockedCount += plan.blockedCount;
    response.externalCount += plan.externalCount;
    const result = await migrateLegacyPersonMediaPlan(plan, adapter);
    response.migratedCount += result.migratedCount;
    response.cleanedCount += result.cleanedCount;
    response.failedCount += result.failedCount;
  }
  const pending = await admin.rpc('count_pending_person_media_cleanup', { p_tree_id: treeId });
  if (pending.error || !Number.isSafeInteger(pending.data) || pending.data < 0) throw new Error('Media cleanup status failed');
  response.pendingCleanupCount = pending.data;
  return response;
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
    methods: 'POST, OPTIONS',
    allowCredentials: true,
  }, origin)).forEach(([key, value]) => res.setHeader(key, value));
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
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
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
    const body = isRecord(req.body) ? req.body : {};
    const treeId = typeof body.treeId === 'string' ? body.treeId : '';
    if (!TREE_ID_PATTERN.test(treeId)) {
      return res.status(400).json({
        error: { message: 'Invalid migration request.', code: 'INVALID_MIGRATION_REQUEST' },
      });
    }

    const admin = getAdminClient();
    if (!admin || !resolvedSupabaseUrl) {
      return res.status(500).json({
        error: { message: 'Server configuration error.', code: 'SERVER_CONFIGURATION_ERROR' },
      });
    }
    const { data: tree, error: treeError } = await admin
      .from('trees')
      .select('owner_id')
      .eq('id', treeId)
      .maybeSingle();
    if (treeError) throw new Error('Tree ownership lookup failed');
    if (!tree || tree.owner_id !== user.uid) {
      return res.status(403).json({
        error: { message: 'Only the tree owner can migrate person media.', code: 'FORBIDDEN' },
      });
    }

    const offset = parseBoundedInteger(body.offset, 0, MAX_OFFSET);
    const limit = Math.max(1, parseBoundedInteger(body.limit, DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE));
    const result = await migrateLegacyPersonMediaBatch(admin, treeId, offset, limit, resolvedSupabaseUrl);
    console.info('[PERSON_MEDIA_LEGACY_MIGRATION]', {
      ...result,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[PERSON_MEDIA_LEGACY_MIGRATION_FAILED]', { errorType: error instanceof Error ? error.name : 'UnknownError' });
    return res.status(500).json({
      error: { message: 'Person media migration failed.', code: 'PERSON_MEDIA_MIGRATION_FAILED' },
    });
  }
}
