# Supabase Baseline Squash Decision & Dry Run Report

This report evaluates the feasibility and risks of squashing the 70 Supabase SQL migrations for Jozor 2.0.

---

## 1. Executive Summary

A non-destructive audit and dry-run connection were performed against the remote database. We verified that both local and remote migrations are perfectly synchronized with no drifts (`Remote database is up to date`).

- **Total Migration Files**: 70 files.
- **Recommended Decision**: **Proceed after live migration history backup**.
- **Reasoning**: Changing or deleting the 70 files locally will cause immediate validation mismatches on the remote Supabase database because the database's `supabase_migrations.schema_migrations` table contains records of all 70 applied filenames. A squash requires repair/reset steps on both the local and remote environment.

---

## 2. Migration Inventory Summary

| Category | Count | Key Contents / Focus | Keep / Consolidate / Remove |
|---|---|---|---|
| **Core Schema** | 5 | Trees, People, and initial definitions. | Consolidate |
| **Sharing & RLS** | 12 | Collaborative access control, invites, visibility checks. | Consolidate |
| **Sync & Conflict** | 9 | Atomic RPCs, replace content, batch synchronization. | Consolidate |
| **Billing & SaaS** | 11 | Billing fixes, enforcement triggers, usage limits. | Consolidate |
| **Storage & Media** | 5 | Photo columns, avatar access control, listing restrictions. | Consolidate |
| **Kindi / Discussions** | 14 | Learning logs, discussions, taxonomy constraints. | Consolidate |
| **Living Privacy** | 6 | `people_secure` view versions, living privacy filters. | Consolidate (Remove old views) |
| **Push Reminders** | 2 | PWA Push subscriptions. | Consolidate |

---

## 3. Recommended Baseline Strategy

### Option Selection: `Proceed after live migration history backup`

We recommend proceeding with squashing **only after taking a live backup and storing it outside the repository**, using the following command plan during the launch candidate freeze:

1. Backup current remote schema to a local untracked location:
   ```bash
   npx supabase db dump --linked > C:\tmp\jozor-prelaunch-backups\supabase_schema_backup.sql
   ```
   Do not commit database dumps to git.
2. Squash all migrations into a single cohesive SQL file:
   `supabase/migrations/20260703000000_baseline.sql`
3. Resolve history conflict on the remote database:
   Run repair command to force-record the new baseline version:
   ```bash
   npx supabase migration repair 20260703000000 --status applied
   ```

---

## 4. Commands Not Executed
- `supabase db reset` (Destructive local database reset skipped)
- `supabase migration repair` (Remote history repair skipped)
- Deleting migration files (Local `.sql` file cleanup skipped)
- `db push` without dry-run (Forced push skipped)
