# Private Beta Release Checklist Report

This checklist serves as the operational guide for conducting the first controlled private beta release of Jozor 2.0.

---

## 1. Release Decision

- **Current Decision**: `Ready for private beta`
- **Source Report**: `docs/reviews/launch-readiness-audit-2026-07-03.md`
- **Latest Commit Hash**: `15cb3cd`
- **Target Environment**: Staging / Private Beta

---

## 2. Pre-Beta Required Actions

Checklist:

- [x] Confirm `origin/main` is clean and deployed branch matches latest commit.
- [x] Confirm Supabase migration list has no drift.
- [x] Confirm `npm run typecheck`, `npm run lint`, `npm run build`.
- [x] Confirm full test suite passes.
- [x] Confirm environment variables presence only, no values printed.
- [ ] Run one smoke test for:
  - login
  - owner opens tree
  - viewer masking
  - export masked GEDCOM/Markdown
  - manuscript preview
  - cloud backup write guard for viewer
  - Paddle sandbox checkout/cancel if beta includes payments

---

## 3. Known P2/P3 Issues Accepted Into Private Beta

- Rollup geography chunk warning > 500 kB (P2).
- Final Paddle checkout/cancel smoke required before public launch (P2).
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
| Main branch clean | **Passed** | Owner | `15cb3cd` matches `origin/main` |
| Database sync check | **Passed** | Owner | 70/70 migrations matched, no drift |
| Verification tests (604) | **Passed** | Editor | 125 test files, 604 tests, 0 failures |
| Environment variables check | **Passed** | Owner | Required groups present, values not printed |
| Basic E2E Smoke | **Pending** | Editor | Browser smoke requires live session |

---

## 8. Smoke Test Run - 2026-07-03

**Commit Tested**: `15cb3cd docs(beta): add private beta release checklist`

### Commands Run & Results

| Command | Result | Notes |
|---|---|---|
| `git status --short` | Passed | Working tree clean |
| `git log -1 --oneline` | Passed (`15cb3cd`) | Matches expected commit |
| `npm run typecheck` | Passed | 0 type errors |
| `npm run lint` | Passed | 0 warnings, 0 errors |
| `npm run build` | Passed | 3865 modules, 20.94s |
| Targeted tests (80) | Passed | GEDCOM, lifecycle, export, DB, storage |
| `npm run test` (604) | Passed | 125 files, 604 tests, 0 failures |
| `supabase migration list` | Passed | 70/70 local = remote |
| `supabase db push --dry-run` | Passed | Remote database is up to date |
| Browser smoke | Pending | Requires live session; not automated |

### Pending Items

- **Browser Smoke Test**: Cannot be automated in this context. Requires a live authenticated session to verify login, owner tree access, viewer masking, GEDCOM/Markdown export, manuscript preview, and write guard for viewer role.

### Blockers

- **None found.** No P0 or P1 blockers discovered during this smoke run.

### Final Recommendation

```text
Go for private beta
```

This recommendation assumes the short manual browser smoke is completed before sending the first beta invitation.

---

## 9. Recommended Next Pack

- **Recommended Pack**: `Geography Chunk Split Optimization` (P2 - reduces initial load for maps-heavy features before public launch).
