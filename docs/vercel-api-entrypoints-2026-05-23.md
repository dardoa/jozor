# Vercel API Entrypoints - 2026-05-23

## Purpose

This inventory records which `src/api` handlers are intentionally exposed as
root Vercel functions under `api/`. Vercel deploys functions from the root
`api/` directory, while the Vite development server can also proxy local
requests to `src/api` through `scripts/dev/localApiProxyMiddleware.ts`.

## Published Root Functions

| Route | Root file | Source handler | Runtime | Notes |
| --- | --- | --- | --- | --- |
| `/api/auth/exchange` | `api/auth/exchange.ts` | standalone server handler | Node | Google auth-code exchange, server-only token handling. |
| `/api/maintenance` | `api/maintenance.ts` | `src/api/maintenance.ts` | Node | Server-side maintenance RPC isolation. |
| `/api/proxy` | `api/proxy.ts` | `src/api/proxy.ts` | Node | Shared tree load/save proxy and `replace_tree_content` guard path. |
| `/api/ai-proxy` | `api/ai-proxy.ts` | `src/api/ai-proxy.ts` | Edge | AI/Kindi proxy with auth and usage enforcement. |
| `/api/push-notifier` | `api/push-notifier.ts` | `src/api/push-notifier.ts` | Node | Authenticated or cron-secret push delivery. |
| `/api/push-reminder-cron` | `api/push-reminder-cron.ts` | `src/api/push-reminder-cron.ts` | Node | Cron-secret scheduled reminder processing. |

## Required Vercel Environment

| Variable | Required by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | `maintenance`, `ai-proxy`, push APIs | Server-side Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | `maintenance`, `ai-proxy`, push APIs | Server-only service role key. Never expose as `VITE_*`. |
| `SUPABASE_JWT_SECRET` | `auth/exchange`, auth utilities | Used to mint/verify internal Supabase JWTs. |
| `GOOGLE_CLIENT_ID` | `auth/exchange` | Server-side OAuth client id; may match `VITE_GOOGLE_CLIENT_ID`. |
| `GOOGLE_CLIENT_SECRET` | `auth/exchange` | Server-only OAuth client secret. |
| `ENCRYPTION_SECRET` | `auth/exchange` | Required when refresh tokens are stored. |
| `GOOGLE_AI_KEY` or `GEMINI_API_KEY` | `ai-proxy` | Server-only AI provider key for Kindi/AI features. |
| `VAPID_PUBLIC_KEY` | `push-notifier` | Web Push public key for server payload signing. |
| `VAPID_PRIVATE_KEY` | `push-notifier` | Server-only Web Push private key. |
| `CRON_SECRET` | `push-reminder-cron`, `push-notifier` | Vercel Cron bearer token and internal push authorization. |

## Scheduled Jobs

`vercel.json` schedules one daily job:

| Path | Schedule | Purpose |
| --- | --- | --- |
| `/api/push-reminder-cron` | `0 4 * * *` | Process a bounded batch of subscribed users for scheduled birthday reminders. |

Operational notes:

- The schedule is daily to stay compatible with Vercel Hobby limits.
- The endpoint requires `CRON_SECRET`; Vercel sends it as an `Authorization`
  bearer header when the environment variable is configured.
- Each run processes up to 10 batches by default, with 50 subscribed users per
  batch. The response includes `nextCursor` if a manual continuation is needed.
- Each run prunes `push_reminder_deliveries` rows older than 90 days before
  processing new reminders.
- Delivery is idempotent at the reminder level through
  `push_reminder_deliveries` dedupe keys.

## Intentionally Not Published (Deleted)

The following diagnostic endpoint source handlers were removed from `src/api/` as they are not published to Vercel and their development utility is served directly via Vite middleware:

- `src/api/debug-env.ts` (Deleted): Redundant diagnostic handler.
- `src/api/check-env.ts` (Deleted): Redundant diagnostic handler. Local environment diagnostics are handled directly by `/api/check-env` inside the [localApiProxyMiddleware.ts](../scripts/dev/localApiProxyMiddleware.ts) file.

## Verification

Root export tests exist for the published shared handlers:

- `src/api/__tests__/authExchangeRoot.test.ts`
- `src/api/__tests__/maintenanceRoot.test.ts`
- `src/api/__tests__/proxyRoot.test.ts`
- `src/api/__tests__/aiProxyRoot.test.ts`
- `src/api/__tests__/pushNotifierRoot.test.ts`
- `src/api/__tests__/pushReminderCronRoot.test.ts`

Current verification commands:

- `npm run test -- proxy`
- `npm run test -- aiProxyRoot`
- `npm run test -- push`
- `npm run build`
