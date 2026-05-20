# Kindi Cloud Learning Admin Reports

## Safe Scope

Kindi cloud learning is reporting-only in this release. It records redacted operational signals that help improve search, intent routing, command parsing, and support coverage.

This release does not add automatic rule injection, automatic parser updates, or model self-training inside the application.

## Stored Data

Allowed fields:

- `event_type`
- `interaction_id`
- `route_kind`
- `result_kind`
- `failure_reason`
- `redacted_query`
- `ai_category`
- `confidence`
- `intent_guess`
- `parser_stage`
- `parser_name`
- `parser_version`
- `local_lexicon_version`
- safe scalar metadata such as `candidateCount`, `promptName`, and `planType`

Forbidden fields:

- raw user query
- real names outside the redacted pattern
- person IDs
- emails
- full AI prompts
- full AI responses
- tree payloads

## Admin Access

Admin access is controlled by `public.admin_users`, not by tree ownership and not by user-editable metadata.

To grant application-owner access after applying the migration, insert the owner Auth user ID through a trusted SQL/admin channel:

```sql
insert into public.admin_users (user_id, note)
values ('<OWNER_AUTH_UID>', 'Application owner');
```

Normal authenticated users may insert their own redacted learning events, but only active rows in `admin_users` can read reports.

Current production grant:

- `mdardoa@gmail.com` has active app-owner Admin access for Kindi learning reports.

## Dashboard

The in-app admin route is:

```text
/admin/kindi-learning
```

The route is also available from the account menu and mobile account sheet for active app Admins only.
The dashboard includes a **Back to app** control so the Admin route does not trap the user outside
the main application.

The dashboard is read-only and supports filtering by:

- date range
- event type
- parser version

All visible cards and tables are computed from the same filtered event set, so the report remains internally consistent.

The most important report is **Top AI-to-local improvement opportunities**. A row appears there only when one user interaction has:

- a local/search failure
- an AI fallback result
- a user-confirmed AI success

These rows are candidates for manual parser or lexicon work. They are not executable rules.

## Failure Taxonomy

Use stable uppercase taxonomy values for `failure_reason`:

- `UNKNOWN_DIALECT_WORD`
- `NAME_AMBIGUOUS`
- `FIELD_NOT_RECOGNIZED`
- `RELATION_NOT_SUPPORTED`
- `LOCAL_SEARCH_FAILED`
- `AI_LOW_CONFIDENCE`
- `USER_CANCELLED`
- `USER_REJECTED_DRAFT`
- `SUPPORT_TOPIC_MISSING`
- `PARSER_PATTERN_MISSING`
- `EXECUTION_FAILED`
- `PERMISSION_DENIED`

Avoid free-form failure strings in application code. New values should be added deliberately with tests and report review.

## Retention

Default operating target: keep Kindi learning events for 90 days unless product/legal requirements say otherwise.

The linked Supabase project now runs `kindi-learning-retention-daily` through `pg_cron` at `02:17 UTC`.
It calls `public.prune_kindi_learning_events(90)` and deletes events older than 90 days.

## Applied Supabase Migrations

The linked Supabase project has been updated with:

- `20260520000100_add_kindi_learning_events_reports.sql`
- `20260520000200_extend_kindi_learning_taxonomy.sql`
- `20260520000300_harden_kindi_learning_taxonomy_constraints.sql`
- `20260520174520_kindi_learning_retention.sql`

Verified remote properties:

- RLS enabled on `admin_users` and `kindi_learning_events`.
- Report views use `security_invoker=true`.
- Non-admin authenticated users cannot read learning events.
- Unknown failure taxonomy values are rejected.
- Raw `redacted_query` values without `[NAME_n]` tokens are rejected.
- Valid redacted learning events are accepted.
- Retention function `prune_kindi_learning_events` exists.
- Cron job `kindi-learning-retention-daily` is active.

## Future Expansion

Safe next steps:

- Add more summary views or RPC functions for large datasets.
- Add export of aggregated CSV reports only.
- Add manual review queues for candidate parser improvements.
- Add admin-only notes and triage status for repeated failure patterns.

Risky steps to avoid until a separate security review:

- Automatic parser rule injection.
- Executing AI-proposed regex or code.
- Storing raw prompts or raw user text.
- Allowing tree owners to access global learning reports.
