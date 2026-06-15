# Production Readiness Audit - 2026-06-15

This audit records the current release posture after the sandbox hardening
work. It separates what is already acceptable for the hosted sandbox from what
must be completed before a public production launch.

## Scope

- Repository branch: `main`
- Hosted sandbox URL: `https://jozor.vercel.app`
- Current deployment model: Vercel-hosted sandbox/staging application
- Database model: linked Supabase project used for the current validation path

## Verified During This Pass

- `npm run typecheck` passed.
- Supabase security advisors returned one warning only:
  `auth_leaked_password_protection`.
- Vercel environment variables are present for Supabase, Google, Paddle, VAPID,
  cron, Kindi AI, Gemini, and app origin configuration.
- `vercel.json` includes the SPA rewrite needed for deep-link refreshes:
  `/((?!api/).*) -> /index.html`.
- `vercel.json` includes the Google popup-compatible COOP header:
  `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- Admin subscription overrides are protected by server-side admin APIs and
  audit rows. The UI explicitly distinguishes `sandbox_test` overrides from
  Paddle subscriptions.

## Sandbox Status

The current environment is acceptable as a sandbox/staging environment when:

- the deployed commit is pushed to GitHub;
- Supabase diagnostics pass, including
  `security_definer_boundary_check.sql` and
  `rpc_execution_contract_check.sql`;
- app smoke checks for root route, deep route refresh, auth, sync, Google Drive,
  billing sandbox checkout, and admin-only surfaces pass;
- known Supabase leaked-password protection warning remains documented as a
  Free-plan limitation.

Current assessment: **sandbox-ready, with normal smoke validation after each
runtime-affecting deploy**.

## Production Blockers

These must be completed or explicitly accepted by the owner before public
production launch.

### 1. Supabase Auth Leaked Password Protection

Status: **blocked by current Supabase plan / dashboard capability**.

Evidence:

- Supabase advisor still reports `auth_leaked_password_protection`.

Required before production:

- enable leaked-password protection when the project plan supports it;
- rerun Supabase advisors and confirm the warning is gone, or document an owner
  exception if the app remains invite-only and non-public.

### 2. Paddle Production Switch

Status: **not production-ready until explicitly switched and verified**.

Evidence:

- Vercel has Paddle environment variable names configured for Production.
- The code selects `api.paddle.com` only when `PADDLE_ENVIRONMENT` or
  `VITE_PADDLE_ENVIRONMENT` equals `production`.
- The current operational flow has intentionally used sandbox checkout and
  `sandbox_test` admin overrides.

Required before production:

- set production Paddle API key, client token, webhook secret, and production
  price IDs in Vercel Production;
- set both `PADDLE_ENVIRONMENT` and `VITE_PADDLE_ENVIRONMENT` to `production`;
- verify the Paddle webhook destination points to the production deployment;
- run one production-mode dry validation that does not grant unintended access;
- keep `sandbox_test reset` available only for sandbox/admin verification, not
  for normal user support.

### 3. Google Cloud Key Restrictions

Status: **cannot be proven from repository or Vercel variable names**.

Evidence:

- `VITE_GOOGLE_API_KEY` and Google OAuth variables are present in Vercel.
- The repository documents that the browser key is public and must be restricted.

Required before production:

- restrict `VITE_GOOGLE_API_KEY` by exact production HTTP referrers;
- restrict the key to the required Google APIs only;
- align OAuth origins and redirect/callback origins with the production domain;
- rotate any Google browser key that was tested without referrer restrictions.

### 4. Production CI and Release Evidence

Status: **not verified in this pass**.

Required before production:

- GitHub Actions must be green on the exact promoted commit;
- full unit suite, lint, typecheck, API typecheck, build, and Playwright smoke
  must pass;
- cross-browser smoke on Firefox and WebKit should pass for release candidates.

### 5. Live Collaboration Validation

Status: **sandbox path tested previously, production live test still required**.

Required before production:

- run live collaboration checks with real owner/viewer/editor test accounts;
- validate invitation accept, decline, revoke, role change, edit persistence,
  and reload behavior;
- confirm viewer cannot mutate through Smart Persona, node context menu, Kindi,
  Vault, diagnostics, or settings surfaces.

### 6. Vercel Environment Cleanup

Status: **non-blocking cleanup before production**.

Evidence:

- Vercel still has `VITE_FIREBASE_*` environment variable names.
- No current source reference to `VITE_FIREBASE` or `FIREBASE` was found.

Recommended before production:

- remove unused Firebase environment variables from Vercel if they are truly
  legacy;
- avoid carrying old provider keys into the public production environment.

## Production Candidate Checklist

A production candidate can be considered only when:

- Supabase advisors are clean or owner-approved with clear risk acceptance;
- Paddle is deliberately switched from sandbox to production and verified;
- Google browser key restrictions are confirmed in Google Cloud;
- Vercel Production variables are reviewed by name and environment;
- CI is green on the promoted commit;
- live collaboration smoke passes with real test users;
- admin subscription overrides and billing diagnostics remain admin-only;
- rollback notes exist for schema and billing changes in the release window.

## Recommended Next Action

Keep `https://jozor.vercel.app` as the sandbox environment. The next practical
engineering task should be a small production-readiness cleanup:

1. remove or document unused `VITE_FIREBASE_*` variables in Vercel;
2. add a short production Paddle switch runbook;
3. add a Google Cloud restriction checklist with exact origins and APIs.
