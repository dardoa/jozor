# Supabase Security Advisor Cleanup - 2026-05-20

## Scope

This cleanup addressed broad Supabase security-advisor warnings that could be
fixed without changing the application's authenticated RPC contract.

The migration set is intentionally conservative. It does not redesign the tree
editing, invitation, sharing, or sync RPCs because those functions are part of
core application behavior and need a dedicated compatibility pass.

## Applied Migrations

- `20260520180851_harden_general_security_advisors.sql`
- `20260520181055_restrict_security_definer_public_execute.sql`

Both migrations were pushed to the linked Supabase project and confirmed in the
remote migration list.

## Fixed

- Pinned mutable `search_path` for advisor-reported helper, trigger, invitation,
  and sync functions.
- Removed legacy always-true RLS policies:
  - `Public Access Trees`
  - `Allow All Access`
- Replaced broad `locations_cache` insert/update checks with bounded checks for:
  - authenticated role
  - non-empty `place_name`
  - allowed status values
- Removed broad public/listing-style storage object SELECT policies for the
  public `avatars` bucket.
- Revoked SECURITY DEFINER RPC execution from `anon` and inherited `PUBLIC`.
- Re-granted current app RPC access explicitly to `authenticated`.

## Advisor Delta

Before cleanup, security advisors reported these warning groups:

- `function_search_path_mutable`: 8
- `rls_policy_always_true`: 4
- `public_bucket_allows_listing`: 1
- `anon_security_definer_function_executable`: 18
- `authenticated_security_definer_function_executable`: 18
- `auth_leaked_password_protection`: 1

After cleanup, remaining warning groups are:

- `authenticated_security_definer_function_executable`: 18
- `auth_leaked_password_protection`: 1

The remaining authenticated SECURITY DEFINER warnings are not accidental broad
anonymous exposure. They are signed-in RPC surfaces used by tree creation,
editing, sync, invitations, maintenance, or RLS helper logic.

## Remaining Work

### Auth Settings

Enable leaked password protection from Supabase Auth settings. This is a
project configuration change, not a SQL migration in this repository.

### SECURITY DEFINER Redesign

The remaining warning group requires a separate design pass. Candidate options:

- Move privileged implementation functions into a private schema.
- Keep only narrow public authenticated wrapper functions in `public`.
- Convert safe helper functions to `SECURITY INVOKER` where RLS behavior permits.
- Split maintenance RPCs from user-facing RPCs.
- Add regression tests for invitations, collaboration, tree mutation, sync, and
  access-control flows before changing function security mode.

Do not simply revoke `authenticated` from these functions without replacing the
calling path. The current app calls several of them directly, and RLS policies
also depend on helper functions.

## Verification Performed

- `supabase db push --dry-run --linked`
- `supabase db push --linked --yes`
- `supabase db advisors --linked --type security --level warn --fail-on none`
- `supabase migration list --linked`
- RPC privilege spot-check for representative functions confirmed only
  `authenticated` retained direct execute access in the checked sample.
