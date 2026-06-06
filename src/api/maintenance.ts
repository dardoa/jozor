import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authenticateUser } from '../utils/authUtils';
import { logError, logInfo } from '../utils/errorLogger';

type MaintenanceMode = 'operations' | 'activity';

const MAX_DELETE_BATCH = 1000;

function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured for maintenance operations.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

const parsePositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

async function assertTreeOwner(supabaseAdmin: SupabaseClient, treeId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('trees')
    .select('owner_id')
    .eq('id', treeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.owner_id === userId;
}

async function pruneTreeOperations(
  supabaseAdmin: SupabaseClient,
  treeId: string,
  keepLatest: number
): Promise<number> {
  let deletedCount = 0;

  while (true) {
    const { data: staleRows, error: selectError } = await supabaseAdmin
      .from('tree_operations')
      .select('id')
      .eq('tree_id', treeId)
      .order('version_seq', { ascending: false })
      .range(keepLatest, keepLatest + MAX_DELETE_BATCH - 1);

    if (selectError) {
      throw selectError;
    }

    const ids = (staleRows ?? [])
      .map((row) => row.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (ids.length === 0) {
      break;
    }

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from('tree_operations')
      .delete()
      .in('id', ids)
      .select('id');

    if (deleteError) {
      throw deleteError;
    }

    deletedCount += deletedRows?.length ?? ids.length;

    if (ids.length < MAX_DELETE_BATCH) {
      break;
    }
  }

  return deletedCount;
}

async function pruneActivityLogs(
  supabaseAdmin: SupabaseClient,
  treeId: string,
  keepDays: number
): Promise<number> {
  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .delete()
    .eq('tree_id', treeId)
    .lt('created_at', cutoff)
    .select('id');

  if (error) {
    throw error;
  }

  return data?.length ?? 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    });
  }

  try {
    const user = await authenticateUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired auth token',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const { treeId, mode } = req.body as { treeId?: string; mode?: MaintenanceMode };
    if (!treeId || (mode !== 'operations' && mode !== 'activity')) {
      return res.status(400).json({
        error: {
          message: 'treeId and valid maintenance mode are required',
          code: 'BAD_REQUEST',
        },
      });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const isOwner = await assertTreeOwner(supabaseAdmin, treeId, user.uid);
    if (!isOwner) {
      return res.status(403).json({
        error: {
          message: 'Only the tree owner can run maintenance',
          code: 'FORBIDDEN',
        },
      });
    }

    const deletedCount = mode === 'operations'
      ? await pruneTreeOperations(supabaseAdmin, treeId, parsePositiveInteger(req.body.keepLatest, 2000))
      : await pruneActivityLogs(supabaseAdmin, treeId, parsePositiveInteger(req.body.keepDays, 180));

    logInfo('API_MAINTENANCE', 'Maintenance completed.', {
      treeId,
      userId: user.uid,
      mode,
      deletedCount,
    });

    return res.status(200).json({ deletedCount });
  } catch (error) {
    logError('API_MAINTENANCE', error, {
      category: 'DATABASE',
      severity: 'MEDIUM',
      showToast: false,
    });

    return res.status(500).json({
      error: {
        message: 'Maintenance request failed.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}
