import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logError } from '../utils/errorLogger';
import { authenticateUser, createSupabaseClientForUser } from '../utils/authUtils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const supabase = createSupabaseClientForUser(user);

    if (req.method === 'GET') {
      const { fileId, treeId } = req.query as { fileId?: string; treeId?: string };
      if (!fileId && !treeId) {
        return res.status(400).json({ error: 'fileId or treeId is required' });
      }

      // 1. Fetch share record to check access using RLS
      let query = supabase.from('tree_shares').select('*').limit(1);
      if (fileId) {
        query = query.eq('drive_file_id', fileId);
      }
      if (treeId) {
        query = query.eq('tree_id', treeId);
      }

      const { data: shareRecords, error: shareError } = await query;

      if (shareError) {
        logError('API_PROXY_SHARE_FETCH', shareError, { showToast: false });
        throw shareError;
      }

      const record = shareRecords && shareRecords[0];

      if (!record) {
        return res.status(404).json({
          error: {
            message: 'This tree has not been shared.',
            code: 'NOT_FOUND',
          },
        });
      }

      // 2. Check Permissions (extra defense-in-depth; RLS should also enforce)
      const collaborators = record.collaborators || [];
      const isOwner = record.owner_uid === user.uid;
      const isCollaborator = collaborators.some(
        (c: any) => c.email.toLowerCase() === user.email.toLowerCase()
      );

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({
          error: {
            message: 'Access Denied: You are not invited to this tree.',
            code: 'FORBIDDEN',
          },
        });
      }

      // 3. Fetch Tree Data if treeId is provided
      if (treeId) {
        const { data: trees, error: treeError } = await supabase
          .from('trees')
          .select('*, people(*), relationships(*)')
          .eq('id', treeId)
          .limit(1);

        if (treeError) {
          logError('API_PROXY_TREE_FETCH', treeError, { showToast: false });
          throw treeError;
        }

        if (!trees || (trees as any[]).length === 0) {
          return res.status(404).json({
            error: {
              message: 'Tree not found',
              code: 'NOT_FOUND',
            },
          });
        }

        return res.status(200).json(trees[0]);
      }

      // 4. Fetch from Google if fileId is provided (LEGACY/FALLBACK)
      // This part is problematic if the user doesn't have Google access, 
      // but if it's a Drive file, we might still want to try if we had a service account 
      // or if we rely on the owner's proxy token (which we haven't implemented).
      return res.status(501).json({
        error: {
          message: 'Google Drive proxy requires owner delegation.',
          code: 'NOT_IMPLEMENTED',
        },
      });
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    const logged = logError('API_PROXY', err, { showToast: false });
    return res.status(500).json({
      error: {
        message: logged.message,
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}
