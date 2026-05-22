# Supabase SECURITY DEFINER Redesign Inventory - 2026-05-22

## Scope

This document starts the separate redesign track for the remaining Supabase
advisor warning:

- `authenticated_security_definer_function_executable`: 18

The previous cleanup intentionally kept authenticated access because the app
still calls several RPCs directly. This pass is an inventory and sequencing
document only. It is not a migration plan to revoke access immediately.

## Current Boundary

Already completed:

- `anon` execution was revoked.
- inherited `PUBLIC` execution was revoked.
- `authenticated` execution was kept explicit.
- mutable `search_path` issues were pinned for advisor-reported functions.

Still remaining:

- SECURITY DEFINER functions are still exposed in `public`.
- authenticated users can execute these RPCs where granted.
- some functions are app-facing operations; others are helper or maintenance
  primitives that should be narrowed before any migration.

## Function Inventory

| Function | Category | Current app caller | Practical risk | Redesign direction |
| --- | --- | --- | --- | --- |
| `accept_tree_invitation(text)` | Invitation flow | `treeInvitationService` | Token acceptance flow can bypass RLS by design; must enforce email/token/status internally. | Keep public wrapper, move implementation private after regression tests. |
| `accept_tree_invitation_by_id(uuid)` | Invitation flow | `treeInvitationService`, notification actions | ID-based acceptance relies on caller email/status checks. | Keep wrapper narrow; verify direct abuse cases before redesign. |
| `revoke_tree_invitation(uuid)` | Invitation flow | `treeInvitationService` | Owner-only mutation; wrong check could revoke another tree's invite. | Move implementation private; wrapper should only accept invitation id and derive caller. |
| `decline_tree_invitation(uuid)` | Invitation flow | `treeInvitationService`, notification actions | Invited-user mutation; wrong check could alter another user's invite. | Keep wrapper; add focused decline/accept permission tests before migration. |
| `create_tree_invitation(uuid,text,text,integer)` | Invitation flow | `treeInvitationService` | Creates share tokens; owner and role validation are critical. | Keep wrapper; private implementation with strict input normalization. |
| `create_tree_with_root(text,text,jsonb)` | Tree mutation | `supabaseTreeMutationService` | Creates tree and root person in one privileged transaction. | Keep public RPC until local create flow is fully tested. Consider private implementation plus wrapper. |
| `create_person_and_relationship(uuid,text,jsonb,text,text)` | Tree mutation | no direct `src` caller found in current search | Can insert people/relationships with elevated rights. | Candidate for removal if truly unused, otherwise wrapper plus permission test. |
| `delete_person_and_relations(uuid,text,text)` | Tree mutation | no direct `src` caller found in current search | Deletes person and relationships with elevated rights. | Candidate for removal if unused; otherwise wrap and test editor/owner boundaries. |
| `replace_tree_content(uuid,jsonb,jsonb)` | Sync / import | `src/api/proxy.ts` | Bulk replaces tree content; highest blast radius if caller checks fail. | Highest-priority redesign: private implementation, narrow server-side caller path, regression tests. |
| `sync_tree_batch(jsonb)` | Sync | no direct `src` caller found in current search | Batch insert into operations; can affect sync log integrity. | Verify whether still used by older clients before removal or wrapper redesign. |
| `prune_tree_operations(uuid,integer)` | Maintenance | `operationalMaintenanceService` | Deletes operation history; user-facing access may be too broad. | Prefer server/admin-only path or private maintenance function. |
| `prune_activity_logs(uuid,integer)` | Maintenance | `operationalMaintenanceService` | Deletes audit/activity history; should not be broad authenticated surface. | Prefer server/admin-only path or scheduled maintenance path. |
| `claim_collaborator_memberships()` | Access repair | `supabaseTreeAccessService` | Claims memberships from email/account context. | Keep until invite/collaboration tests prove a narrower path. |
| `can_edit_tree(uuid)` | Access helper | no direct `src` caller found | Helper used by policies/RPCs; exposing as RPC is likely unnecessary. | Candidate for revoke from authenticated if policies still work. |
| `is_tree_owner(uuid)` | Access helper | no direct `src` caller found | Helper used by policies/RPCs; exposing as RPC is likely unnecessary. | Candidate for revoke from authenticated if policies still work. |
| `is_tree_collaborator(uuid,text)` | Access helper | no direct `src` caller found | Helper used by policies/RPCs; exposing as RPC is likely unnecessary. | Candidate for revoke from authenticated if policies still work. |
| `current_user_id_text()` | Auth helper | no direct `src` caller found | Exposes derived auth uid; low data sensitivity but broad RPC is unnecessary. | Candidate for revoke from authenticated after RLS verification. |
| `current_user_email_text()` | Auth helper | no direct `src` caller found | Exposes derived email; low value but unnecessary direct RPC surface. | Candidate for revoke from authenticated after RLS verification. |

