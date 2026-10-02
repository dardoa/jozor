# PR 8 Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six reviewed P2 defects without weakening account ownership or changing production.

**Architecture:** Keep the existing hooks, auth adapter, dropdown and checkout flow. Add a separate durable avatar-retirement queue and an explicit service-only checkout rejection contract. SQL gates precede their client/server consumers; each task has a red/green regression cycle and a scoped commit.

**Tech Stack:** Existing TypeScript/React, Supabase AuthClient and Storage SDK, PostgreSQL/PGlite, Vitest and Testing Library; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-01-pr8-review-fixes-design.md`

**Execution status:** Tasks 1-8 complete locally. Independent final review returned; all three Important findings have regression fixes committed. All final local verification gates pass. No push, merge, deployment or hosted migration was performed.

## Global Constraints

- Work stays on `codex/source-backup-2026-10-01`.
- Do not merge, deploy, run hosted migrations, change payment credentials or production flags, manually invoke cron routes, or enable the account-deletion worker.
- Preserve the existing untracked operational reports without staging them.
- Keep fresh `users/<uid>/profile-<uuid>.webp` names and `upsert: false`.
- Do not delete another account's database row.
- Do not fabricate a transaction ID, reuse cancellation semantics, delete attempt history, or bulk-resolve old attempts.
- Keep the old `update_user_avatar` signature for compatibility.
- Do not alter the tree-specific `person_media_cleanup` ownership model.
- Keep auth-state listeners intact.
- No real user credentials or hosted auth requests are needed.
- Start with the narrow documented HTTP 400 / `request_error` allowlist `transaction_price_not_found` and `invalid_field`.
- Provider error bodies are capped at **32 KiB = 32768 bytes**, within the existing **10000 ms** provider timeout.
- `USER_AVATAR_CLEANUP_ENABLED` remains unset/off. Its server path also requires `PERSON_MEDIA_CLEANUP_ENABLED === 'true'` and the existing cron secret/configuration gates.

## Review Focus

- Same-UID logout/login during a pending push operation must not revive the earlier session's operation; pin this in Task 2 with an A/null/A transition.
- An SDK teardown that never settles must not hang deletion or permit a new session to be erased; pin bounded failure and later recovery in Task 3.
- Normal OAuth/profile updates that do not reattach a retired image must still work; pin this in Task 4 alongside retirement triggers.
- Oversized UTF-8 Paddle replies must be counted in bytes, even without a trustworthy Content-Length; pin streaming cancellation in Task 7.
- An active menu item becoming disabled must not redirect Enter onto its neighbor; pin this in Task 1 with a pending asynchronous status action.

## Execution Order and Files

Tasks 1, 2 and 3 are independent frontend/auth fixes. Task 4 owns the avatar SQL contract; Task 5 consumes it. Task 6 owns the billing SQL contract; Task 7 consumes it. Task 8 verifies the complete branch. These boundaries can be executed and reviewed independently without creating separate product features or extra repository abstractions.

Each listed test file must include the named cases/assertions below. Use existing fixtures where listed; keep new fixtures local to their test unless genuinely shared. A failing test counts as red only when its assertion fails for the intended behavior, not because the runner, fixture or import is broken.

### Task 1: Keyboard Activation and Isolated Regression Runner

**Files:** Modify `src/components/ui/Dropdown.tsx`, `src/components/ui/__tests__/Dropdown.test.tsx`, `src/components/header/__tests__/AccountDeletionStatusItem.test.tsx`; create `vitest.review-fixes.config.ts`.

**Interfaces:** Preserve `Dropdown` and `DropdownMenuItem` props, especially `closeOnClick: boolean` and the default `true`. The new unit config uses existing React plugin/setup, `envDir: false`, one fork worker, alias `@` to `src`, `define: { __APP_VERSION__: JSON.stringify('2.0.0') }`, and the repository's existing test exclusions. Set synthetic loopback Supabase URL for both client/server variables, dummy anon/service keys, a dummy JWT secret of at least 32 characters, dummy Paddle key, and existing `VITE_KINDI_AI_ENABLED: 'true'`; never read `.env` or a hosted integration environment. No live browser or API calls are required.

- [x] **Write failing tests:** Render the actual Dropdown containing `AccountDeletionStatusItem`, seed a synthetic receipt, open with ArrowDown and activate with Enter. A deferred completion response must leave the menu and status mounted, clear the receipt only on completion, and invoke fetch exactly once. Parameterize pending/error/completion. Add normal `closeOnClick` command, Escape/outside-click, and a disabled active status item followed by a different command: a second Enter must not invoke either command.

```ts
expect(screen.getByRole('menu')).toBeVisible();
expect(screen.getByRole('status')).toHaveTextContent('is complete');
expect(sessionStorage.getItem('jozor-account-deletion-receipt')).toBeNull();
expect(fetchMock).toHaveBeenCalledOnce();
expect(neighborAction).not.toHaveBeenCalled();
```

- [x] **Verify red:** `node node_modules/vitest/vitest.mjs run --config vitest.review-fixes.config.ts src/components/ui/__tests__/Dropdown.test.tsx src/components/header/__tests__/AccountDeletionStatusItem.test.tsx`. Expected: the new keep-open test fails because Enter unmounts the menu.
- [x] **Implement:** In `Dropdown.handleKeyDown`, respect already-handled events and activate the actual eligible focused menu item exactly once. Remove parent-owned unconditional closure; the item applies its own close contract. Do not activate a new neighbor through a stale filtered index.
- [x] **Verify green:** Repeat the command. Expected: both suites pass, including normal closing and read-only deletion-status request assertions.
- [x] **Commit only listed files:** `fix: preserve dropdown item close policy on keyboard activation`.

### Task 2: Account-Scoped Web Push State and Endpoint Rotation

**Files:** Modify `src/hooks/sync/useWebPush.ts`, `src/components/modals/globalSettings/GlobalSettingsPushPreference.tsx`, `src/components/modals/__tests__/GlobalSettingsPreferencesTab.push.test.tsx`; create `tests/integration/local/pushSubscriptionOwnership.database.test.ts`.

**Interfaces:** Add `isEnabled: boolean` (confirmed preference/retry direction) and `canSendTest: boolean` (browser subscription and server registration are both confirmed) to the existing hook result. Preserve `status`, `isWorking`, `canActivate`, `registerAndSubscribe(): Promise<boolean>` and `unsubscribe(): Promise<boolean>`. Consume existing `listSubscriptions`, `registerSubscription` and `removeSubscription` signatures unchanged.

- [x] **Write failing UI tests:** A saved enabled subscription plus rejected server removal leaves the switch checked and error visible; the next click retries removal, not registration. Browser unsubscribe failure after server removal keeps disable retry but disables test send. Cover same-account reuse without a permission prompt; B enabling with A's endpoint unsubscribes A in the browser and saves a different B endpoint without deleting A's database row. Reject same-endpoint rotation and failed ownership lookup. Parameterize UID changes during permission, ownership lookup, rotation, subscribe, save and disable; include A/null/A and same-UID token refresh.

```ts
expect(toggle).toBeChecked();
expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
expect(doubles.removeSubscription).toHaveBeenCalledTimes(2);
expect(doubles.registerSubscription).not.toHaveBeenCalled();
```

- [x] **Write ownership SQL test:** Install `20260404000100_add_push_subscriptions.sql` with local `auth.users`, `auth.uid()`, roles and grants. Under real owner RLS, B's upsert of A's globally unique endpoint must fail, A's row stays unchanged, and B can insert a fresh endpoint. This baseline contract must pass before changing hook behavior; no RLS migration is needed.
- [x] **Verify red:** Run `node node_modules/vitest/vitest.mjs run --config vitest.review-fixes.config.ts src/components/modals/__tests__/GlobalSettingsPreferencesTab.push.test.tsx`; expected new disable/rotation assertions fail. Run the SQL baseline with `node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts tests/integration/local/pushSubscriptionOwnership.database.test.ts`; expected baseline PASS.
- [x] **Implement:** Scope confirmed preference and delivery readiness to UID plus a session/operation epoch, reset on account departure, preserve partial-disable retry, and invalidate inspection callbacks when mutations start. Before reusing an existing endpoint, confirm it is in the current owner's list; otherwise rotate it and validate the returned endpoint. Capture only the matching account's token for persistence. A stale operation cannot mutate another session or re-enable the earlier A session after A/null/A.
- [x] **Verify green:** Repeat both commands; existing activation, blocked permission, token refresh and test-send suites remain green.
- [x] **Commit only listed files:** `fix: keep web push state accurate across failures and account switches`.

### Task 3: Safe Local Auth Teardown Without Stopping Refresh

**Files:** Modify `src/services/supabaseAuthService.ts`, `src/services/__tests__/supabaseAuthService.test.ts`; create `src/services/__tests__/supabaseAuthLifecycle.test.ts`. Keep the retained adapter in `src/services/supabaseClient.ts` unchanged.

**Interfaces:** Preserve all exported service signatures. Add a module-private `waitForDeletionTeardown(): Promise<void>` barrier used before password login, signup and Supabase OAuth initiation. Preserve the **3000 ms** deletion UI timeout; bound waiting for the underlying teardown to **3000 ms** per login attempt, then reject with a retryable error rather than begin SDK sign-in. No new global listeners or refresh timers.

- [x] **Write failing service tests:** Replace the old expectation that `stopAutoRefresh` is called with `expect(stopAutoRefreshMock).not.toHaveBeenCalled()`. Assert successful deletion/new login retains the new stored token. A pending actual sign-out outlives deletion's UI timeout; SDK sign-in is not called until it settles, and an additional 3000 ms wait fails retryably. After it settles, retry succeeds. Parameterize password/signup/OAuth barrier use, teardown rejection, storage exceptions and malformed stored sessions. Final clearing removes only captured/deleted identity state; unrelated preferences and a newer identity remain intact.
- [x] **Write failing offline SDK test:** Inject a real installed AuthClient through the existing service's mocked adapter, not mocked refresh methods. Use fake timers, synthetic sessions and a mocked fetch transport that rejects any unexpected URL. Following deletion and next password login, advancing refresh time must produce a `grant_type=refresh_token` request for the new session. Dispatch hidden/visible visibility changes: no background refresh while hidden, refresh resumes while visible. An existing auth listener still receives the new sign-in/refresh events. Clean up test clients and timers.

```ts
expect(refreshRequests).toHaveLength(1);
expect(refreshRequests[0].body.refresh_token).toBe('new-session-refresh-token');
expect(events).toContain('SIGNED_IN');
expect(events).toContain('TOKEN_REFRESHED');
```

- [x] **Verify red:** `node node_modules/vitest/vitest.mjs run --config vitest.review-fixes.config.ts src/services/__tests__/supabaseAuthService.test.ts src/services/__tests__/supabaseAuthLifecycle.test.ts`; expected no-stop and real-refresh assertions fail.
- [x] **Implement:** Remove unconditional `stopAutoRefresh`; track the underlying teardown promise independently of the UI timeout. Clear captured identity/session keys locally before SDK logout so a revoked identity needs no successful remote round trip. Keep late cleanup identity/generation-scoped and use the bounded barrier before new session establishment. A failed storage read must not authorize wiping an unknown newer value. Do not call SDK-private lifecycle methods.
- [x] **Verify green:** Repeat the command and run `src/store/__tests__/accountDeletionLogout.test.ts` plus `src/hooks/auth/__tests__/useAuthInit.test.tsx` with the same isolated config. Expected all pass with no lingering timers/SDK clients.
- [x] **Commit only listed files:** `fix: preserve auth refresh and isolate deleted-account teardown`.

### Task 4: Avatar Retirement Database Contract

**Files:** Create `supabase/migrations/20261002000100_retire_replaced_user_avatars.sql`, `tests/integration/local/userAvatarCleanup.database.test.ts`; modify `vitest.database.config.ts` only to set `envDir: false` for local isolation. Existing SQL fixtures remain local and no hosted migration runner is used.

**Interfaces:** Define the following public RPCs with fixed search paths and explicit grants. Authenticated calls derive actor from `private.current_user_id_text()`, never from a caller-supplied owner; service calls identify queue ownership from stored rows.

| RPC                                                                                                                      | Return                                              | Authorization and behavior                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| `replace_user_avatar(p_photo_url text, p_photo_path text, p_expected_photo_path text, p_expected_photo_version integer)` | JSONB `{ photoPath: string, photoVersion: number }` | authenticated; profile row lock, CAS, server-derived version, atomic retirement   |
| `list_my_user_avatar_cleanup()`                                                                                          | rows `{ object_path: text }`, limit 20              | authenticated owner only; pending records                                         |
| `request_user_avatar_cleanup(p_object_path text)`                                                                        | boolean                                             | authenticated; reconcile uncertain own upload; refuse a current reference         |
| `claim_user_avatar_cleanup(p_object_path text)`                                                                          | boolean                                             | authenticated owner or service_role; queued safe path only, refuse references     |
| `complete_user_avatar_cleanup(p_object_path text)`                                                                       | boolean                                             | authenticated owner or service_role; claimed record and confirmed Storage absence |
| `list_user_avatar_cleanup_candidates()`                                                                                  | rows `{ object_path: text }`, limit 20              | service_role only; never inventory arbitrary bucket objects                       |

Queue columns: `object_path text PRIMARY KEY`, `user_id text NOT NULL`, `requested_at timestamptz NOT NULL DEFAULT now()`, nullable `claimed_at`, nullable `completed_at`; pending index ordered by requested time/path. No cascading profile foreign key and no direct anon/authenticated table grants.

- [x] **Write failing SQL tests:** Use PGlite role fixtures like `avatarStorage.database.test.ts`, adding profiles with photo fields and the existing legacy avatar RPC. Test successful CAS queues old path, advances version, leaves current object; a second replacement with stale expectations fails without modifying profile or queue. Test profile clearing/old RPC retirement, own/foreign/anonymous access, malformed path, mismatched URL/path, queue persistence after profile deletion, idempotent completion and Storage absence checks. Claim must refuse any current profile reference, not only the queue owner's current row; test another profile retaining a matching public URL. Assert OAuth/ordinary profile changes that do not reattach a retired key still work.
- [x] **Pin filename boundaries:** New keys are `users/<authenticated-id>/profile-<uuid>.webp`. Recognized legacy targets are only the actual previous owned `profile.webp`, `profile.png`, `profile.jpg`, or `profile.jpeg`; no arbitrary nested filename, external URL or whole-folder inventory. User IDs may be native UUIDs or the existing Google text IDs, not UUID-only. Compare path segments exactly, rejecting traversal, backslashes, control characters and encoded separators. Client validates configured-origin correspondence in Task 5; SQL validates the literal public avatar suffix/path and rejects URL query/fragment ambiguity.
- [x] **Verify red:** `node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts tests/integration/local/userAvatarCleanup.database.test.ts`; establish the old-schema replacement leak, then expect new contract assertions to fail because retirement does not exist.
- [x] **Implement migration:** Add the queue, RPCs and shared retirement guards. Serialize replacement/claim on the owner profile or equivalent owner lock when it is absent. Derive version from the locked database value, preserve null version/path CAS correctly, and refuse attaching tombstoned keys. Capture retirement through profile mutation so the legacy RPC cannot bypass it. Add restrictive Storage INSERT/UPDATE fencing for retired user-avatar keys; do not block the SELECT/DELETE needed for cleanup or unrelated buckets/tree avatars. Retired-key writes must share the same ownership serialization, not just perform a racy unlocked lookup. Never delete object metadata directly in SQL.
- [x] **Verify green:** Repeat the new SQL suite, then run `avatarStorage.database.test.ts` and `accountDeletionQueue.database.test.ts` with the database config. Include replace/claim/reattach serial interleavings and account-deletion overlap. Report that PGlite interleavings prove contract behavior but not simultaneous multi-connection lock scheduling.
- [x] **Commit only listed files:** `fix: durably retire superseded account avatars`.

### Task 5: Avatar Upload Cleanup and Gated Server Retry

**Files:** Modify `src/services/supabaseStorageService.ts`, `src/services/__tests__/supabaseStorageService.test.ts`, `src/api/person-media-cleanup-cron.ts`, `src/api/__tests__/personMediaCleanupCron.test.ts`; create `src/services/userAvatarCleanup.ts`, `src/services/__tests__/userAvatarCleanup.test.ts`.

**Interfaces:** Consume Task 4 RPCs. Preserve `uploadUserAvatar(userId: string, email: string, file: File, token?: string, currentVersion?: number): Promise<UserAvatarUploadResult>` and its `{ publicUrl, photoPath, photoVersion }` result. The database snapshot, not the caller's version hint, defines CAS/version. Cleanup helpers accept the existing SDK type and return only `{ checked: number, removed: number, retained: number, failed: number }`.

- `cleanupMyUserAvatars(client: SupabaseClient): Promise<UserAvatarCleanupCounts>` uses owner inventory.
- `sweepUserAvatarCleanup(admin: SupabaseClient): Promise<UserAvatarCleanupCounts>` uses service inventory.
- A private shared exact-object remover performs claim, `storage.from('avatars').remove([object_path])`, complete, in that order.

- [x] **Write failing tests:** Mock owner profile query before upload, immutable upload, replacement RPC and cleanup. Confirm old object removal only after replacement commit, Storage failure leaves pending work while upload returns success, and a later upload retries it. Unknown/failed replacement must call the retirement/reconciliation contract before any deletion; if its path is current, do not remove it. Lost commit response reconciles to success from the own profile; another winning upload does not falsely report this upload as current. Reject mismatched public origin/path against `supabaseUrl`, malformed RPC returns, failed profile snapshot, failed inventory/claim, and any arbitrary bucket/path. Assert result version comes from SQL.

```ts
expect(removeMock).toHaveBeenCalledWith([oldPath]);
expect(removeMock).not.toHaveBeenCalledWith([currentPath]);
expect(result.photoVersion).toBe(committedVersion);
expect(uploadMock.mock.calls[0][2].upsert).toBe(false);
```

- [x] **Write gated retry tests:** With no `USER_AVATAR_CLEANUP_ENABLED`, avatar sweep is never called and existing cron counts remain unchanged. Only when both flags equal `true`, secret matches, method/config are valid, invoke both helpers and sum their four count fields. Missing secret/config, wrong authorization, disabled flags and malformed flag values invoke no avatar sweep. Missing RPC/error does not cause a Storage delete or expose paths.
- [x] **Verify red:** `node node_modules/vitest/vitest.mjs run --config vitest.review-fixes.config.ts src/services/__tests__/supabaseStorageService.test.ts src/services/__tests__/userAvatarCleanup.test.ts src/api/__tests__/personMediaCleanupCron.test.ts`; expected retirement/removal assertions fail while old person-photo cases still run.
- [x] **Implement:** Query only the owner's needed profile fields before upload, validate compressed WebP and the configured public URL, call CAS RPC, use its version, and run owner cleanup best-effort without reverting a committed update. Reconcile ambiguous responses safely; a missing retirement migration never permits direct cleanup. Validate every inventory item before Storage use. Integrate server retry under both existing and additional flags, preserving response privacy and existing behavior when the new flag is absent. Do not alter `vercel.json`, create schedules, or set flags.
- [x] **Verify green:** Repeat the command and `src/services/__tests__/personMediaServerCleanup.test.ts` to prove tree cleanup remains unaffected; run Task 4 SQL suites again.
- [x] **Commit only listed files:** `fix: clean retired account avatars with durable safe retries`.

### Task 6: Service-Only Rejected Checkout Resolution

**Files:** Create `supabase/migrations/20261002000200_resolve_rejected_account_checkouts.sql`; modify `tests/integration/local/accountDeletionQueue.database.test.ts` to install that migration and test its contract.

**Interfaces:** Add nullable `resolution_reason text CHECK (resolution_reason IS NULL OR resolution_reason = 'rejected')` to `private.account_checkout_attempts`. Implement `public.resolve_rejected_account_checkout(p_user_id text, p_attempt_id uuid) RETURNS boolean`, granting only `service_role`. Preserve `record_account_checkout(uuid, text, boolean, text) RETURNS boolean` and its existing defaults, adding refusal for an already rejected attempt.

- [x] **Write failing SQL tests:** An owned, unresolved ID-less reservation can resolve; only it changes to `resolution_reason = 'rejected'` plus nonnull `resolved_at`. A second call is true and changes no timestamp. Wrong owner, missing profile/attempt, null inputs, correlated transaction or another resolved state returns false. Anonymous/authenticated invocation is denied. A late transaction correlation on rejected attempt returns false. A second unresolved attempt still blocks account deletion and billing repair; resolving a proven rejection removes only its own guard.

```ts
expect(rejectedAttempt.transaction_id).toBeNull();
expect(rejectedAttempt.resolution_reason).toBe('rejected');
expect(pendingAttempts).toHaveLength(1);
expect(lateRecordResult).toBe(false);
```

- [x] **Verify red:** `node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts tests/integration/local/accountDeletionQueue.database.test.ts`; new contract assertions fail on the prior schema without breaking fixture setup.
- [x] **Implement migration:** Lock profile first, then the owned attempt; use null-safe predicates and refuse already correlated attempts. Preserve history and set reason/time atomically; idempotent success requires this exact rejection reason and no transaction. Extend the existing record function without changing successful/canceled/subscription correlation. Use fixed search paths, explicit revoke/grant and transactional migration boundaries.
- [x] **Verify green:** Repeat the SQL command and `tests/integration/local/billingReconciliation.database.test.ts`, `tests/integration/local/subscriptionLedger.database.test.ts`, `tests/integration/local/accountDeletion.database.test.ts`. Expected role/guard/idempotency and existing billing/deletion cases pass.
- [x] **Commit only listed files:** `fix: resolve proven rejected checkout reservations safely`.

### Task 7: Bounded Paddle Rejection Classification and Handler Integration

**Files:** Create `shared/server/paddleCheckoutRejection.ts`, `shared/server/__tests__/paddleCheckoutRejection.test.ts`; modify `shared/server/api/billing/create-checkout-session.ts`, `src/api/__tests__/createCheckoutSession.test.ts`.

**Interfaces:** Export `isDefinitiveCheckoutRejection(response: Response, signal: AbortSignal): Promise<boolean>`. Consume Task 6 resolution RPC with the captured authenticated UID and attempt UUID. No new provider requests, retry policy, external dependencies or public response shape.

- [x] **Write failing classifier tests:** Both allowed codes return true only with status 400, object envelope, `error.type === 'request_error'`, no `data` property and complete bounded JSON. False for arrays, null/scalar error, unknown/wrong-type code, transaction-bearing response, malformed/truncated JSON, generic 4xx, 408/429, 5xx, redirects, body read failure, oversized or hanging streams and aborted signal. Count actual streamed bytes and cap at 32768; cancel on overflow/abort, ignoring falsely low Content-Length. Include a multibyte stream whose character count is under the limit but UTF-8 byte count is over it.
- [x] **Write failing handler tests:** Allowed rejection invokes `resolve_rejected_account_checkout` exactly once for its UID/attempt, never `record_account_checkout`/cancellation, and returns the existing generic 500. Unknown outcomes never resolve. RPC false/error leaves the failure generic; successful creation still records transaction before returning 200. Console and public response must not contain synthetic private provider details/keys. Include transport timeout and successful response missing ID.

```ts
expect(rpc).toHaveBeenCalledWith('resolve_rejected_account_checkout', {
  p_user_id: 'user-1',
  p_attempt_id: '11111111-1111-4111-8111-111111111111',
});
expect(res.body).toEqual({ error: 'Failed to initiate checkout session' });
expect(rpc.mock.calls.some(([name]) => name === 'record_account_checkout')).toBe(false);
```

- [x] **Verify red:** `node node_modules/vitest/vitest.mjs run --config vitest.review-fixes.config.ts shared/server/__tests__/paddleCheckoutRejection.test.ts src/api/__tests__/createCheckoutSession.test.ts`; intended classifier/resolution assertions fail.
- [x] **Implement:** Stream/read the error envelope under one captured `AbortSignal.timeout(10000)` shared with provider fetch. Classify only the pinned allowlist; no `documentation_url` authority, status-only shortcut or catch-all resolution. Invoke service-only rejection RPC only for true classification; require true result and hide provider body in all error paths. Preserve existing success/reservation, admission/origin/session/rate-limit gates.
- [x] **Verify green:** Repeat the command plus `shared/server/__tests__/accountCheckoutFence.test.ts` and `src/api/__tests__/accountSessionBoundary.test.ts`; run Task 6 SQL tests. Expected unknown-outcome safeguards remain intact.
- [x] **Commit only listed files:** `fix: release checkout fences only on definitive Paddle rejection`.

### Task 8: Whole-Branch Verification and Handoff

**Files:** Update this plan's completed checkboxes as tasks finish; no unrelated product changes. Generated cron files change only if a changed dependency requires regeneration.

**Interfaces:** All task interfaces above are complete. Production activation, historical cleanup/reconciliation, pushing, merging and deployment are outside this execution plan.

- [x] **Run broader local verification:** `node node_modules/vitest/vitest.mjs run --config vitest.review-fixes.config.ts --shard=1/2`, then `--shard=2/2`; `node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts`; `npm run typecheck`; `npm run typecheck:api`; `npm run lint`. All must exit 0; record test counts and any skipped/blocked checks. Never substitute earlier CI success for this new verification.
- [x] **Check generated artifact:** Run `node scripts/buildPushReminderCron.mjs`; inspect its diff and run existing `pushReminderCronRoot.test.ts` and `pushReminderCronNativeRuntime.test.ts` with isolated config. Keep generator output only when it accurately reflects changed dependencies, without unrelated manual edits.
- [x] **Review final diff:** Check against the six findings and spec; no ownership relaxation, broad Storage removal, unknown checkout resolution, obsolete public methods, secret/report staging, changed schedules or enabled workers. Obtain fresh independent review of the branch and address substantive findings through regression tests. Do not specify a different reviewer model unless authorized by the user.
- [x] **Verify repository preservation:** `git diff --check`, `git status --short --branch`, and an explicit staged-file list before every commit. Preserve the existing untracked reports and unrelated changes. Check that commits contain only intended source/test/migration/plan files and main remains unchanged.
- [x] **Report outcome:** State which six defects passed their regression tests, commit IDs, local verification results, and that forward migrations remain unapplied and server avatar retries remain off. Report PGlite/concurrency and public cache limitations separately. Keep PR 8 draft; do not imply production fixes or push/deploy without a later explicit request.

## Execution Handoff

Recommended method: **Native execution in this chat**, task by task, then one fresh independent whole-branch review. The shared avatar and billing contracts benefit from one implementer carrying their context, while task tests and the final reviewer provide the regression gates without a fresh implementer context for every small fix.

Alternative: **Subagent-driven execution**, with an implementer and reviewer gate for each task. Use this if the user prefers more independent per-task review despite the additional contexts/time.

Implementation starts after the user reviews this plan and selects an execution method. Neither document approval nor plan generation authorizes production activation.

## Final Review Record

The independent, read-only reviewer inspected `a38921e..e3942f4` with the configured default model, after the user explicitly approved exporting only necessary code to OpenAI. No secrets, `.env` files or operational reports were included. The report found no Critical issues, three Important issues, and no Minor issues. No second review was dispatched; the single final fix pass uses regression tests and fresh broad verification.

- Versioned avatar URLs: the settings handler no longer persists the UI-only cache suffix after the replacement RPC already committed. Legacy snapshots accept only an exact owned public URL plus a numeric `?v=` suffix; unchanged historical references permit ordinary profile updates. UI/service regressions failed first, then passed 47/47.
- Lock ordering: avatar and deletion paths use the same private advisory-lock gate before their profile lock. The deletion body is otherwise unchanged; its existing ACL/pause state is preserved. Two gate regressions failed first, then passed. PGlite runtime `pg_locks` observation verifies entry ordering, not simultaneous deadlock scheduling; a local multi-connection PostgreSQL server was unavailable.
- Queue progress: currently referenced rows are excluded before the twenty-target limit, and every successful claim advances retry order so failed removals cannot monopolize the oldest batch. Both regressions failed first, then passed.
- Additional local review regressions fixed in `e3942f4`: password/signup/OAuth admission microtask gap, external URL-only deletion authorization, and ordinary updates with an unchanged grandfathered reference. Each was observed failing before its fix.

Final fixes are committed in `e3942f4` and `226513c`. The combined deletion/avatar integration suite passes 72/72. The full final SQL suite passes 308/308 in 15 files; app/API typechecks and lint pass. Final full unit shards pass 1553 and 1524 tests, totaling 3077 passing tests in 393 files. One pre-existing real-tree visual test/file remains skipped (`src/domain/__tests__/familyGraphClusterLayout.visual.test.ts`); existing jsdom canvas warnings are not failures. The push-cron generator produced no further semantic diff, and fresh native/root runtime checks pass 3/3.

Regression commits for the original six defects: dropdown `2844801`, push `0446755`, auth `d3af61a`, avatar SQL/client `ba5870c` and `29e6a22`, checkout SQL/handler `7c98d9d` and `2082cb4`. Verification alignment is `9339845`. Main and origin/main remain `0137d52`; all 76 existing untracked operational reports are preserved. Forward migrations remain unapplied, server avatar retries remain off, and no production settings, payment keys or schedules were changed. These results establish local regression verification, not production activation or immediate public cache eviction.

### Rulings and Costs

| Decision | Reason | Cost or Remaining Risk |
| --- | --- | --- |
| Keep the approved current checkout/branch | The plan explicitly keeps implementation here | No separate worktree isolation; scoped local commits preserve the work |
| Add a shared avatar advisory lock alongside owner locks | Claims inspect references in other profiles | Avatar writes serialize; unrelated pre-held locks may require transaction retry |
| Fence retired Storage writes with triggers | The same atomic lock also covers service writes | Maintenance must use fresh keys rather than rewrite a retired key |
| Include the owner-row-lock follow-up in the consumer commit | Shared serialization does not replace owner locking | The migration follow-up spans the Task 5 commit boundary |
| Ignore `.vercel/output/**` in lint | Its generated local bundle has stale lint directives; source remains checked | Generated deployment output is not linted |
| Replace the unavailable native-agent report with an ephemeral read-only CLI reviewer | Conversation ownership attribution refused report retrieval; explicit export consent was obtained | Extra failed setup time; only the successfully returned CLI report counts |
| Never derive retirement authority from URL-only images | SQL cannot prove their configured origin | Valid legacy URL-only objects remain for separately approved reconciliation |
| Centralize lock entry and acquire it early in deletion | Removes the reviewed deletion/avatar inversion while preserving deletion checks and ACL | Deletion joins global avatar serialization; true multi-connection testing remains required |
| Leave cross-tab coordination and broader auth bootstrap unchanged | Outside the six approved adapter fixes; the reviewer declined to judge them | A different tab/bootstrap path may need a separate audit |
| Exclude historical reconciliation and undiscovered upload orphans | Cleanup authority is limited to recorded retirement targets | Historical/unrecorded uploads can remain until separately approved reconciliation |
| Make no claims about production activation, provider behavior or immediate CDN eviction | No remote migrations, workers or live provider checks were authorized | Staged PostgreSQL/provider checks are still required; cached public bytes can outlive origin removal |
| Accept broad-suite results only after reading their completed exit/count summaries | The reviewer did not run or judge those suites | Closure waits for final-tree verification; partial/old results do not count |

Deferred minors: none.
