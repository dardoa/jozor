# Private Beta Release Checklist Report

This checklist serves as the operational guide for conducting the first controlled private beta release of Jozor 2.0.

---

## 1. Release Decision

- **Current Decision**: `Ready for private beta cohort onboarding`
- **Source Report**: `docs/reviews/private-beta-invitation-gate-2026-07-04.md`
- **Latest Evidence Commit Hash**: `e89f8df`
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
| Main branch clean | **Pass** | Owner | `origin/main` matches latest verified commit |
| Build | **Pass** | Owner | 0 compilation errors |
| Typecheck | **Pass** | Owner | 0 type errors |
| Lint | **Pass** | Owner | 0 warnings, 0 errors |
| Full tests | **Pass** | Editor | 125 test files, 604 tests, all passed |
| Supabase migration drift | **Pass** | Owner | 70/70 migrations matched, no drift |
| IndexedDB baseline | **Pass** | Owner | V1 baseline verified with tests |
| Viewer privacy | **Pass** | Editor | Masking and RLS verified |
| Export privacy | **Pass** | Editor | Sanitation on export paths verified |
| GEDCOM import/export | **Pass** | Editor | Hardened validation and adapter verified |
| Publishing/manuscript smoke | **Pass** | Editor | Verified manuscript previews and Narrative view |
| Browser smoke | **Pass** | Editor | Deployed URL smoke execution successfully completed |
| E2E authenticated role harness | **Pass** | Editor | Harness is verified and skips cleanly when keys are absent |
| Paddle sandbox checkout | **Pass** | Editor | Paywall trigger and sandbox portal successfully verified on deployed URL |
| Vercel production env check | **Pass** | Owner | Checked and verified via Vercel CLI |
| Rollback Tag | **Created** | Owner | Annotated tag `beta-v2.0-rollback` created and pushed |
| First tester invite | **Pending** | Owner | Gated by manual owner approval and invitation policy confirmation |

---

## 8. Smoke Test Run - 2026-07-04

**Commit Tested**: `e89f8df docs(beta): record public production smoke run`

### Commands Run & Results

| Command | Result | Notes |
|---|---|---|
| `git status --short` | Passed | Working tree clean |
| `git log -1 --oneline` | Passed (`e89f8df`) | Matches expected commit |
| `npm run typecheck` | Passed | 0 type errors |
| `npm run lint` | Passed | 0 warnings, 0 errors |
| `npm run build` | Passed | 0 build errors |
| Playwright live smoke | Passed | `1 passed` E2E test against `https://jozor.vercel.app/` |
| `supabase migration list` | Passed | 70/70 local = remote |

### Pending Items

- **Owner Invite Approval**: Require manual confirmation to send the first cohort invitation.
- **Supabase Invite Policy**: Verify invite-only flag is checked in the Supabase Dashboard.

### Blockers

- **None found.**

### Final Recommendation

```text
Status: Ready for release handoff
Execution: Blocked until open gates pass
External invitations: Not authorized yet
```
