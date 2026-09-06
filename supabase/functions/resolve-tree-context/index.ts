import { createClient } from 'npm:@supabase/supabase-js@2';

type ResolveTreeContextResponse = {
  treeId: string;
  ownerId: string;
  role: 'owner' | 'editor' | 'viewer';
  accessType: 'owner' | 'collaborator';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });

const normalizeEmail = (email: string | undefined) => email?.trim().toLowerCase() ?? '';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    return json(500, { error: 'Supabase Edge Function is missing server credentials.' });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json(401, { error: 'Missing bearer token.' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  const personId = body && typeof body === 'object' && 'personId' in body && typeof body.personId === 'string'
    ? body.personId.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personId)) {
    return json(400, { error: 'A valid personId is required.' });
  }

  // Use caller-scoped RLS, including the masked projection available to viewers.
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  const token = authorization.slice('Bearer '.length).trim();
  const {
    data: { user },
    error: authError,
  } = await callerClient.auth.getUser(token);

  if (authError || !user) {
    return json(401, { error: 'Unauthorized.' });
  }

  const { data: personRow, error: personError } = await callerClient
    .from('people_secure')
    .select('id, tree_id')
    .eq('id', personId)
    .maybeSingle();

  if (personError) {
    return json(500, { error: 'Failed to resolve the requested person.' });
  }

  if (!personRow?.tree_id) {
    return json(404, { error: 'Person not found.' });
  }

  const { data: treeRow, error: treeError } = await callerClient
    .from('trees')
    .select('id, owner_id')
    .eq('id', personRow.tree_id)
    .maybeSingle();

  if (treeError) {
    return json(500, { error: 'Failed to resolve tree context.' });
  }

  if (!treeRow?.id || !treeRow.owner_id) {
    return json(404, { error: 'Tree not found for this person.' });
  }

  if (treeRow.owner_id === user.id) {
    const response: ResolveTreeContextResponse = {
      treeId: treeRow.id,
      ownerId: treeRow.owner_id,
      role: 'owner',
      accessType: 'owner',
    };
    return json(200, response);
  }

  const normalizedEmail = normalizeEmail(user.email);
  let { data: collaboratorRow, error: collaboratorError } = await callerClient
    .from('tree_collaborators')
    .select('role')
    .eq('tree_id', treeRow.id)
    .eq('collaborator_uid', user.id)
    .maybeSingle();

  if (!collaboratorError && !collaboratorRow && normalizedEmail) {
    const emailMembership = await callerClient.from('tree_collaborators')
      .select('role').eq('tree_id', treeRow.id).eq('email', normalizedEmail)
      .is('collaborator_uid', null).maybeSingle();
    collaboratorRow = emailMembership.data;
    collaboratorError = emailMembership.error;
  }

  if (collaboratorError) {
    return json(500, { error: 'Failed to verify tree access.' });
  }

  if (collaboratorRow?.role !== 'editor' && collaboratorRow?.role !== 'viewer') {
    return json(403, { error: 'You do not have access to this tree.' });
  }

  const response: ResolveTreeContextResponse = {
    treeId: treeRow.id,
    ownerId: treeRow.owner_id,
    role: collaboratorRow.role,
    accessType: 'collaborator',
  };

  return json(200, response);
});
