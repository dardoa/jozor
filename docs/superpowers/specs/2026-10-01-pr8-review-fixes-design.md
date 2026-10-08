# PR 8 Review Fixes Design

## Purpose and Scope

Correct the six P2 findings on the existing draft source-backup branch. Success
means reproducible regression tests pass, account boundaries remain enforced,
and failed operations cannot be mistaken for confirmed success.

The user approved the conversational design. This document is the written
design for review before the implementation plan and implementation.

Work stays on `codex/source-backup-2026-10-01`. Do not merge, deploy, run hosted
migrations, change payment credentials or production flags, manually invoke
cron routes, or enable the account-deletion worker. Preserve the existing
untracked operational reports without staging them.

## Existing Behavior

| Finding                     | Existing implementation                                                                          | Required correction                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Failed push disable         | `useWebPush` sets status to `error`; the switch treats anything except `enabled` as off          | Separate the confirmed preference from operation feedback and retry direction                          |
| Push account transition     | The browser endpoint is reused, but the database globally deduplicates endpoints under owner RLS | Rotate an endpoint not confirmed as belonging to the current account                                   |
| Auth refresh after deletion | The retained AuthClient has its automatic refresh and visibility callback stopped                | Preserve automatic refresh for subsequent sessions and prevent late teardown from clearing a new login |
| Replaced account avatars    | Immutable uploads accumulate because profile replacement does not retire the previous object     | Durably retire only superseded, owned objects and delete through Storage APIs                          |
| Rejected checkout           | An ID-less reservation remains unresolved after every provider error                             | Resolve only a provably rejected creation attempt with no correlated transaction                       |
| Keyboard status action      | Dropdown calls `.click()` and then closes unconditionally                                        | Let the activated item apply its own `closeOnClick` contract                                           |

## Approach

Extend the existing flows with focused frontend changes and additive database
contracts. Keep immutable object names, global endpoint uniqueness, existing
RLS, and the fail-closed checkout guard. Reuse the existing claim/remove/complete
cleanup pattern without putting user avatars into the tree-specific queue.

Pure client-only avatar deletion would lose its retry target after a browser
crash. Resolving every failed checkout would discard reservations whose external
outcome is unknown. Neither is acceptable for these fixes.

## Web Push Preference and Account Transition

`useWebPush` will expose account-scoped confirmed preference state independently
of its existing operation/status feedback. The switch and next action will use
that preference, not `status === 'enabled'`. An unsuccessful disable retains a
disable retry even while an error is displayed. A partially completed disable
must not enable the test-send action if the server registration is known to have
been removed.

Inspecting a different UID immediately resets the previous account's state.
All asynchronous state writes and persistence operations must still belong to
the captured UID and operation generation. Token refresh within the same UID
must not create a competing mutation. A stale account operation cannot update
the next account's UI or use the next account's token.

During explicit enable, inspect the browser subscription and list only the
current account's saved subscriptions. Reuse an endpoint only when that list
confirms current ownership. Otherwise unsubscribe it in the browser, confirm
success, obtain a fresh subscription, and persist it for the current account.
If the browser returns the same unowned endpoint or rotation fails, report an
error without overwriting ownership. A failed ownership lookup must not trigger
destructive rotation based on guessed ownership.

Do not delete another account's database row. A stale server endpoint can use
the existing provider 404/410 pruning path. Do not automatically request browser
permission; permission prompts remain tied to an explicit user click.

Regression tests must cover server removal rejection followed by disable retry,
browser unsubscribe rejection after server removal, A-to-B endpoint rotation,
same-account reuse, failed ownership lookup, and account changes during each
awaited step. Include a database/RLS test of globally unique endpoints so mocks
cannot hide the original ownership conflict.

## Auth Lifecycle After Account Deletion

Keep the existing retained AuthClient and its SDK-managed automatic refresh and
browser visibility lifecycle. Remove deletion teardown's unconditional
`stopAutoRefresh()` rather than compensating with `startAutoRefresh()` on every
login: both public methods remove SDK-managed visibility callbacks.

