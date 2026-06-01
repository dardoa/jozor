import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
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

describe('Supabase SaaS & Security Integration Tests', () => {
  let testUserId: string;
  let testTreeId: string;
  let userClient: any;
  let testUserEmail: string;
  let testUserToken: string;

  beforeEach(async () => {
    testUserEmail = `test-user-${uuidv4()}@example.com`;
    const password = 'TestPassword123!';

    // 1. Create a real auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: password,
      email_confirm: true,
    });
    if (authError) throw authError;
    testUserId = authData.user.id;

    // 2. Check if user profile exists, or create/update it
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .maybeSingle();

    if (!profile) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: testUserId,
          display_name: 'Test User',
          tier: 'free',
        });
      if (profileError) throw profileError;
    } else {
      await supabaseAdmin
        .from('user_profiles')
        .update({ tier: 'free' })
        .eq('id', testUserId);
    }

    // 3. Create a test tree owned by the user
    testTreeId = uuidv4();
    const { error: treeError } = await supabaseAdmin
      .from('trees')
      .insert({
        id: testTreeId,
        owner_id: testUserId,
        name: 'Integration Test Tree',
      });
    if (treeError) throw treeError;

    // 4. Sign in to get JWT token using a separate transient client
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
      email: testUserEmail,
      password: password,
    });
    if (signInError) throw signInError;
    testUserToken = sessionData.session.access_token;

    // 5. Create authenticated client
    userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }, 30000);

  afterEach(async () => {
    // Explicit cleanup keeps staging deterministic even when Auth rows do not
    // cascade into application tables.
    if (testUserId) {
      await supabaseAdmin.storage.from('avatars').remove([
        `users/${testUserId}/avatar.webp`,
        ...(testTreeId ? [`${testTreeId}/avatar.webp`] : []),
      ]);
      if (testTreeId) {
        await supabaseAdmin.from('trees').delete().eq('id', testTreeId);
      }
      await supabaseAdmin.from('user_profiles').delete().eq('id', testUserId);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Collaborator Limits Enforcement', () => {
    it('blocks collaborators on Free tier', async () => {
      // Free tier: cannot add any collaborators
      const collabId = uuidv4();
      const { error } = await supabaseAdmin
        .from('tree_collaborators')
        .insert({
          id: collabId,
          tree_id: testTreeId,
          email: 'collab@example.com',
          role: 'editor',
          invited_by: testUserId,
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Free tier trees cannot have collaborators');
    });

    it('allows at most 1 Co-Editor on Pro tier', async () => {
      // 1. Upgrade user to Pro
      const { error: upgradeError } = await supabaseAdmin
        .from('user_profiles')
        .update({ tier: 'pro' })
        .eq('id', testUserId);
      expect(upgradeError).toBeNull();

      // 2. Add first editor (should succeed)
      const collab1Id = uuidv4();
      const { error: error1 } = await supabaseAdmin
        .from('tree_collaborators')
        .insert({
          id: collab1Id,
          tree_id: testTreeId,
          email: 'collab-pro-1@example.com',
          role: 'editor',
          invited_by: testUserId,
        });
      expect(error1).toBeNull();

      // 3. Add second editor (should fail)
      const collab2Id = uuidv4();
      const { error: error2 } = await supabaseAdmin
        .from('tree_collaborators')
        .insert({
          id: collab2Id,
          tree_id: testTreeId,
          email: 'collab-pro-2@example.com',
          role: 'editor',
          invited_by: testUserId,
        });

      expect(error2).toBeDefined();
      expect(error2?.message).toContain('Pro tier trees are limited to exactly 1 Co-Editor');
    });

    it('allows unlimited editors on Family tier', async () => {
      // 1. Upgrade user to Family
      const { error: upgradeError } = await supabaseAdmin
        .from('user_profiles')
        .update({ tier: 'family' })
        .eq('id', testUserId);
      expect(upgradeError).toBeNull();

      // 2. Add multiple editors (should succeed)
      const { error: error1 } = await supabaseAdmin
        .from('tree_collaborators')
        .insert({
          tree_id: testTreeId,
          email: 'collab-fam-1@example.com',
          role: 'editor',
          invited_by: testUserId,
        });
      expect(error1).toBeNull();

      const { error: error2 } = await supabaseAdmin
        .from('tree_collaborators')
        .insert({
          tree_id: testTreeId,
          email: 'collab-fam-2@example.com',
          role: 'editor',
          invited_by: testUserId,
        });
      expect(error2).toBeNull();
    });
  });

  describe('Webhook Events & Replay Protection', () => {
    it('processes paddle webhook events atomically and rejects duplicate event_ids', async () => {
      const eventId = `evt_${uuidv4()}`;
      const subscriptionId = `sub_${uuidv4()}`;
      const customerId = `cust_${uuidv4()}`;
      const occurredAt = new Date().toISOString();

      // 1. Process event first time (should return true)
      const { data: result1, error: error1 } = await supabaseAdmin.rpc(
        'process_paddle_subscription_event',
        {
          p_event_id: eventId,
          p_occurred_at: occurredAt,
          p_user_id: testUserId,
          p_subscription_id: subscriptionId,
          p_customer_id: customerId,
          p_status: 'active',
          p_plan_id: 'pro_monthly_price_id',
          p_current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          p_tier: 'pro',
        }
      );

      expect(error1).toBeNull();
      expect(result1).toBe(true);

      // Verify profile is upgraded and subscription is saved
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('tier')
        .eq('id', testUserId)
        .single();
      expect(profile?.tier).toBe('pro');

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status, plan_id')
        .eq('user_id', testUserId)
        .single();
      expect(sub?.status).toBe('active');
      expect(sub?.plan_id).toBe('pro_monthly_price_id');

      // 2. Send same event again (should return false and not throw error)
      const { data: result2, error: error2 } = await supabaseAdmin.rpc(
        'process_paddle_subscription_event',
        {
          p_event_id: eventId,
          p_occurred_at: occurredAt,
          p_user_id: testUserId,
          p_subscription_id: subscriptionId,
          p_customer_id: customerId,
          p_status: 'active',
          p_plan_id: 'pro_monthly_price_id',
          p_current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          p_tier: 'pro',
        }
      );

      expect(error2).toBeNull();
      expect(result2).toBe(false); // Duplicate event ignored
    });
  });

  describe('AI Monthly Quota Reservation Flow', () => {
    it('implements reserve, complete, and refund flows atomically', async () => {
      // 1. Upgrade user to Pro
      await supabaseAdmin.from('user_profiles').update({ tier: 'pro' }).eq('id', testUserId);

      // Initialize usage limit in ai_monthly_usage
      const { error: usageInitError } = await supabaseAdmin
        .from('ai_monthly_usage')
        .insert({
          user_id: testUserId,
          cloud_requests_used: 0,
          cloud_requests_limit: 3, // Set a tiny limit for testing
          reset_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        });
      expect(usageInitError).toBeNull();

      // 2. Reserve first slot
      const { data: reservation1, error: reserveError1 } = await supabaseAdmin.rpc(
        'reserve_ai_usage_atomic',
        { p_user_id: testUserId }
      );
      expect(reserveError1).toBeNull();
      expect(reservation1).toBeDefined();

      // Check requests used count increased to 1
      let { data: usage } = await supabaseAdmin
        .from('ai_monthly_usage')
        .select('cloud_requests_used')
        .eq('user_id', testUserId)
        .single();
      expect(usage?.cloud_requests_used).toBe(1);

      // 3. Reserve second and third slot
      const { data: reservation2 } = await supabaseAdmin.rpc(
        'reserve_ai_usage_atomic',
        { p_user_id: testUserId }
      );
      const { data: reservation3 } = await supabaseAdmin.rpc(
        'reserve_ai_usage_atomic',
        { p_user_id: testUserId }
      );
      expect(reservation2).toBeDefined();
      expect(reservation3).toBeDefined();

      // 4. Try to reserve fourth slot (should exceed limit)
      const { data: reservation4, error: reserveError4 } = await supabaseAdmin.rpc(
        'reserve_ai_usage_atomic',
        { p_user_id: testUserId }
      );
      expect(reserveError4).toBeDefined();
      expect(reserveError4?.message).toContain('AI monthly usage quota exceeded');
      expect(reservation4).toBeNull();

      // 5. Refund one slot
      const { data: refundResult, error: refundError } = await supabaseAdmin.rpc(
        'refund_ai_usage_reservation',
        { p_reservation_id: reservation3 }
      );
      expect(refundError).toBeNull();
      expect(refundResult).toBe(true);

      // Used count should go back to 2
      const { data: usageAfterRefund } = await supabaseAdmin
        .from('ai_monthly_usage')
        .select('cloud_requests_used')
        .eq('user_id', testUserId)
        .single();
      expect(usageAfterRefund?.cloud_requests_used).toBe(2);

      // 6. Complete a reservation
      const { data: completeResult, error: completeError } = await supabaseAdmin.rpc(
        'complete_ai_usage_reservation',
        { p_reservation_id: reservation2 }
      );
      expect(completeError).toBeNull();
      expect(completeResult).toBe(true);

      // 7. Verify reservation status in black-box transition assertions
      // Try to complete again (should return false since already completed)
      const { data: completeAgain } = await supabaseAdmin.rpc(
        'complete_ai_usage_reservation',
        { p_reservation_id: reservation2 }
      );
      expect(completeAgain).toBe(false);

      // Try to refund completed reservation (should return false)
      const { data: refundCompleted } = await supabaseAdmin.rpc(
        'refund_ai_usage_reservation',
        { p_reservation_id: reservation2 }
      );
      expect(refundCompleted).toBe(false);

      // Try to refund already refunded reservation (should return false)
      const { data: refundAgain } = await supabaseAdmin.rpc(
        'refund_ai_usage_reservation',
        { p_reservation_id: reservation3 }
      );
      expect(refundAgain).toBe(false);
    });
  });

  describe('Checkout Rate Limiting', () => {
    it('enforces a strict limit of 5 checkout requests per minute', async () => {
      // Send 5 requests (should return true)
      for (let i = 0; i < 5; i++) {
        const { data: allowed, error } = await supabaseAdmin.rpc(
          'check_checkout_rate_limit',
          { p_user_id: testUserId }
        );
        expect(error).toBeNull();
        expect(allowed).toBe(true);
      }

      // 6th request (should return false)
      const { data: allowed6, error: error6 } = await supabaseAdmin.rpc(
        'check_checkout_rate_limit',
        { p_user_id: testUserId }
      );
      expect(error6).toBeNull();
      expect(allowed6).toBe(false);
    });
  });

  describe('Checkpoints Relationship Reconstruction & Serialization', () => {
    it('generates a checkpoint that accurately rebuilds parents, children, and spouses relationships', async () => {
      const p1 = uuidv4();
      const p2 = uuidv4();
      const p3 = uuidv4();

      // Insert three family members:
      // p1 (Lina) is spouse of p2 (Samer). p3 (Firas) is child of p1.
      await supabaseAdmin.from('people').insert([
        { id: p1, tree_id: testTreeId, first_name: 'Lina', last_name: 'Alqarji', gender: 'female' },
        { id: p2, tree_id: testTreeId, first_name: 'Samer', last_name: 'Alqarji', gender: 'male' },
        { id: p3, tree_id: testTreeId, first_name: 'Firas', last_name: 'Alqarji', gender: 'male' },
      ]);

      // Add relationships
      await supabaseAdmin.from('relationships').insert([
        { tree_id: testTreeId, person_id: p1, relative_id: p2, type: 'spouse' },
        { tree_id: testTreeId, person_id: p1, relative_id: p3, type: 'child' },
      ]);

      // Add a dummy operation at version 49
      const { error: opInitError } = await supabaseAdmin.from('tree_operations').insert({
        tree_id: testTreeId,
        user_id: testUserId,
        type: 'SET_TREE_METADATA',
        payload: {},
        version_seq: 49,
      });
      expect(opInitError).toBeNull();

      // Sync 1 operation via userClient (auth context) to trigger crossing 50 version_seq and auto-generating checkpoint
      const updateOp = {
        tree_id: testTreeId,
        user_id: testUserId,
        type: 'UPDATE_PROP',
        payload: {
          id: p1,
          updates: { bio: 'Trigger checkpoint' },
        },
      };

      const { data: syncResult, error: syncError } = await userClient.rpc(
        'sync_tree_batch',
        { p_ops: [updateOp] }
      );
      expect(syncError).toBeNull();
      expect(syncResult).toBe(1);

      // Fetch the generated checkpoint
      const { data: checkpoint, error: fetchError } = await supabaseAdmin
        .from('tree_checkpoints')
        .select('*')
        .eq('tree_id', testTreeId)
        .single();
      expect(fetchError).toBeNull();
      expect(checkpoint).toBeDefined();
      expect(checkpoint.version_seq).toBe(50);

      const peopleSnapshot = checkpoint?.people;
      expect(peopleSnapshot).toBeDefined();

      const lina = peopleSnapshot[p1];
      const samer = peopleSnapshot[p2];
      const firas = peopleSnapshot[p3];

      expect(lina).toBeDefined();
      expect(samer).toBeDefined();
      expect(firas).toBeDefined();

      // Assert correct relationship serialization
      expect(lina.spouses).toContain(p2);
      expect(lina.children).toContain(p3);

      expect(samer.spouses).toContain(p1);
      expect(samer.children).toContain(p3); // derived child from p1's child since they are spouses!

      expect(firas.parents).toContain(p1);
      expect(firas.parents).toContain(p2); // derived parent from spouse of parent!
    });
  });

  describe('AI Usage Expiry (expired_charged)', () => {
    it.skip('handles AI reservation expiry transition to expired_charged without refund', async () => {
      // 1. Create a usage record for the user
      await supabaseAdmin.from('ai_monthly_usage').insert({
        user_id: testUserId,
        cloud_requests_used: 1,
        cloud_requests_limit: 5,
        reset_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      });

      // 2. Insert a reservation with past expires_at
      const reservationId = uuidv4();
      const { error: insertErr } = await supabaseAdmin.rpc('test_helper_insert_reservation', {
        p_id: reservationId,
        p_user_id: testUserId,
        p_expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
        p_status: 'reserved'
      });
      expect(insertErr).toBeNull();

      // 3. Call reserve_ai_usage_atomic (should trigger expiry cleanup)
      const { error } = await supabaseAdmin.rpc('reserve_ai_usage_atomic', { p_user_id: testUserId });
      expect(error).toBeNull();

      // 4. Verify original reservation is now expired_charged
      const { data: status, error: statusError } = await supabaseAdmin.rpc('test_helper_get_reservation_status', {
        p_id: reservationId
      });
      expect(statusError).toBeNull();
      expect(status).toBe('expired_charged');

      // 5. Verify the used count is 2 (original 1 + new 1) and not refunded/decremented
      const { data: usage } = await supabaseAdmin
        .from('ai_monthly_usage')
        .select('cloud_requests_used')
        .eq('user_id', testUserId)
        .single();
      expect(usage?.cloud_requests_used).toBe(2);
    });
  });

  describe('Profile Tier Protection', () => {
    it('prevents tier manipulation through profile update RPC', async () => {
      // 1. Call update_my_profile RPC as the user with a payload attempting to set tier to 'family'
      const { error } = await userClient.rpc('update_my_profile', {
        p_updates: { displayName: 'Hacker', tier: 'family' }
      });
      expect(error).toBeNull();

      // 2. Verify display name updated but tier remained 'free'
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('display_name, tier')
        .eq('id', testUserId)
        .single();
      expect(profile?.display_name).toBe('Hacker');
      expect(profile?.tier).toBe('free');
    });
  });

  describe('Google Onboarding Profile Check', () => {
    it('creates a profile via ensure_user_profile RPC for Google users', async () => {
      const googleUid = `google-${uuidv4()}`;

      const { error } = await supabaseAdmin.rpc('ensure_user_profile', {
        p_user_id: googleUid,
        p_display_name: 'Google Logged In',
        p_photo_url: 'https://example.com/photo.jpg'
      });
      expect(error).toBeNull();

      // Verify profile is created
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', googleUid)
        .single();
      expect(profile).toBeDefined();
      expect(profile.display_name).toBe('Google Logged In');
      expect(profile.tier).toBe('free');

      // Cleanup
      await supabaseAdmin.from('user_profiles').delete().eq('id', googleUid);
    });
  });

  describe('New User standard signup trigger', () => {
    it('automatically creates a user profile with free tier on signup', async () => {
      const signupEmail = `signup-user-${uuidv4()}@example.com`;
      const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email: signupEmail,
        password: 'Password123!',
        email_confirm: true
      });
      expect(error).toBeNull();
      const signupUserId = authData.user.id;

      try {
        // Verify profile exists with tier free
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', signupUserId)
          .single();
        expect(profile).toBeDefined();
        expect(profile.tier).toBe('free');
      } finally {
        await supabaseAdmin.auth.admin.deleteUser(signupUserId);
      }
    });
  });

  describe('Storage Policy Enforcement', () => {
    it('enforces explicit storage RLS policies for avatars bucket', async () => {
      // 1. Uploading file to own user folder: users/{testUserId}/avatar.webp (should succeed)
      const fileContent = Buffer.from('avatar data');
      const { data: upload1, error: uploadError1 } = await userClient.storage
        .from('avatars')
        .upload(`users/${testUserId}/avatar.webp`, fileContent, {
          contentType: 'image/webp',
          upsert: true
        });
      expect(uploadError1).toBeNull();
      expect(upload1).toBeDefined();

      // 2. Uploading file to other user folder: users/other-uid/avatar.webp (should fail)
      const { error: uploadError2 } = await userClient.storage
        .from('avatars')
        .upload(`users/another-user-id/avatar.webp`, fileContent, {
          contentType: 'image/webp',
          upsert: true
        });
      expect(uploadError2).toBeDefined();

      // 3. Uploading file to owned tree folder: {testTreeId}/avatar.webp (should succeed)
      const { data: upload3, error: uploadError3 } = await userClient.storage
        .from('avatars')
        .upload(`${testTreeId}/avatar.webp`, fileContent, {
          contentType: 'image/webp',
          upsert: true
        });
      expect(uploadError3).toBeNull();
      expect(upload3).toBeDefined();

      // 4. Uploading file to non-owned tree folder: {someRandomTreeId}/avatar.webp (should fail)
      const otherTreeId = uuidv4();
      const { error: uploadError4 } = await userClient.storage
        .from('avatars')
        .upload(`${otherTreeId}/avatar.webp`, fileContent, {
          contentType: 'image/webp',
          upsert: true
        });
      expect(uploadError4).toBeDefined();

      // Cleanup files
      await supabaseAdmin.storage.from('avatars').remove([
        `users/${testUserId}/avatar.webp`,
        `${testTreeId}/avatar.webp`
      ]);
    });
  });

  describe('Free tier replacement limits', () => {
    it('enforces 100 people limits on Free tier replace_tree_content', async () => {
      const peoplePayload: any[] = [];
      for (let i = 0; i <= 100; i++) {
        peoplePayload.push({
          id: `person-${i}`,
          firstName: `Person ${i}`,
          lastName: 'Test',
          gender: 'male'
        });
      }

      const { error } = await userClient.rpc('replace_tree_content', {
        p_tree_id: testTreeId,
        p_people: peoplePayload,
        p_relationships: []
      });

      expect(error).toBeDefined();
      expect(error?.code).toBe('P0001');
      expect(error?.message).toContain('Free tier limit reached');
    });
  });

  describe('Account Deletion serverless endpoint', () => {
    it('deletes account and storage assets securely via the serverless function', async () => {
      const { default: deleteAccountHandler } = await import('../../api/auth/delete-account');

      // Set environment variables for the handler call
      process.env.SUPABASE_URL = supabaseUrl;
      process.env.VITE_SUPABASE_URL = supabaseUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
      process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
      process.env.SUPABASE_JWT_SECRET = env.SUPABASE_JWT_SECRET;

      // Upload dummy file to avatars storage under users/{testUserId}/avatar.webp
      const testFileContent = Buffer.from('dummy image content');
      const { error: uploadError } = await userClient.storage
        .from('avatars')
        .upload(`users/${testUserId}/avatar.webp`, testFileContent, {
          contentType: 'image/webp',
          upsert: true
        });
      expect(uploadError).toBeNull();

      const mockReq = {
        method: 'POST',
        headers: {
          authorization: `Bearer ${testUserToken}`,
        },
      } as any;

      let resStatus = 0;
      let resJson: any = null;
      const mockRes = {
        status(code: number) {
          resStatus = code;
          return this;
        },
        json(data: any) {
          resJson = data;
          return this;
        }
      } as any;

      await deleteAccountHandler(mockReq, mockRes);

      expect(resStatus).toBe(200);
      expect(resJson?.success).toBe(true);

      // Verify DB records are gone
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', testUserId)
        .maybeSingle();
      expect(profile).toBeNull();

      const { data: tree } = await supabaseAdmin
        .from('trees')
        .select('*')
        .eq('id', testTreeId)
        .maybeSingle();
      expect(tree).toBeNull();

      // Verify storage file is gone
      const { data: storageFiles } = await supabaseAdmin.storage
        .from('avatars')
        .list(`users/${testUserId}`);
      expect(storageFiles || []).toHaveLength(0);

      // Nullify testUserId in test context so afterEach doesn't fail trying to delete already deleted user
      testUserId = '';
    });

    it('tolerates non-existent auth users (Google users) during deletion', async () => {
      const { default: deleteAccountHandler } = await import('../../api/auth/delete-account');

      const googleUid = `google-${uuidv4()}`;
      const now = Math.floor(Date.now() / 1000);

      const crypto = await import('node:crypto');
      const base64UrlEncode = (val: string | Buffer) => {
        const buffer = typeof val === 'string' ? Buffer.from(val) : val;
        return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      };

      const payload = {
        aud: 'authenticated',
        role: 'authenticated',
        sub: googleUid,
        email: 'google-user@example.com',
        iat: now,
        exp: now + 3600
      };
      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = base64UrlEncode(JSON.stringify(header));
      const encodedPayload = base64UrlEncode(JSON.stringify(payload));
      const data = `${encodedHeader}.${encodedPayload}`;
      const encodedSignature = base64UrlEncode(
        crypto.createHmac('sha256', env.SUPABASE_JWT_SECRET).update(data).digest()
      );
      const googleToken = `${data}.${encodedSignature}`;

      // Insert user_profile and tree for this google user
      await supabaseAdmin.from('user_profiles').insert({
        id: googleUid,
        display_name: 'Google User',
        tier: 'free'
      });
      const googleTreeId = uuidv4();
      await supabaseAdmin.from('trees').insert({
        id: googleTreeId,
        owner_id: googleUid,
        name: 'Google Tree'
      });

      const mockReq = {
        method: 'POST',
        headers: {
          authorization: `Bearer ${googleToken}`
        }
      } as any;

      let resStatus = 0;
      let resJson: any = null;
      const mockRes = {
        status(code: number) {
          resStatus = code;
          return this;
        },
        json(data: any) {
          resJson = data;
          return this;
        }
      } as any;

      await deleteAccountHandler(mockReq, mockRes);
      expect(resStatus).toBe(200);
      expect(resJson?.success).toBe(true);

      const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('id', googleUid).maybeSingle();
      expect(profile).toBeNull();
    });
  });
}, 30000);
