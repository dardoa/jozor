# Kindi release boundary - 2026-05-20

This document freezes the practical scope of the current Kindi improvement batch.
It is meant to keep the release reviewable and to prevent the next work cycle from
quietly expanding into unbounded assistant behavior.

## Release goal

Ship a safer, faster, and more useful Kindi assistant without changing the product
contract into a broad autonomous agent.

The release is focused on:

- command safety and confirmation behavior
- local support answers for known app usage topics
- clearer disambiguation for people with similar names
- atomic add-with-profile execution
- conservative Arabic dialect support
- search and bundle performance improvements
- controller maintainability
- reporting-only cloud learning events and an app-owner Admin dashboard

## Included changes

### Kindi command safety

- Plain `Enter` no longer confirms pending write operations.
- `Ctrl+Enter` / `Cmd+Enter` can confirm non-delete operations only.
- Delete confirmations must be clicked explicitly.
- `Escape` cancels pending confirmations and disambiguation before closing Kindi.
- Backdrop click is blocked while a confirmation or disambiguation decision is pending.

Boundary: this release does not add bulk execution or chained command execution.

### Atomic add execution

- Add-relative commands can carry `initialUpdates` for fields parsed from the same user command.
- The new person is merged and validated before sync, avoiding a separate post-add update step.

Boundary: this is limited to profile fields already parsed locally, such as birth place,
birth date, and profession.

### Local help system

- Kindi now checks a small local guide before falling back to generic support text.
- The guide is intentionally narrow and covers stable app usage areas only.

Boundary: this is not a full documentation center. Content expansion should happen only
after the main app guide is improved.

### Disambiguation context

- Disambiguation cards can show nearby relationship context, such as parent/child/spouse labels.
- `KindiSearchTrigger` passes the current people map into the overlay for this display.

Boundary: context is informational only. It does not change matching or ranking by itself.

### Conservative dialect support

- Added limited relation terms such as `ولده`, `ولدي`, `بنته`, `بنتها`, `أبوه`, and `أمه`.
- Update parsing now recognizes common inline forms such as `ساكن في` and `يشتغل`.
- Subject extraction was tightened so inline dialect updates keep the target name clean.

Boundary: no broad dialect preprocessor was added. Names are not rewritten.

### Search performance

- Target resolution now uses a cached per-array index with exact, single-word, and leading-word maps.
- Kindi search thinking delay was reduced from `1000ms` to `250ms`.

Boundary: no Web Worker is included in this release. Current guardrails do not justify the extra
complexity yet.

### Controller maintainability

- `useKindiController` was split internally into smaller response helpers for AI planning,
pending add-name flow, conversation flow, query intent, command intent, and support intent.

Boundary: this is a behavior-preserving refactor plus the explicitly listed behavior changes.
No new public Kindi API is introduced.

### Cloud learning and Admin reports

- Added `kindi_learning_events` as a redacted, reporting-only event stream.
- Added `admin_users` as the application-level Admin allowlist.
- Added read-only report views for failures, AI fallback, ambiguous names, repeated redacted patterns, overview metrics, and AI-to-local improvement opportunities.
- Added a protected `/admin/kindi-learning` dashboard.
- Added an Admin-only menu entry in the account menu and mobile account sheet.
- Added `interaction_id`, parser stage/name, intent guess, failure taxonomy, and database constraints for stable reports.
- Added a disclosure in global Security settings explaining Kindi's redacted learning diagnostics.
- Added Arabic/English localization, clearer empty states, and a translated return path for the Admin dashboard.
- Added a 90-day Supabase retention job for Kindi learning events.

Boundary: this release does not add automatic rule injection, automatic parser updates,
model self-training, raw query storage, Admin write controls, or tree-owner access to global
learning reports.

### Build and type cleanup

- Removed unnecessary dynamic imports that duplicated static imports in several feature modules.
- Added feature-based Vite manual chunks for large feature folders.
- Fixed the media utility typing path used by `MediaTab`.

Boundary: outside the Kindi Admin reports route and Kindi learning schema, this release does not
change application routing, persistence contracts, auth model, or unrelated Supabase tables.

## Deferred items

These are intentionally excluded:

- chained intents such as `احذف خالد وأضف ابن لسامي`
- Web Worker migration for Kindi matching
- active learning cache or feedback buttons
- automatic learning injection or AI-proposed parser rules
- broad dialect normalization before parsing
- persona/tone rewrite beyond existing local support behavior
- a full application help center
- CSV export or triage workflow for Admin reports

## Main risks

- `KindiOverlay.tsx` includes both behavior changes and UI polish, so visual QA matters.
- Arabic regex additions remain rule-based and should stay covered by tests before expanding.
- Feature chunking can alter lazy-load timing, so first-open smoke testing is recommended.
- `initialUpdates` changes add command semantics; tree persistence should be smoke-tested manually.
- Kindi learning reports depend on Supabase RLS and `security_invoker` views; Admin access must
  remain application-level through `admin_users`, not tree ownership.
- The dashboard currently reads a bounded filtered event set in the client. If event volume grows,
  move report computation to parameterized RPC or filtered database views.

## Verification completed

Latest local checks:

- `npm run test -- Kindi`: passed, 107 tests
- `npm run test`: passed, 115 files and 460 tests
- `npm run typecheck`: passed
- `npm run build`: passed
- `npm run lint`: passed with 0 errors and 392 existing warnings
- `npm run test -- AccountMenu MobileAccountSheet`: passed, 5 tests

Supabase verification completed:

- Migrations `20260520000100`, `20260520000200`, and `20260520000300` were applied to the linked remote.
- Migration `20260520174520` was applied to the linked remote for 90-day retention cleanup.
- Local and remote migration history match for the Kindi learning migrations.
- RLS is enabled on `admin_users` and `kindi_learning_events`.
- Kindi report views are present and configured with `security_invoker=true`.
- Non-admin authenticated read simulation returned zero visible Kindi learning events.
- Constraint checks rejected unknown `failure_reason` values and raw `redacted_query` values.
- A valid redacted event was accepted inside a transaction and rolled back.
- `mdardoa@gmail.com` was granted active app Admin access through `admin_users`.
- Retention function `public.prune_kindi_learning_events(90)` exists and cron job
  `kindi-learning-retention-daily` is active at `02:17 UTC`.

Recommended before merging or release:

- `npm run test:e2e:smoke`
- Manual Kindi smoke:
  - search for an existing person
  - add a child with birth place/date in the same command
  - update residence with `ساكن في`
  - cancel a delete confirmation with `Escape`
  - disambiguate two people with similar names

## Release decision

This batch is coherent as a single Kindi hardening release if reviewed under the title:

`Kindi command safety, local help, parsing robustness, performance hardening, and safe learning reports`

Do not add chained intents, automatic learning injection, or broad dialect preprocessing to this
batch. Those should start a new release boundary after this one is reviewed.