Local teardown must clear the deleted account's persisted session and token
without requiring a successful logout request to a revoked identity. Serialize
same-tab session-establishing service operations behind the actual local SDK
teardown, not just the current three-second UI timeout. If teardown remains
pending, a bounded login attempt must fail retryably rather than establish a
session that the old teardown can subsequently wipe. Final local clearing must
be scoped to the deleted identity/generation, not unconditional delayed clearing
of whatever account is now present.

Keep auth-state listeners intact. Do not access SDK-private refresh methods,
replace the shared AuthClient without rebinding listeners, or introduce an
unbounded wait in the user-facing deletion operation. Password login, signup
with a session, and OAuth initiation must obey the same local teardown barrier.

Tests must exercise deletion followed by a new login, delayed teardown, storage
failures, failed login, and retained auth-state listeners. Add an offline test
using the installed AuthClient with mocked auth transport to verify refresh
actually occurs for the next session and still respects tab visibility. No
real user credentials or hosted auth requests are needed.

## Durable Account Avatar Retirement

Use an additive forward migration and a separate
`private.user_avatar_cleanup` table. Its key is the exact avatar object path;
its record includes owner ID and requested/claimed/completed timestamps. Records
must survive profile deletion, so the queue has no cascading profile foreign key.
Do not alter the tree-specific `person_media_cleanup` ownership model.

Keep fresh `users/<uid>/profile-<uuid>.webp` names and `upsert: false`. Introduce
an authenticated replacement RPC that derives UID from the authenticated
identity, locks that profile, compares the expected previous path/version, and
sets the new path/URL with a server-derived next version. In the same transaction,
enqueue the superseded owned path. Concurrent replacement must either commit
against the expected profile or return a conflict; it must not retire the winning
current image.

Capture the expected profile before uploading. Preserve the existing upload
result shape. Keep the old `update_user_avatar` signature for compatibility;
apply shared validation and retirement fencing to legacy profile updates too,
so older callers cannot bypass retirement or reattach retired objects.

Validate exact user-folder ownership, safe path components, allowed profile
image names, and the application's own avatar public-URL/path correspondence.
Do not derive deletion targets from arbitrary remote URLs. Retire recognized
legacy profile filenames only when the actual previous profile references them;
do not sweep an entire public bucket or user folder. External/OAuth images are
not Storage cleanup targets.

The owner-scoped claim RPC locks the current profile when present and refuses
any object still used by a profile or any path outside the authenticated owner.
Retirement tombstones prevent reattachment and new authenticated Storage writes
to that exact retired key. Completion succeeds only after Storage metadata
confirms absence. All functions have explicit grants, fixed search paths, and
no anonymous access. Service-role inventory/claim access is separate from
authenticated owner access.

After a confirmed replacement, the client tries a bounded batch of the owner's
queued objects using claim, Storage `remove`, then completion. Cleanup failure
does not undo or misreport a successful profile update: retain the durable retry
record and emit sanitized error reporting. Subsequent successful avatar changes
retry pending owner cleanup.

On a failed or ambiguous replacement response, never delete the newly uploaded
object directly. An owner-scoped retirement request must first reconcile the
profile under the same lock: a current image cannot be queued or removed. A
retired failed-upload key is fenced against late reuse. A lost commit response
can be reconciled by reading the committed own profile.

Add a bounded server retry helper using the same queue, separate from account
deletion. It may be integrated into the existing media cleanup route only behind
an additional `USER_AVATAR_CLEANUP_ENABLED === 'true'` check and the existing cron
authentication/configuration checks. Do not set this flag, enable another worker,
or call the route. Missing migration support must fail safely without issuing
unscoped Storage deletion. Immediate owner cleanup is the primary replacement
path; unattended retries require a separately approved rollout.

Tests must cover concurrent replacement/CAS conflict, current-image retention,
cross-account access rejection, malformed paths, remote URLs, legacy filenames,
Storage removal failure/retry, repeated completion, ambiguous RPC responses,
late reattachment/Storage upload, and account deletion overlap. Use local
PostgreSQL/PGlite for SQL contracts and mocks for Storage API operations.

