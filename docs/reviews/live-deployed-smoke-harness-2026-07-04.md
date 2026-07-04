# Live Deployed Smoke Harness Report - 2026-07-04

**Status**: Harness Ready  
**Live execution**: Pending DEPLOYED_SMOKE_URL
**Date**: 2026-07-04  
**Latest Reference Commit**: `56d31e7 docs(beta): add first beta tester onboarding plan`

---

## 1. Harness Execution Modes

The E2E smoke test supports two execution paths based on environment variable configuration:

### Mode A: Public URL Mode
* **Variables**: `DEPLOYED_SMOKE_URL` only.
* **Behavior**: Opens the public staging URL. Skipped if Vercel Deployment Protection is active and redirects to the Vercel login screen.
* **Bypass Secret**: Not required.

### Mode B: Protected URL Mode
* **Variables**: `DEPLOYED_SMOKE_URL` + `VERCEL_BYPASS_TOKEN`.
* **Behavior**: Accesses a protected Vercel preview branch. Injects the `_vercel_jwt` cookie securely into Playwright BrowserContext to bypass SSO gates.

---

## 2. Harness Design & Security Setup

* **Helper File**: [deployedAccess.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/helpers/deployedAccess.ts)
  * Reads configuration. Throws an error if `x-vercel-protection-bypass` is present in the URL query parameters to prevent credential exposure.
  * Injects Vercel bypass cookies securely. No secrets or domains are logged or hardcoded.
* **Test File**: [live-deployed-smoke.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/live-deployed-smoke.spec.ts)
  * Skips cleanly only when `DEPLOYED_SMOKE_URL` is absent.
  * Fails with a clear message: `"Deployment is protected; provide VERCEL_BYPASS_TOKEN or use public staging URL."` if redirection to `vercel.com/login` is detected.
* **Playwright Config**: [live-deployed.playwright.config.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/live-deployed.playwright.config.ts)
  * Runs E2E tests against live endpoints without spinning up local web servers.

---

## 3. Execution Logs (Local Dry-run)

```text
npx playwright test live-deployed-smoke.spec.ts --config tests/e2e/live-deployed.playwright.config.ts --project=chromium

Running 1 test using 1 worker
  1 skipped
```

---

## 4. Final Recommendation

```text
Status: Harness Ready
Live execution: Pending DEPLOYED_SMOKE_URL
```
