# Private Beta Release Checklist Report

This checklist serves as the operational guide for conducting the first controlled private beta release of Jozor 2.0.

---

## 1. Release Decision

- **Current Decision**: `Ready for private beta setup`
- **Source Report**: `docs/reviews/private-beta-go-no-go-2026-07-04.md`
- **Latest Evidence Commit Hash**: `69d23e5`
- **Target Environment**: Staging / Private Beta

---

## 2. Pre-Beta Required Actions

Checklist:

- [x] Confirm `origin/main` is clean and deployed branch matches latest commit.
- [x] Confirm Supabase migration list has no drift.
- [x] Confirm `npm run typecheck`, `npm run lint`, `npm run build`.
- [x] Confirm full test suite passes.
- [x] Confirm environment variables presence only, no values printed.
- [x] Run browser smoke tests and document conditional gates for:
  - login
  - owner opens tree
  - viewer masking
  - export masked GEDCOM/Markdown
  - manuscript preview
  - cloud backup write guard for viewer
  - Paddle sandbox checkout/cancel UI smoke

---

## 3. Known P2/P3 Issues Accepted Into Private Beta

- E2E auth harness requires `E2E_AUTH_ROLE_HARNESS=true` and staging credentials (P2).
- Final Paddle checkout transaction requires live sandbox browser session (P2).
- Supabase migration squash deferred until launch candidate freeze (P3).
- Full live multi-user conflict simulation pending (P3).
- Visual polish deferred from manuscript review (P3).

---

## 4. Beta Tester Guardrails

- Use test data or explicitly approved family trees.
- Avoid uploading highly sensitive media in first beta wave.
- Report browser, OS, tree size, role, and exact steps.
- Capture screenshots only with consent.

---

## 5. Data Policy For First Beta

- No production/legal identity documents.
- No highly sensitive media in first wave.
- Test with approved family trees only.
- Back up any imported GEDCOM before editing.

---

## 6. Rollback Plan

- Revert deployment to previous commit.
- Disable beta invitations.
- Restore Supabase from backup if schema/data issue appears.
- Keep Supabase migration squash deferred until after beta unless necessary.

---

## 7. Go / No-Go Checklist

| Item | Status | Owner | Notes |
|---|---|---|---|
| Main branch clean | **Pass** | Owner | Local branch clean at the time of review; final Go/No-Go commit to be pushed |
| Build | **Pass** | Owner | 0 compilation errors |
| Typecheck | **Pass** | Owner | 0 type errors |
| Lint | **Pass** | Owner | 0 warnings, 0 errors |
| Full tests | **Pass** | Editor | 125 test files, 604 tests, all passed |
| Supabase migration drift | **Pass** | Owner | 70/70 migrations matched, no drift |
| IndexedDB baseline | **Pass** | Owner | V1 baseline verified with tests |
| Viewer privacy | **Pass** | Editor | Masking and RLS verified |
| Export privacy | **Pass** | Editor | Sanitation on export paths verified |
| GEDCOM import/export | **Pass** | Editor | Hardened validation and adapter verified |
| Publishing/manuscript smoke | **Conditional Pass** | Editor | Deployed preview works; PDF uses browser print fallback |
| Browser smoke | **Conditional Pass** | Editor | Local browser smoke documented; live deployed login pending |
| E2E authenticated role harness | **Conditional Pass** | Editor | Harness ready; requires `E2E_AUTH_ROLE_HARNESS=true` and staging credentials for full collaborative test |
| Paddle sandbox checkout | **Conditional Pass** | Editor | Paywall modal opens and calls session API; sandbox portal pending live browser |
| Vercel production env check | **Pending** | Owner | Required before invite |
| Live Paddle transaction | **Pending** | Owner | Required before paid beta |
| First tester invite | **Pending** | Owner | Gated by pending live ops |

---

## 8. Smoke Test Run - 2026-07-04

**Commit Tested**: `69d23e5 docs(beta): add paddle sandbox checkout smoke audit`

### Commands Run & Results

| Command | Result | Notes |
|---|---|---|
| `git status --short` | Passed | Working tree clean |
| `git log -1 --oneline` | Passed (`69d23e5`) | Matches expected commit |
| `npm run typecheck` | Passed | 0 type errors |
| `npm run lint` | Passed | 0 warnings, 0 errors |
| `npm run build` | Passed | 0 build errors |
| Targeted billing tests (36) | Passed | Vitest suites for billing endpoints and controller |
| Playwright paywall smoke | Conditional Pass | Paywall/request path documented; complete sandbox portal pending live browser |
| `supabase migration list` | Passed | 70/70 local = remote |
| `supabase db push --dry-run` | Passed | Remote database is up to date |

### Pending Items

- **Vercel Env Verification**: Double check server role keys are set in the Vercel dashboard.
- **Live Deployed Smoke**: Access staging URL, log in, and verify the checkout flow initialization.

### Blockers

- **None found.**

### Final Recommendation

```text
Decision: Go for controlled private beta setup.
External tester invitations remain gated by Vercel env verification, live deployed smoke, and live Paddle sandbox checkout confirmation.
```
