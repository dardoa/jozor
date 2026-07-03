# Private Beta Release Checklist Report

This checklist serves as the operational guide for conducting the first controlled private beta release of Jozor 2.0.

---

## 1. Release Decision
- **Current Decision**: `Ready for private beta`
- **Source Report**: `docs/reviews/launch-readiness-audit-2026-07-03.md`
- **Latest Commit Hash**: `9a1d8f6`
- **Target Environment**: Staging / Private Beta

---

## 2. Pre-Beta Required Actions
Checklist:

- [ ] Confirm `origin/main` is clean and deployed branch matches latest commit.
- [ ] Confirm Supabase migration list has no drift.
- [ ] Confirm `npm run typecheck`, `npm run lint`, `npm run build`.
- [ ] Confirm full test suite passes.
- [ ] Confirm environment variables presence only, no values printed.
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
- Rollup geography chunk warning > 500 kB.
- Final Paddle checkout/cancel smoke required before public launch.
- Supabase migration squash deferred until launch candidate freeze.
- Full live multi-user conflict simulation pending.
- Visual polish deferred from manuscript review.

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
| Main branch clean | Pending | Owner | Verify local matches origin/main |
| Database sync check | Pending | Owner | Verify migration status is up-to-date |
| Verification tests | Pending | Editor | Verify 604 unit tests pass |
| Environment variables check | Pending | Owner | Verify required environment variable presence without printing values |
| Basic E2E Smoke | Pending | Editor | Check login, masking and export |

---

## 8. Recommended Next Pack
- **Recommended Next Pack**: `Private Beta Deployment Smoke Test`
