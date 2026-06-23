import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Helper to load environment variables directly from the project root .env.integration file
function loadEnv() {
  const envPath = resolve(__dirname, '../../.env.integration');
  const content = readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const index = trimmed.indexOf('=');
      if (index !== -1) {
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        env[key] = val.replace(/['"]/g, '').trim(); // strip quotes and trim \r\n
      }
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = env.SUPABASE_INTEGRATION_PROJECT_REF;
const productionProjectRef = env.SUPABASE_PRODUCTION_PROJECT_REF;

if (env.ALLOW_INTEGRATION_MUTATIONS !== 'true') {
  throw new Error('Safety Guard Triggered: ALLOW_INTEGRATION_MUTATIONS=true is required for integration tests.');
}

if (!supabaseUrl || !projectRef || !supabaseUrl.includes(projectRef)) {
  throw new Error(`Safety Guard Triggered: SUPABASE_INTEGRATION_PROJECT_REF (${projectRef}) must be configured and match SUPABASE_URL (${supabaseUrl})`);
}

if (!productionProjectRef) {
  throw new Error('SUPABASE_PRODUCTION_PROJECT_REF is required to prevent integration tests from targeting production.');
}

if (projectRef === productionProjectRef || supabaseUrl.includes(productionProjectRef)) {
  throw new Error('Safety Guard Triggered: integration tests cannot target the production Supabase project.');
}

if (!anonKey || !serviceRoleKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required in .env.integration.');
}

// Create a Supabase client with service role credentials to interact with protected schemas and bypass RLS
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

describe('Database Privacy Integration Tests (Sprint 14B Phase 1)', () => {
  let ownerUserId: string;
  let viewerUserId: string;
  let testTreeId: string;
  
  let ownerClient: SupabaseClient;
  let viewerClient: SupabaseClient;
  
  let ownerEmail: string;
  let viewerEmail: string;
  
  let livingPersonId: string;
  let deceasedPersonId: string;
  let privatePersonId: string;
  let oldPersonId: string;

  beforeEach(async () => {
    ownerEmail = `test-owner-${uuidv4()}@example.com`;
    viewerEmail = `test-viewer-${uuidv4()}@example.com`;
    const password = 'TestPassword123!';

    // 1. Create auth users
    const { data: ownerAuth, error: ownerAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: password,
      email_confirm: true,
    });
    if (ownerAuthErr) throw ownerAuthErr;
    ownerUserId = ownerAuth.user.id;

    const { data: viewerAuth, error: viewerAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: viewerEmail,
      password: password,
      email_confirm: true,
    });
    if (viewerAuthErr) throw viewerAuthErr;
    viewerUserId = viewerAuth.user.id;

    // 2. Create user profiles (or update if trigger created them)
    const { error: ownerProfileErr } = await supabaseAdmin.from('user_profiles').upsert(
      { id: ownerUserId, display_name: 'Owner User', tier: 'pro' }
    );
    if (ownerProfileErr) throw ownerProfileErr;

    const { error: viewerProfileErr } = await supabaseAdmin.from('user_profiles').upsert(
      { id: viewerUserId, display_name: 'Viewer User', tier: 'free' }
    );
    if (viewerProfileErr) throw viewerProfileErr;

    // 3. Create test tree owned by owner
    testTreeId = uuidv4();
    const { error: treeError } = await supabaseAdmin.from('trees').insert({
      id: testTreeId,
      owner_id: ownerUserId,
      name: 'Privacy Integration Test Tree',
    });
    if (treeError) throw treeError;

    // 4. Add viewer as collaborator
    const { error: collabError } = await supabaseAdmin.from('tree_collaborators').insert({
      tree_id: testTreeId,
      email: viewerEmail,
      collaborator_uid: viewerUserId,
      role: 'viewer',
      invited_by: ownerUserId,
    });
    if (collabError) throw collabError;

    // 5. Seed people data
    livingPersonId = uuidv4();
    deceasedPersonId = uuidv4();
    privatePersonId = uuidv4();
    oldPersonId = uuidv4();

    const { error: peopleError } = await supabaseAdmin.from('people').insert([
      {
        id: livingPersonId,
        tree_id: testTreeId,
        first_name: 'Living',
        last_name: 'Relative',
        gender: 'female',
        birth_date: '1990-05-15',
        birth_place: 'New York',
        custom_fields: {
          title: 'Dr.',
          gallery: [{ url: 'https://example.com/pic.jpg' }],
          partnerDetails: {
            spouse1: { type: 'spouse', startDate: '2015-06-20', startPlace: 'Paris' }
          }
        },
        metadata: {
          firstName: 'Living',
          lastName: 'Relative',
          email: 'living-secret@example.com',
          gallery: [{ url: 'https://example.com/metadata-leak.jpg' }]
        }
      },
      {
        id: deceasedPersonId,
        tree_id: testTreeId,
        first_name: 'Deceased',
        last_name: 'Relative',
        gender: 'male',
        birth_date: '1910-01-01',
        death_date: '1995-10-10',
        birth_place: 'London',
        death_place: 'Tokyo',
        custom_fields: {
          isDeceased: true,
          gallery: [{ url: 'https://example.com/old_pic.jpg' }]
        },
        metadata: {}
      },
      {
        id: privatePersonId,
        tree_id: testTreeId,
        first_name: 'Private',
        last_name: 'Member',
        gender: 'female',
        birth_date: '1950-08-20',
        custom_fields: {
          isPrivate: true,
          isDeceased: true // explicitly deceased but private
        },
        metadata: {}
      },
      {
        id: oldPersonId,
        tree_id: testTreeId,
        first_name: 'Ancient',
        last_name: 'Ancestor',
        gender: 'male',
        birth_date: '1890-03-12', // age > 110, should not be masked
        custom_fields: {},
        metadata: {}
      }
    ]);
    if (peopleError) throw peopleError;

    // 6. Sign in and create authenticated clients
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: ownerSession, error: ownerSignInErr } = await authClient.auth.signInWithPassword({
      email: ownerEmail,
      password: password,
    });
    if (ownerSignInErr) throw ownerSignInErr;

    const { data: viewerSession, error: viewerSignInErr } = await authClient.auth.signInWithPassword({
      email: viewerEmail,
      password: password,
    });
    if (viewerSignInErr) throw viewerSignInErr;

    ownerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${ownerSession.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    viewerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${viewerSession.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }, 30000);

  afterEach(async () => {
    if (testTreeId) {
      await supabaseAdmin.from('trees').delete().eq('id', testTreeId);
    }
    if (ownerUserId) {
      await supabaseAdmin.from('user_profiles').delete().eq('id', ownerUserId);
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
    }
    if (viewerUserId) {
      await supabaseAdmin.from('user_profiles').delete().eq('id', viewerUserId);
      await supabaseAdmin.auth.admin.deleteUser(viewerUserId);
    }
  });

  it('allows owner to select from public.people directly', async () => {
    const { data, error } = await ownerClient
      .from('people')
      .select('*')
      .eq('tree_id', testTreeId);

    expect(error).toBeNull();
    expect(data).toHaveLength(4);
  });

  it('blocks viewer from selecting from public.people directly (returns 0 rows)', async () => {
    const { data, error } = await viewerClient
      .from('people')
      .select('*')
      .eq('tree_id', testTreeId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS blocks viewer
  });

  it('blocks viewer from selecting from public.tree_checkpoints directly (returns 0 rows)', async () => {
    // Seed a checkpoint
    const { error: checkpointErr } = await supabaseAdmin.from('tree_checkpoints').insert({
      tree_id: testTreeId,
      version_seq: 1,
      people: {}
    });
    expect(checkpointErr).toBeNull();

    const { data, error } = await viewerClient
      .from('tree_checkpoints')
      .select('*')
      .eq('tree_id', testTreeId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0); // RLS blocks viewer
  });

  it('allows owner to select from public.people_secure view and receive raw unmasked data', async () => {
    const { data, error } = await ownerClient
      .from('people_secure')
      .select('*')
      .eq('tree_id', testTreeId);

    expect(error).toBeNull();
    expect(data).toHaveLength(4);

    const living = data.find((p) => p.id === livingPersonId);
    expect(living.first_name).toBe('Living');
    expect(living.last_name).toBe('Relative');
    expect(living.birth_place).toBe('New York');
    expect(living.birth_date).toBe('1990-05-15');
    expect(living.custom_fields.title).toBe('Dr.');
    expect(living.custom_fields.gallery).toHaveLength(1);
    expect(living.custom_fields.partnerDetails.spouse1.startDate).toBe('2015-06-20');
    expect(living.metadata.email).toBe('living-secret@example.com');
  });

  it('allows viewer to select from public.people_secure view and receive correctly masked data', async () => {
    const { data, error } = await viewerClient
      .from('people_secure')
      .select('*')
      .eq('tree_id', testTreeId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    
    // Check if security_invoker caused 0 rows to be returned
    expect(data).toHaveLength(4);

    const living = data.find((p) => p.id === livingPersonId);
    expect(living.first_name).toBe('Private');
    expect(living.last_name).toBe('');
    expect(living.birth_place).toBe('');
    expect(living.birth_date).toBeNull();
    expect(living.custom_fields.title).toBe('');
    expect(living.custom_fields.gallery).toHaveLength(0);
    expect(living.custom_fields.partnerDetails.spouse1.startDate).toBe('');
    expect(living.custom_fields.partnerDetails.spouse1.type).toBe('spouse'); // retains type
    expect(living.metadata).toEqual({});

    const deceased = data.find((p) => p.id === deceasedPersonId);
    expect(deceased.first_name).toBe('Deceased'); // Deceased, not masked
    expect(deceased.last_name).toBe('Relative');
    expect(deceased.birth_place).toBe('London');
    expect(deceased.birth_date).toBe('1910-01-01');

    const privatePerson = data.find((p) => p.id === privatePersonId);
    expect(privatePerson.first_name).toBe('Private'); // private, masked
    expect(privatePerson.last_name).toBe('');

    const ancient = data.find((p) => p.id === oldPersonId);
    expect(ancient.first_name).toBe('Ancient'); // age > 110, not masked
    expect(ancient.last_name).toBe('Ancestor');
  });

  it('checks if PostgREST supports people_secure(count)', async () => {
    const { data, error } = await ownerClient
      .from('trees')
      .select('id, people_secure!people_tree_id_fkey(count)')
      .eq('id', testTreeId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.people_secure?.[0]?.count).toBe(4);
  });
});
