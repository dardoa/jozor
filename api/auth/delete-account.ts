import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createLimit } from '../../shared/concurrency';
import { verifyInternalToken } from '../../shared/auth/internalJwt';

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

type AuthenticatedUser = {
  uid: string;
  email: string;
};

async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const internalUser = await verifyInternalToken(token, getEnv('SUPABASE_JWT_SECRET'));
  if (internalUser) {
    return {
      uid: internalUser.uid,
      email: internalUser.email,
    };
  }

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

async function deleteFolderIteratively(
  supabaseAdmin: SupabaseClient,
  bucket: string,
  rootFolderPath: string,
  limit: ReturnType<typeof createLimit>
) {
  const dirQueue: string[] = [rootFolderPath];
  const allFiles: string[] = [];
  const scanConcurrency = 5;
  let activeScans = 0;
  let firstScanError: unknown = null;

  await new Promise<void>((resolve, reject) => {
    const pumpScans = () => {
      if (firstScanError) {
        if (activeScans === 0) {
          reject(firstScanError);
        }
        return;
      }

      while (activeScans < scanConcurrency && dirQueue.length > 0) {
        const currentDir = dirQueue.shift();
        if (!currentDir) break;

        activeScans++;
        void limit(async () => {
          try {
            let offset = 0;
            const queryLimit = 100;
            let hasMore = true;

            while (hasMore) {
              const { data: items, error } = await supabaseAdmin.storage
                .from(bucket)
                .list(currentDir, {
                  limit: queryLimit,
                  offset,
                  sortBy: { column: 'name', order: 'asc' },
                });

              if (error) {
                throw new Error(
                  `Failed to list storage path ${bucket}/${currentDir}: ${error.message}`
                );
              }

              if (!items || items.length === 0) {
                break;
              }

              for (const item of items) {
                if (item.id) {
                  allFiles.push(`${currentDir}/${item.name}`);
                } else {
                  dirQueue.push(`${currentDir}/${item.name}`);
                }
              }

              if (items.length < queryLimit) {
                hasMore = false;
              } else {
                offset += queryLimit;
              }
            }
          } catch (error) {
            firstScanError ??= error;
          }
        }).finally(() => {
          activeScans--;
          pumpScans();
        });
      }

      if (dirQueue.length === 0 && activeScans === 0) {
        resolve();
      }
    };

    pumpScans();
  });

  if (firstScanError) {
    throw firstScanError;
  }

  // Delete all collected files in chunks of 100
  const chunks: string[][] = [];
  for (let i = 0; i < allFiles.length; i += 100) {
    chunks.push(allFiles.slice(i, i + 100));
  }

  const deleteResults = await Promise.allSettled(
    chunks.map((chunk) =>
      limit(async () => {
        const { error: deleteError } = await supabaseAdmin.storage.from(bucket).remove(chunk);
        if (deleteError) {
          throw new Error(`Failed to delete storage files under ${bucket}: ${deleteError.message}`);
        }
      })
    )
  );

  const failures = deleteResults.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  if (failures.length > 0) {
    const errorMsg = failures.map((f) => f.reason instanceof Error ? f.reason.message : String(f.reason)).join(', ');
    throw new Error(`Failed to delete storage files under ${bucket}: ${errorMsg}`);
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

    const limit = createLimit(5);
    const deleteTasks: Promise<void>[] = [];

    // 2. Delete all avatars in user's profile folder recursively (iteratively using limiter)
    const userFolder = `users/${user.uid}`;
    deleteTasks.push(deleteFolderIteratively(supabaseAdmin, 'avatars', userFolder, limit));

    // 3. Delete all tree-specific folders for trees owned by user in parallel (using shared limiter)
    if (trees && trees.length > 0) {
      for (const tree of trees) {
        deleteTasks.push(deleteFolderIteratively(supabaseAdmin, 'avatars', tree.id, limit));
      }
    }

    const deleteResults = await Promise.allSettled(deleteTasks);
    const failures = deleteResults.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
      const errorMsg = failures.map((f) => f.reason instanceof Error ? f.reason.message : String(f.reason)).join(', ');
      console.error(`Storage deletion failed details: ${errorMsg}`);
      throw new Error('Storage deletion failed');
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
          console.info(`Auth user ${user.uid} not found in auth.users, treating as success.`);
        } else {
          console.error('Error deleting auth user:', authDeleteError);
          return res.status(500).json({ error: 'Failed to delete account authentication record' });
        }
      }
    } else {
      console.info(`User ID ${user.uid} is not a valid UUID, skipping auth.users deletion.`);
    }

    return res
      .status(200)
      .json({ success: true, message: 'Account and associated data deleted successfully.' });
  } catch (err) {
    console.error('Delete Account Handler Error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}
