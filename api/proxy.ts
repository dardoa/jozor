import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

type AuthenticatedUser = {
  uid: string;
  email: string;
  token: string;
  type: 'internal';
};

type ProxyPerson = Record<string, any> & { id: string };
type ProxyRelationship = {
  tree_id: string;
  person_id: string;
  relative_id: string;
  type: 'parent' | 'spouse';
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getSupabaseUrl() {
  return getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
}

function getSupabaseAnonKey() {
  return getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='), 'base64');
}

function verifyInternalToken(token: string): AuthenticatedUser | null {
  const jwtSecret = getEnv('SUPABASE_JWT_SECRET');
  if (!jwtSecret) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) return null;

    const parsed = JSON.parse(base64UrlDecode(payload).toString('utf8')) as {
      sub?: string;
      email?: string;
      exp?: number;
    };

    if (!parsed.sub || !parsed.email) return null;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      uid: parsed.sub,
      email: parsed.email,
      token,
      type: 'internal',
    };
  } catch {
    return null;
  }
}

function getAuthClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const internalUser = verifyInternalToken(token);
  if (internalUser) return internalUser;

  const authClient = getAuthClient();
  if (!authClient) return null;

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    uid: data.user.id,
    email: data.user.email ?? '',
    token,
    type: 'internal',
  };
}

function createSupabaseClientForUser(user: AuthenticatedUser): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatDateForPostgres(dateStr: unknown): string | null {
  if (typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

function buildPersonCustomFields(person: ProxyPerson) {
  return {
    title: person.title,
    birthSource: person.birthSource,
    deathSource: person.deathSource,
    burialPlace: person.burialPlace,
    residence: person.residence,
    marriageDate: person.marriageDate || '',
    marriagePlace: person.marriagePlace || '',
    gallery: person.gallery || [],
    voiceNotes: person.voiceNotes || [],
    sources: person.sources || [],
    events: person.events || [],
    partnerDetails: person.partnerDetails || {},
    isPrivate: Boolean(person.isPrivate),
  };
}

function mapPersonToDbRow(person: ProxyPerson, treeId: string) {
  const { parents: _parents, spouses: _spouses, children: _children, ...metadata } = person;

  return {
    metadata,
    id: person.id,
    tree_id: treeId,
    first_name: person.firstName || '',
    last_name: person.lastName || '',
    middle_name: person.middleName || null,
    birth_name: person.birthName || null,
    nick_name: person.nickName || null,
    suffix: person.suffix || null,
    gender: person.gender || 'male',
    birth_date: formatDateForPostgres(person.birthDate),
    death_date: formatDateForPostgres(person.deathDate),
    birth_place: person.birthPlace || null,
    death_place: person.deathPlace || null,
    bio: person.bio || null,
    profession: person.profession || null,
    company: person.company || null,
    interests: person.interests || null,
    photo_url: person.photoUrl || null,
    photo_path: person.photoPath || null,
    photo_version: person.photoVersion || 0,
    email: person.email || null,
    website: person.website || null,
    blog: person.blog || null,
    address: person.address || null,
    custom_fields: buildPersonCustomFields(person),
  };
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

      const { data: tree, error: treeError } = await supabase
        .from('trees')
        .select('*')
        .eq('id', treeId)
        .maybeSingle();

      if (treeError) throw treeError;
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

      if (peopleError) throw peopleError;
      if (relationshipsError) throw relationshipsError;

      return res.status(200).json({
        ...tree,
        people: people ?? [],
        relationships: relationships ?? [],
      });
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

      const { data: tree, error: treeError } = await supabase
        .from('trees')
        .select('owner_id')
        .eq('id', treeId)
        .maybeSingle();

      if (treeError || !tree) {
        return res.status(404).json({ error: 'Tree not found or access denied' });
      }

      let canEdit = tree.owner_id === user.uid;
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

      const people = Object.values(content as Record<string, ProxyPerson>);
      const peoplePayload = people.map((person) => mapPersonToDbRow(person, treeId));
      const relationships: ProxyRelationship[] = [];

      people.forEach((person) => {
        (person.parents || []).forEach((parentId: string) => {
          relationships.push({ tree_id: treeId, person_id: person.id, relative_id: parentId, type: 'parent' });
        });
        (person.spouses || []).forEach((spouseId: string) => {
          relationships.push({ tree_id: treeId, person_id: person.id, relative_id: spouseId, type: 'spouse' });
        });
      });

      const { error: replaceError } = await supabase.rpc('replace_tree_content', {
        p_tree_id: treeId,
        p_people: peoplePayload,
        p_relationships: relationships,
      });

      if (replaceError) throw replaceError;

      return res.status(200).json({ success: true, message: 'Tree updated successfully' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API_PROXY] Request failed.', { message });
    return res.status(500).json({
      error: {
        message,
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }
}