## Helper Dependency Findings

The helper-only functions are not safe to revoke blindly. They are not called
directly from `src`, but they are embedded in RLS policies and privileged RPCs.

Examples:

- `current_user_id_text()` is used by owner policies on `trees`, `people`,
  `relationships`, `tree_operations`, `tree_collaborators`, `tree_discussions`,
  `activity_logs`, and media sync policies.
- `is_tree_collaborator(uuid,text)` is used by collaborator read/write policies
  and by privileged tree mutation/sync RPCs.
- `can_edit_tree(uuid)` is used by tree-edit RPCs after the May 2026 hardening
  migration.

This means the first helper pass should be a compatibility experiment, not a
production migration. The safe target is to reduce PostgREST-exposed RPC
surface while preserving policy execution, which likely requires moving helpers
into a private schema and updating every dependent policy/function reference in
the same migration.

There is also local schema drift to resolve before writing SQL: current
migrations reference `public.current_user_id_text()` from an older
`20260221_user_profiles_rls_auth_uid.sql` migration, but that migration is not
present in the repository. Pull or inspect the production function definitions
before attempting to recreate or move these helpers.

Use `supabase/diagnostics/security_definer_inventory.sql` as the read-only
production inventory query before writing the first helper migration. It reports
target function definitions, security mode, ACLs, and policies that reference
helper functions.

Production check on 2026-05-22:

- target functions found: 18
- target functions still using `SECURITY DEFINER`: 18
- helper-dependent RLS policies found: 75
- helper-dependent tables found: 10
- direct execute grantees for sampled target RPCs are `authenticated`,
  `postgres`, and `service_role`; `anon` and inherited `PUBLIC` execution remain
  removed from the previous cleanup.

Conclusion: the helper pass is broad RLS surgery, not a small privilege revoke.
Any migration here must be staged and covered by owner/collaborator regression
tests first.

## Recommended Execution Order

1. **Helper exposure reduction**
   - Do not start by revoking direct `authenticated` execute from helper-only
     functions in production.
   - First pull/inspect production definitions for `current_user_id_text`,
     `current_user_email_text`, `is_tree_owner`, and related helpers.
   - Create a local/staging migration that moves helper implementations to a
     private schema and rewrites dependent RLS policies/functions together.
   - Verify owner/collaborator read/write flows before considering production.

2. **Maintenance isolation**
   - Move pruning functions away from normal signed-in client access.
   - Prefer an admin/server-only path or scheduled job with a private function.

3. **Unused tree mutation cleanup**
   - Confirm whether `create_person_and_relationship`,
     `delete_person_and_relations`, and `sync_tree_batch` are still needed by
     production clients.
   - If not needed, remove public execution first, then drop only after a
     compatibility window.

4. **High-blast-radius sync redesign**
   - Redesign `replace_tree_content` with the strongest tests first.
   - This RPC can rewrite a tree, so it should not be changed in the same
     migration as helper or maintenance cleanup.

5. **Invitation wrappers**
   - Keep public wrappers for app ergonomics.
   - Move privileged internals into a private schema only after invitation
     accept, decline, revoke, expiry, email-mismatch, and owner tests exist.

## Required Regression Tests Before SQL Changes

- Owner can create a tree and root profile.
- Owner/editor can perform supported tree mutations.
- Viewer/non-member cannot mutate a tree.
- Invitation token acceptance works only for the invited email.
- Invitation-by-id acceptance works only for the invited email.
- Invitation decline changes only the matching invite.
- Owner can revoke an invitation; non-owner cannot.
- Bulk replace refuses a tree the caller cannot edit.
- Maintenance pruning cannot be invoked by an unrelated authenticated user.
- Collaboration claim does not grant access from spoofable user metadata.

## Non-Goals

- Do not enable automated behavior changes from advisor output.
- Do not remove authenticated RPC access without a replacement app path.
- Do not bundle this with Kindi learning-report changes.
- Do not treat the Free-plan leaked-password warning as part of this redesign.