Deleting the origin object does not guarantee instant revocation of previously
cached public image bytes. Report origin removal separately from CDN cache
expiry; do not promise immediate global disappearance of old public URLs.

## Definitively Rejected Checkout Creation

Add a service-role-only RPC
`resolve_rejected_account_checkout(p_user_id text, p_attempt_id uuid)` in a
forward migration. Follow the existing profile-lock-then-attempt-lock order.
Validate that the attempt belongs to this user, has no transaction ID, and is
eligible for rejected-creation resolution. Resolve only that attempt. Repeated
resolution of the same ID-less rejected attempt is idempotent. Missing attempts,
different owners, and attempts correlated to a transaction return false.

Do not fabricate a transaction ID, reuse cancellation semantics, delete attempt
history, or bulk-resolve old attempts. Existing unresolved ID-less attempts need
independent evidence; this change cannot infer their historical outcomes.

Record rejected resolution explicitly in a nullable, constrained
`resolution_reason` column on the existing attempts table. Set it to `rejected`
with `resolved_at` in the same transaction. Idempotent success requires that
specific reason and no transaction ID; a differently resolved attempt is not a
rejection-resolution success. Transaction correlation must refuse an attempt
already resolved as rejected rather than silently converting it into an active
checkout with a cleared fence.

After the authenticated checkout handler receives a provider response, parse a
structured error body capped at 32 KiB within the request's existing timeout.
Start with the narrow documented HTTP 400 /
`request_error` allowlist `transaction_price_not_found` and `invalid_field`,
requiring an error-only envelope with no transaction data. Only these matched
responses authorize the rejection-resolution RPC. Unknown codes, generic 4xx,
408/429, 5xx, redirects, network errors, timeout/abort, malformed JSON, and a
successful response missing its transaction ID remain unresolved.

If resolution fails or its response is uncertain, retain the reservation and
report the checkout failure; never claim the fence was removed. Keep the
existing generic public error response and do not log full provider bodies,
API keys, user data, or auth tokens. A successful transaction continues through
`record_account_checkout` unchanged.

Paddle documents the selected price-not-found response as HTTP 400 and gives
`invalid_field` as a request-validation response. The narrow resolution
allowlist is this application's conservative policy, not a claim that all
provider failures imply no transaction exists:

- https://developer.paddle.com/errors/transactions/transaction_price_not_found/
- https://developer.paddle.com/api-reference/about/errors/

Unit tests must cover both allowed rejection codes and every uncertain response
class above, including database resolution failure. SQL tests must verify role
grants, owner mismatch, correlated transaction refusal, idempotency, and deletion
and billing-repair guards remaining active for unresolved attempts. No real
Paddle transaction requests or production maintenance commands are permitted.

## Keyboard Activation

Remove the Dropdown parent's unconditional close after keyboard-triggered
`.click()`. The item already owns `closeOnClick`, so normal commands still close
and `AccountDeletionStatusItem` stays mounted while its asynchronous status
request completes. Preserve Escape/outside-click behavior, focus navigation,
and disabled-item exclusion. Verify Enter activates exactly once.

Use the actual Dropdown and status item together in a regression test. Confirm
the completion result remains visible even when its stored receipt is cleared;
also test normal closing commands, pending/error results, and disabled items.

## Verification and Release Boundary

Write regression tests before the corresponding production-code changes and
confirm they fail for the intended reason. Then run targeted unit tests, local
SQL tests, frontend/API type checks, and lint. Run broader account, billing,
media, and dropdown regressions because their ownership/locking contracts are
shared. Regenerate tracked server bundles only if affected source requires it.

Review the final diff for unintended RLS relaxation, uncertain checkout
resolution, unsafe object deletion, secret disclosure, unrelated edits, and
missing tests. The new migrations remain unapplied. Keep PR 8 draft and report
local verification separately from deployment or production success.

Before a later rollout, validate forward migrations on an isolated database,
apply them through a separately approved release, then deploy compatible code.
Any server avatar retry enablement requires its own approval. Do not resolve
historical checkout reservations or remove historical avatars without recorded
ownership/outcome evidence.
