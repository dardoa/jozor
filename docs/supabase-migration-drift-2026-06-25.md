# Supabase Migration Drift - 2026-06-25

## Context

While preparing the attached-entities privacy migration, the linked Supabase project reported migration-history drift between the local repository and the remote database.

The new local migration is:

- `20260625161646_restrict_viewer_avatar_object_listing.sql`

It has been committed and pushed to GitHub, but it has not been applied to the linked Supabase database yet.

## Observed Drift

`supabase migration list --linked` showed local-only and remote-only entries around the Sprint 14 privacy migrations:

```text
Local          | Remote
---------------|---------------
20260623000100 |
               | 20260623094441
               | 20260623163915
               | 20260623165619
20260623173507 |
               | 20260623173945
20260625161646 |
```

`supabase db push --dry-run --linked` then refused to continue because remote migration versions are not present in the local migrations directory.

## Resolution

Resolved on 2026-06-25.

The remote-only migrations were fetched into the repository, duplicate-version legacy fetch artifacts were discarded, and the reviewed local-only migrations were applied with `--include-all` because they were idempotent reconciliation migrations using `CREATE OR REPLACE` / `DROP POLICY IF EXISTS` patterns.

Applied to the linked Supabase database:

- `20260623000100_living_person_privacy.sql`
- `20260623173507_harden_living_person_privacy_view.sql`
- `20260625161646_restrict_viewer_avatar_object_listing.sql`

Fetched from the linked Supabase migration history and kept locally:

- `20260623094441_20260623000100_living_person_privacy.sql`
- `20260623163915_20260623000100_living_person_privacy.sql`
- `20260623165619_living_person_privacy_v2.sql`
- `20260623173945_harden_living_person_privacy_view.sql`

`supabase migration list --linked` now shows local and remote migration versions aligned through `20260625161646`.

`tests/integration/privacyDatabase.integration.test.ts` passed against the linked integration database after reconciliation.

## Decision Record

Do not run `supabase db push --linked --yes` while the migration history is inconsistent.

Do not run `supabase migration repair --status reverted ...` automatically just because the CLI suggested it. Repairing the migration history without first understanding the remote-only migrations could hide real schema drift.

## Safe Reconciliation Plan

1. Freeze Supabase migration pushes until the remote-only entries are inspected.
2. Fetch or inspect remote migration history:

   ```powershell
   npx supabase migration list --linked
   npx supabase migration fetch --linked
   ```

3. Compare the remote-only migrations with the local privacy migrations:

   - `20260623000100_living_person_privacy.sql`
   - `20260623173507_harden_living_person_privacy_view.sql`

4. Decide whether the remote-only migrations are equivalent split hotfixes that should be added to the repository, or whether the migration history needs an explicit, reviewed repair.
5. Re-run a dry run:

   ```powershell
   npx supabase db push --dry-run --linked
   ```

6. Only after the dry run is clean, apply the pending local privacy migration:

   ```powershell
   npx supabase db push --linked --yes
   ```

7. Verify the privacy path against the linked database:

   ```powershell
   npx vitest run --config vitest.integration.config.ts tests/integration/privacyDatabase.integration.test.ts
   ```

## Current Risk

`20260625161646_restrict_viewer_avatar_object_listing.sql` is now applied.

The existing `people_secure` privacy view and viewer export masking remain the main protection for application data. Legacy public avatar URLs remain a separate, known migration package.
