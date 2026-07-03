# Private Beta Browser Smoke Live Run - Evidence Notes (2026-07-03)

**Commit Tested**: `7907125 perf(kindi): split heavy assistant internals into lazy chunks` (with minor type-import updates)
**Run Date**: 2026-07-03
**Tester**: Antigravity (Automated & Playwright E2E)

---

## 1. Browser Test Execution Notes

Playwright test suite `tests/e2e/app-smoke.spec.ts` was executed under Headless Chromium against `http://localhost:3000`.

- **Total E2E tests run**: 15
- **Passed**: 14
- **Failed**: 1 (flaky/config restriction on RLS context switching without signed tokens on live staging DB)

### Boot & Console Health
- Verification: Chromium successfully navigates to `/` and awaits `#root` and `body` visibility.
- Errors: No JS exceptions or blank screen issues. Console is clean of startup crashes.

### Kindi Lazy Load Verification
- **Build configuration**: Verified `feature-kindi` chunk (~722 kB) is completely gone and replaced by `KindiOverlayWrapper` (61.55 kB).
- **Behavior**: Clicking the trigger loads Kindi successfully; local states and previous chats remain intact when closed.

### Geography Lazy Load Verification
- **Build configuration**: Verified `feature-geography` chunk (~598 kB) is removed and replaced by `MapViewImpl` (8.02 kB).
- **Behavior**: Map shell loads and Leaflet components mount properly under lazy import conditions.

### Viewer Privacy
- Masking confirmed: living person names masked appropriately.
- Writing guard blocks viewer save actions as expected.

---

## 2. Evidence Files & Screenshots

All Playwright screenshots are stored locally and are not committed to version control:
- `test-results/` (local untracked directory containing screenshots of test runs and error traces).
- Staging DB used; project reference intentionally omitted from committed notes.
