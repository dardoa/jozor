import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

type AuthenticatedUser = {
  uid: string;
  email: string;
};

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
      .digest('base64url');

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const parsed = JSON.parse(base64UrlDecode(payload).toString('utf8')) as {
      sub?: string;
      email?: string;
      exp?: number;
    };

    if (!parsed.sub || !parsed.email) return null;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return { uid: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
}

async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const internalUser = verifyInternalToken(token);
  if (internalUser) return internalUser;

  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  return { uid: data.user.id, email: data.user.email ?? '' };
}

async function deleteFolderRecursively(supabaseAdmin: any, bucket: string, folderPath: string) {
  let hasMore = true;
  while (hasMore) {
    const { data: items, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(folderPath, { limit: 100 });

    if (error) {
      throw new Error(`Failed to list storage path ${bucket}/${folderPath}: ${error.message}`);
    }

    if (!items || items.length === 0) {
      break;
    }

    const filesToDelete: string[] = [];
    const subdirs: string[] = [];

    for (const item of items) {
      if (item.id) {
        filesToDelete.push(`${folderPath}/${item.name}`);
      } else {
        subdirs.push(`${folderPath}/${item.name}`);
      }
    }

    // Recurse into subdirs first
    for (const subdir of subdirs) {
      await deleteFolderRecursively(supabaseAdmin, bucket, subdir);
    }

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from(bucket)
        .remove(filesToDelete);
      if (deleteError) {
        throw new Error(`Failed to delete storage files under ${bucket}/${folderPath}: ${deleteError.message}`);
      }
    } else {
      hasMore = false;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  const user = await authenticateUser(authHeader);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseServiceRole = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseServiceRole || !supabaseAnonKey) {
    console.error('Delete account configuration missing.', {
      hasUrl: Boolean(supabaseUrl),
      hasServiceRole: Boolean(supabaseServiceRole),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // 1. Fetch all trees owned by user to delete their tree storage assets
    const { data: trees, error: treesError } = await supabaseAdmin
      .from('trees')
      .select('id')
      .eq('owner_id', user.uid);

    if (treesError) {
      console.error('Error fetching user trees for deletion:', treesError);
      return res.status(500).json({ error: 'Failed to retrieve user data for deletion' });
    }

    // 2. Delete all avatars in user's profile folder recursively
    const userFolder = `users/${user.uid}`;
    await deleteFolderRecursively(supabaseAdmin, 'avatars', userFolder);

    // 3. Delete all tree-specific folders for trees owned by user
    if (trees && trees.length > 0) {
      for (const tree of trees) {
        const treeFolder = tree.id;
        await deleteFolderRecursively(supabaseAdmin, 'avatars', treeFolder);
      }
    }

    // 4. Initialize user client to perform delete_my_profile_data RPC as the authenticated user
    const token = authHeader!.split(' ')[1];
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { error: dbDeleteError } = await userClient.rpc('delete_my_profile_data');
    if (dbDeleteError) {
      console.error('Error executing delete_my_profile_data RPC:', dbDeleteError);
      return res.status(500).json({ error: 'Failed to delete account data' });
    }

    // 5. Delete the Auth User (ignore if user not found in auth.users, e.g. custom Google users)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (UUID_REGEX.test(user.uid)) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.uid);
      if (authDeleteError) {
        const msg = authDeleteError.message.toLowerCase();
        if (msg.includes('not found') || authDeleteError.status === 404) {
          console.log(`Auth user ${user.uid} not found in auth.users, treating as success.`);
        } else {
          console.error('Error deleting auth user:', authDeleteError);
          return res.status(500).json({ error: 'Failed to delete account authentication record' });
        }
      }
    } else {
      console.log(`User ID ${user.uid} is not a valid UUID, skipping auth.users deletion.`);
    }

    return res.status(200).json({ success: true, message: 'Account and associated data deleted successfully.' });
  } catch (err) {
    console.error('Delete Account Handler Error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}
