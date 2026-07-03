# Private Beta Smoke Test - Evidence Notes (2026-07-03)

**Commit Tested**: `15cb3cd docs(beta): add private beta release checklist`
**Run Date**: 2026-07-03
**Tester**: Antigravity (Automated)

---

## Automated Evidence

### Repository State

- Branch: `main`
- Status: Clean (working tree clean, up to date with `origin/main`)
- Latest commit: `15cb3cd`

### Build & Code Quality

- `npm run typecheck`: **PASSED** (0 errors)
- `npm run lint`: **PASSED** (0 warnings, 0 errors, max-warnings 0)
- `npm run build`: **PASSED** (3865 modules transformed, built in 20.94s)
  - Note: Rollup chunk warning on `feature-geography` (598 kB > 500 kB limit) - known P2, not a blocker.

### Unit Tests

- **Targeted smoke (80 tests)**: PASSED
  - `gedcomLogic.test.ts` (59 tests)
  - `importExportLifecycle.test.ts` (5 tests)
  - `useExport.test.ts` (10 tests)
  - `db.test.ts` (3 tests)
  - `storageService.test.ts` (3 tests)
- **Full suite (604 tests / 125 files)**: PASSED - 0 failures

### Supabase Database

- `migration list --linked`: **PASSED** - 70/70 migrations matched (local = remote)
- `db push --dry-run --linked`: **PASSED** - "Remote database is up to date"

---

## Pending (Manual Only)

### Browser Smoke Test

**Status**: Pending - requires live authenticated session

Items to verify manually before first beta invitations:
- [ ] Login page loads
- [ ] Owner can open owned tree
- [ ] Viewer masking applied to living persons
- [ ] Export masked GEDCOM/Markdown
- [ ] Manuscript preview opens
- [ ] Write guard blocks viewer from saving
- [ ] Paddle sandbox checkout/cancel (if payments included in first wave)

---

## Findings Summary

| ID | Finding | Severity | Confirmed |
|---|---|---|---|
| F-01 | Geography chunk > 500 kB (Rollup warning) | P2 | Yes - build log |
| F-02 | Browser smoke not executed | P2 | Yes - pending manual |
| F-03 | Paddle sandbox checkout/cancel not smoke tested | P2 | Yes - pending manual |

**P0 blockers**: None
**P1 blockers**: None
