# Supabase Migration History Repair

## Context

`npx supabase db push --dry-run --linked` is currently blocked before SQL
validation because the linked Supabase project has old short migration versions
recorded in the remote migration history table.

The current blocking versions are:

- `20260220`
- `20260221`
- `20260317`
- `20260318`
- `20260327`
- `20260504`

Supabase reports them as remote-only phantom versions and recommends marking
them as reverted.

## Important Safety Note

Do not re-apply the local short-version migration files as a workaround.
At least one historical file, `20260220_create_user_profiles.sql`, contains a
destructive reset:

```sql
DROP TABLE IF EXISTS public.user_profiles;
```

The safe path is to repair the migration history table only. This updates
Supabase migration metadata and does not apply SQL schema changes.

After the repair, the matching short-version local files should not remain in
`supabase/migrations`, because Supabase will treat them as old pending
migrations and require `--include-all`. They have been archived under:

```text
legacy_archive/supabase/migrations/
```

The short `20260504_media_storage_evolution.sql` migration was also archived
after it had already been applied remotely, because its short version created
another remote-only history entry.

## Repair Command

Run this only after confirming the linked Supabase project is the intended
target:

```powershell
npx supabase migration repair --status reverted 20260220 20260221 20260317 20260318 20260327 --linked --yes
```

Then verify:

```powershell
npx supabase db push --dry-run --linked
```

## Manual SQL Fallback

If migration history cannot be repaired immediately, apply the current cleanup
bundle manually through the Supabase SQL editor:

```text
docs/manual-sql/20260506_legacy_cleanup_and_rpc_hardening.sql
```

Paste the file contents only. Do not paste a migration file name into the SQL
editor.
