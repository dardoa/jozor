import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Person } from '../types';
import { logError, logInfo } from '../utils/errorLogger';
import { authenticateUser, createSupabaseClientForUser } from '../utils/authUtils';
import { mapPersonToDbRow } from '../services/personRowMapper';

type ProxyPerson = Person & { id: string };
type ProxyRelationship = { tree_id: string; person_id: string; relative_id: string; type: 'parent' | 'spouse' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidProxyPerson(person: unknown): person is ProxyPerson {
  if (!person || typeof person !== 'object' || Array.isArray(person)) {
    return false;
  }
  const p = person as Record<string, unknown>;
  if (typeof p.id !== 'string' || !p.id) {
    return false;
  }
  if ('parents' in p && p.parents !== undefined && !isStringArray(p.parents)) {
    return false;
  }
  if ('spouses' in p && p.spouses !== undefined && !isStringArray(p.spouses)) {
    return false;
  }
  if ('children' in p && p.children !== undefined && !isStringArray(p.children)) {
    return false;
  }
  return true;
}

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

    if (user.type !== 'internal' || !user.token) {
      return res.status(401).json({
        error: {
          message: 'This endpoint requires an internal Supabase JWT',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const supabase = createSupabaseClientForUser(user);

    if (req.method === 'GET') {
      const { fileId, treeId } = req.query as { fileId?: string; treeId?: string };
      if (fileId && !treeId) {
        return res.status(410).json({
          error: {
            message: 'Legacy Google Drive proxy sharing has been disabled. Use a database-backed shared tree link.',
            code: 'LEGACY_DRIVE_SHARING_DISABLED',
          },
        });
      }

      if (!treeId) {
        return res.status(400).json({ error: 'treeId is required' });
      }

      // DB tree loading no longer depends on tree_shares. Access is enforced by
      // trees/people/relationships RLS through owner + tree_collaborators.
      if (treeId) {
        const { data: tree, error: treeError } = await supabase
          .from('trees')
          .select('*')
          .eq('id', treeId)
          .maybeSingle();

        if (treeError) {
          logError('API_PROXY_TREE_FETCH', treeError, { showToast: false });
          throw treeError;
        }

        if (!tree) {
          return res.status(404).json({
            error: {
              message: 'Tree not found',
              code: 'NOT_FOUND',
            },
          });
        }

        const [
          { data: people, error: peopleError },
          { data: relationships, error: relationshipsError },
        ] = await Promise.all([
          supabase.from('people').select('*').eq('tree_id', treeId),
          supabase.from('relationships').select('*').eq('tree_id', treeId),
        ]);

        if (peopleError) {
          logError('API_PROXY_PEOPLE_FETCH', peopleError, {
            showToast: false,
            metadata: { treeId, userId: user.uid },
          });
          throw peopleError;
        }

        if (relationshipsError) {
          logError('API_PROXY_RELATIONSHIPS_FETCH', relationshipsError, {
            showToast: false,
            metadata: { treeId, userId: user.uid },
          });
          throw relationshipsError;
        }

        return res.status(200).json({
          ...tree,
          people: people ?? [],
          relationships: relationships ?? [],
        });
      }

    }

    if (req.method === 'POST') {
      const body = isRecord(req.body) ? req.body : {};
      const treeId = typeof body.treeId === 'string' ? body.treeId : '';
      const content = body.content;
      if (!treeId || !content) {
        return res.status(400).json({ error: 'treeId and content are required' });
      }

      if (!isRecord(content)) {
        return res.status(400).json({ error: 'content must be a person map' });
      }

      // 1. Check WRITE access against the real collaborator source of truth.
      const { data: tree, error: treeError } = await supabase
        .from('trees')
        .select('owner_id')
        .eq('id', treeId)
        .maybeSingle();

      if (treeError || !tree) {
        return res.status(404).json({ error: 'Tree not found or access denied' });
      }

      const isOwner = tree.owner_id === user.uid;
      let canEdit = isOwner;

      if (!canEdit) {
        const { data: collaborator, error: collaboratorError } = await supabase
          .from('tree_collaborators')
          .select('role')
          .eq('tree_id', treeId)
          .eq('email', user.email.toLowerCase())
          .maybeSingle();

        if (collaboratorError) {
          return res.status(403).json({ error: 'Unable to verify collaborator permissions' });
        }

        canEdit = collaborator?.role === 'editor';
      }

      if (!canEdit) {
        return res.status(403).json({ error: 'Insufficient permissions to update this tree' });
      }

      // 2. Perform the update
      // We map the content map back to arrays for bulk insertion
      const peopleValues = Object.values(content);
      for (const val of peopleValues) {
        if (!isValidProxyPerson(val)) {
          return res.status(400).json({ error: 'Invalid person data in content' });
        }
      }

      const people = peopleValues as ProxyPerson[];
      const peoplePayload = people.map((p) => mapPersonToDbRow(p, treeId));

      const relationships: ProxyRelationship[] = [];
      people.forEach((p) => {
        (p.parents || []).forEach((pid: string) => {
          relationships.push({ tree_id: treeId, person_id: p.id, relative_id: pid, type: 'parent' });
        });
        (p.spouses || []).forEach((sid: string) => {
          relationships.push({ tree_id: treeId, person_id: p.id, relative_id: sid, type: 'spouse' });
        });
      });

      const { error: replaceError } = await supabase.rpc('replace_tree_content', {
        p_tree_id: treeId,
        p_people: peoplePayload,
        p_relationships: relationships,
      });
      if (replaceError) {
        logError('API_PROXY_REPLACE_TREE_CONTENT', replaceError, {
          category: 'DATABASE',
          severity: 'HIGH',
          metadata: {
            treeId,
            userId: user.uid,
            operationType: 'replace_tree_content',
            peopleCount: peoplePayload.length,
            relationshipCount: relationships.length,
          }
        });
        throw replaceError;
      }

      logInfo('API_PROXY_REPLACE_TREE_CONTENT', 'Tree content replaced successfully.', {
        treeId,
        userId: user.uid,
        operationType: 'replace_tree_content',
        peopleCount: peoplePayload.length,
        relationshipCount: relationships.length,
      });

      return res.status(200).json({ success: true, message: 'Tree updated successfully' });
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
    logError('API_PROXY', err, { showToast: false });
    return res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}
