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

## Intentionally Not Published

| Source handler | Reason |
| --- | --- |
| `src/api/debug-env.ts` | Diagnostic-only endpoint. It should not be exposed in Vercel because it reports environment-variable presence and operational recommendations. |
| `src/api/check-env.ts` | Development diagnostic endpoint. The local Vite middleware can serve equivalent checks; production exposure is unnecessary. |

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
