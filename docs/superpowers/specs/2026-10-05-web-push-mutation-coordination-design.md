# Web Push Mutation Coordination Design

## Purpose and Scope

Finish the client-side Web Push lifecycle work by making an explicitly requested
disable operation independent of the Preferences view's lifetime. Closing settings
or changing settings tabs must not lose the operation's result, permit a competing
activation, or turn a failed disable into an enable action.

The selected approach is a small, in-memory coordinator shared by `useWebPush`
instances in one browser document. This is a focused follow-on to
`2026-10-01-pr8-review-fixes-design.md`, not a replacement for that broader design.
The user has approved writing this design. Product implementation still requires
review of this spec and a subsequent implementation plan.

## Observed Failure

`GlobalSettingsModal` conditionally mounts the Preferences tab, and
`StateModalRenderer` unmounts the whole modal when it closes. Today each
`useWebPush` instance owns its mutation lock, account epoch, inspection generation,
and disable state.

If the view unmounts while server removal is pending, the old hook's mounted guard
prevents subsequent browser unsubscribe and result publication. A remounted hook
can inspect the still-present row before removal completes and display an enabled,
test-ready state. Completion of the old request does not invalidate that new view.
The same lifecycle gap can hide an unsuccessful or partially completed disable.

## Approach and Alternatives

A module-sized coordinator is preferred because its lifetime spans both tab
changes and modal closure without changing the application's component ownership.
Keeping Preferences mounted would address tab changes only. Moving the complete
push hook into an application-wide provider would address the lifetime issue but
would broaden ownership and dependencies unnecessarily for this fix.

The coordinator owns mutual exclusion, operation identity, account invalidation,
and observable operation outcomes. The hook remains the public UI adapter and
performs browser/service calls through the existing interfaces. No new provider,
persisted store slice, server API, database migration, or background worker is
introduced.

## Coordination Contract

- There is one physical mutation lock for this document's browser subscription,
  shared by enable and disable operations, not a separate lock for each account.
- Each claimed attempt has a unique identity, owner UID, local account generation,
  operation kind, stage, and outcome. Snapshots include confirmed preference,
  readiness, pending state, and explicit disable-retry direction when applicable.
- Subscribers receive a revision when an attempt starts, advances, settles, or is
  invalidated. Passive inspections capture this revision and cannot publish a
  result after it changes.
- Only the owning attempt can advance or release its lock. A late completion or
  `finally` block must not clear a newer attempt or replace newer state.
- Shared snapshots contain no bearer tokens, push keys, subscription objects, or
  raw endpoint values. An active operation may retain its existing browser handle
  and endpoint locally only as needed to finish; they are not persisted or logged.
- Settled state remains available to remounted observers of the same account and
  generation. It is not copied into another account's preference state.

The coordinator may expose claim, validity, stage publication, snapshot,
subscription, and release primitives. These remain internal; the public return
shape of `useWebPush` stays unchanged.

## Account and Credential Boundaries

Observe UID and logout transitions synchronously through the existing app store
while an operation or retained account outcome exists, even if there are no
mounted Preferences views.
Every UID change, including logout, increments a document-local generation.
Consequently A -> logout -> A invalidates the original attempt even if React
renders only the final A state. A token refresh for the same UID does not create
a new generation or start a competing mutation.

Before each new browser or authenticated service step, validate both owner UID
and generation. Resolve credentials for that owner at the call boundary; a later
step may use its refreshed token, but must not fall back to the next account's
stored/session token. Revalidate ownership after asynchronous credential
resolution. Do not retain a second token cache in the coordinator or redesign
authentication/session issuance.

Account invalidation prevents all later browser mutation, authenticated request,
and preference publication by the old attempt. It cannot retract a remote request
or browser mutation already dispatched. The physical lock remains occupied until
that asynchronous attempt actually settles; a new account cannot race it with a
new browser mutation. The new account may inspect its own state, but cannot become
test-ready or mutation-ready until the lock is released and a fresh inspection
reconciles the resulting browser state. Old errors are not shown as its errors.

## Disable Lifecycle and Failure States

An explicit disable continues through same-account view unmounts. A remounted view
observes the pending attempt rather than beginning a competing inspection,
activation, disable, or test send. No permission prompt is part of disable.

| Outcome | Observable state for the owning account |
| --- | --- |
| Disable pending | Preserve confirmed preference; show working; block activation and test send. |
| Server removal rejected | Preserve confirmed preference and an explicit disable retry; report error; block test send. |
| Server removal confirmed, browser unsubscribe rejected or returned false | Keep disable retry and error; readiness remains false; do not re-register automatically. |
| Browser subscription absent, or server removal and browser unsubscribe completed | Publish off, idle, not test-ready; clear retry direction. |
| Account generation invalidated | Stop subsequent steps; release only on settlement; do not publish an old outcome to the new generation. |

