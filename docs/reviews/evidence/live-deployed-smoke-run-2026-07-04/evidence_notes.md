# Live Deployed Smoke Run Evidence Notes - 2026-07-04

This file logs the output trace of the live Playwright smoke run.

## 1. Playwright Test Output

```powershell
> $env:DEPLOYED_SMOKE_URL="https://jozor.vercel.app/"
> npx playwright test live-deployed-smoke.spec.ts --config tests/e2e/live-deployed.playwright.config.ts --project=chromium

Running 1 test using 1 worker

[1/1] [chromium] › tests\e2e\live-deployed-smoke.spec.ts:23:3 › Live Deployed Smoke Test › production app shell and layout loads
[E2E Live Smoke] Accessing configured deployment target.
[E2E Live Smoke] Captured console errors: []
[E2E Live Smoke] Captured console logs: []

  1 passed (3.7s)
```

## 2. Environment Verification

* **URL Tested**: `https://jozor.vercel.app/`
* **Vercel Build Commit**: Verified to correspond to `68b0653` (proven by the absolute absence of `[AppStateManager]` and `Dexie SchemaDiff` logging outputs in production).
