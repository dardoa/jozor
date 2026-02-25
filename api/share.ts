import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '../utils/errorLogger';
import { authenticateUser, createSupabaseClientForUser } from '../utils/authUtils';

interface Collaborator {
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'pending';
}

interface ShareRecord {
  id: string;
  owner_uid: string;
  drive_file_id: string | null;
  tree_id: string | null;
  collaborators: Collaborator[] | null;
}

async function getOrCreateShareRecord(
  client: SupabaseClient,
  ownerUid: string,
  driveFileId?: string,
  treeId?: string
): Promise<ShareRecord> {
  const baseQuery = client.from('tree_shares').select('*').eq('owner_uid', ownerUid).limit(1);

  const query = driveFileId
    ? baseQuery.eq('drive_file_id', driveFileId)
    : treeId
      ? baseQuery.eq('tree_id', treeId)
      : baseQuery;

  const { data: existing, error: fetchError } = await query;

  if (fetchError) {
    throw fetchError;
  }

  if (existing && existing.length > 0) {
    return existing[0] as ShareRecord;
  }

  const { data: created, error: createError } = await client
    .from('tree_shares')
    .insert({
      owner_uid: ownerUid,
      drive_file_id: driveFileId || null,
      tree_id: treeId || null,
      collaborators: [],
    })
    .select('*')
    .limit(1);

  if (createError || !created || created.length === 0) {
    throw createError || new Error('Failed to create share settings');
  }

  return created[0] as ShareRecord;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticateUser(req.headers.authorization);

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired authentication token',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const supabase = createSupabaseClientForUser(user);

    if (req.method === 'GET') {
      const { driveFileId, treeId, ownerUid } = req.query as { driveFileId?: string; treeId?: string; ownerUid?: string };
      if ((!driveFileId && !treeId) || !ownerUid) {
        return res.status(400).json({ error: 'driveFileId or treeId, and ownerUid are required' });
      }

      if (ownerUid !== user.uid) {
        return res
          .status(403)
          .json({ error: 'Unauthorized: Only the owner can view share settings' });
      }

      const record = await getOrCreateShareRecord(supabase, ownerUid, driveFileId, treeId);
      return res.status(200).json({ collaborators: record.collaborators || [] });
    }

    if (req.method === 'POST') {
      const { action } = (req.query || {}) as { action?: string };
      const { driveFileId, treeId, ownerUid, email, role } = req.body || {};

      if ((!driveFileId && !treeId) || !ownerUid) {
        return res.status(400).json({ error: 'driveFileId or treeId, and ownerUid are required' });
      }

      if (ownerUid !== user.uid) {
        return res.status(403).json({ error: 'Unauthorized: You can only share your own trees' });
      }

      const record = await getOrCreateShareRecord(supabase, ownerUid, driveFileId, treeId);
      let collaborators: Collaborator[] = Array.isArray(record.collaborators)
        ? record.collaborators
        : [];

      if (action === 'invite') {
        if (!email || !role) {
          return res.status(400).json({ error: 'email and role are required for invite' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existingIndex = collaborators.findIndex(
          (c) => c.email.toLowerCase() === normalizedEmail
        );
        const newCollab: Collaborator = {
          email: normalizedEmail,
          role,
          status: 'active',
        };

        if (existingIndex >= 0) {
          collaborators[existingIndex] = newCollab;
        } else {
          collaborators.push(newCollab);
        }
      } else if (action === 'remove') {
        if (!email) {
          return res.status(400).json({ error: 'email is required for remove' });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        collaborators = collaborators.filter(
          (c) => c.email.toLowerCase() !== normalizedEmail
        );
      } else if (action === 'update_role') {
        if (!email || !role) {
          return res.status(400).json({ error: 'email and role are required for update_role' });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const existingIndex = collaborators.findIndex(
          (c) => c.email.toLowerCase() === normalizedEmail
        );
        if (existingIndex >= 0) {
          collaborators[existingIndex].role = role;
        } else {
          return res.status(404).json({ error: 'Collaborator not found' });
        }
      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }

      const { data: updated, error: updateError } = await supabase
        .from('tree_shares')
        .update({ collaborators })
        .eq('id', record.id)
        .select('*')
        .limit(1);

      if (updateError || !updated || updated.length === 0) {
        throw updateError || new Error('Failed to update share settings');
      }

      return res.status(200).json({ collaborators: updated[0].collaborators || [] });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    const logged = logError('API_SHARE', err, { showToast: false });
    return res.status(500).json({
      error: {
        message: logged.message,
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}