A new same-account observer receives a successful off result even if an earlier
lookup found the row before deletion. Passive inspection cannot clear an explicit
disable retry or reinterpret it as activation. Permission status may change the
visible availability, but does not erase the pending action or retry direction.

Retry is an explicit user action. It reads the actual current browser subscription
and uses owner-scoped service access; already removed rows are an idempotent
success. If the endpoint has changed, reconcile that subscription before acting,
without deleting a guessed endpoint or transferring a foreign-owned endpoint.
Uncertain ownership must fail closed rather than claim another account's row.
The existing globally unique endpoint and RLS constraints remain unchanged.

## Activation, Permission, and Inspection

Enable attempts also claim the shared physical lock, but keep the existing rule
that later activation steps stop after their originating view unmounts. This fix
does not introduce background activation. The shared lock survives until an
already-started enable attempt settles, preventing a remounted view from racing it.
Remaining observers then perform fresh, read-only reconciliation.

Preserve the existing live permission checks and denial/regrant invalidation for
activation. Permission changes during a pending operation invalidate stale
inspection and defer reconciliation until settlement; they must not revive a
cancelled activation or bypass disable-retry state. Observer events, mounts,
focus, and visibility changes never prompt, subscribe, remove a server row, or
unsubscribe automatically. Disable cleanup does not require permission to remain
granted.

Shared state must gate `isWorking`, activation eligibility, and test readiness
across all observers. A stable failed-disable state is not working, so its explicit
retry remains available, but its test action stays disabled. Inspecting current
permission and server state alone cannot override a newer coordinated result.

## Lifetime and Limits

Use memory only. Preserve necessary current-generation result/retry state for
remounts, while discarding superseded records and obsolete account outcomes.
Keep the store listener while a pending attempt, UI observer, or retained account
outcome needs account continuity. A same-account close/reopen therefore preserves
retry state, but a logout invalidates it even with no view mounted. Retain at most
one current-generation settled outcome in addition to an active attempt. Detach
the listener once no such state or observer remains. On reattachment, initialize
from the current account; never infer continuity across an unobserved gap.

This is not a cross-tab mutex and does not survive a full page reload, browser
crash, or application restart. After reload, existing passive inspection reconciles
the actual subscription/server state without automatically repairing it. No retry
worker, durable queue, or new production telemetry is included.

## Intended File Boundaries

- Add `src/services/webPushMutationCoordinator.ts` for shared coordination.
- Adapt `src/hooks/sync/useWebPush.ts` without changing its public API.
- Extend `src/components/modals/__tests__/GlobalSettingsPreferencesTab.push.test.tsx`.
- Add `src/services/__tests__/webPushMutationCoordinator.test.ts` for focused
  coordination and store-transition cases.

Keep modal composition, the auth/store schema, service interfaces, and database
ownership policies unchanged. Tests may use fresh coordinator instances or module
isolation; do not add a production-facing test reset API.

## Acceptance and Verification

First reproduce the failure with deferred browser/service responses before changing
product code. Exercise the real coordinator and hook logic, mocking only browser,
network, and account-store boundaries. Acceptance requires:

- Unmount during server removal, then remount before and after settlement; success
  publishes off and failures preserve disable retry, including partial cleanup.
- Full settings close/reopen as well as Preferences tab switches, with no duplicate
  mutation or eligible test send while an attempt is pending.
- Late passive lookup cannot resurrect enabled/test-ready state after deletion.
- Same-UID token refresh does not compete and later steps use that owner's current
  credentials; A -> B and A -> logout -> A invalidate old follow-ups even with no
  view mounted.
- An invalidated attempt cannot release a newer lock or publish into another
  generation; releasing the old lock triggers safe fresh inspection.
- Permission revoke/regrant during pending work preserves fail-closed activation,
  explicit disable retry, and the absence of automatic prompts or registration.
- No listener leaks, unmounted React writes, cross-test coordinator contamination,
  or secret-bearing shared snapshots/logs.

After implementation, run focused tests, application/API type checks, full lint,
and the full unit suite, followed by independent code review. The last completed
unit baseline was 3115 passing tests and one skip; this spec adds no tests or fix.
Hosted requests, real credentials, and live notification delivery are not part of
this verification. Production deployment, PR merge, hosted migrations, and the
remaining populated-database upgrade validation require separate release work.
