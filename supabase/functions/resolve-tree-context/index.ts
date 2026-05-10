import { createClient } from 'npm:@supabase/supabase-js@2';

type ResolveTreeContextRequest = {
  personId?: string;
};

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
  const serviceRoleKey = Deno.env.get('JOZOR_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase Edge Function is missing server credentials.' });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json(401, { error: 'Missing bearer token.' });
  }

  let body: ResolveTreeContextRequest;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  const personId = body.personId?.trim();
  if (!personId) {
    return json(400, { error: '"personId" is required.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  const token = authorization.slice('Bearer '.length).trim();
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return json(401, { error: 'Unauthorized.' });
  }

  const { data: personRow, error: personError } = await adminClient
    .from('people')
    .select('id, tree_id')
    .eq('id', personId)
    .maybeSingle();

  if (personError) {
    return json(500, { error: 'Failed to resolve the requested person.' });
  }

  if (!personRow?.tree_id) {
    return json(404, { error: 'Person not found.' });
  }

  const { data: treeRow, error: treeError } = await adminClient
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
  const identityFilter = user.id && normalizedEmail
    ? `collaborator_uid.eq.${user.id},email.eq.${normalizedEmail}`
    : user.id
      ? `collaborator_uid.eq.${user.id}`
      : `email.eq.${normalizedEmail}`;

  const { data: collaboratorRow, error: collaboratorError } = await adminClient
    .from('tree_collaborators')
    .select('role')
    .eq('tree_id', treeRow.id)
    .or(identityFilter)
    .maybeSingle();

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
