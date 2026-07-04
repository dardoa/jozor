# Live Deployed Smoke Harness Report - 2026-07-04

**Status**: Harness Ready  
**Live execution**: Pending DEPLOYED_SMOKE_URL and VERCEL_BYPASS_TOKEN  
**Date**: 2026-07-04  
**Latest Reference Commit**: `20e099a docs(beta): add private beta access enablement plan`

---

## 1. Harness Design & Security Setup

We designed and implemented a secure E2E execution harness to verify the application shell and key paths on live staging/preview deployments once protection bypass configurations are provided.

* **Helper File**: [deployedAccess.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/helpers/deployedAccess.ts)
  * Safely reads `DEPLOYED_SMOKE_URL` and `VERCEL_BYPASS_TOKEN` from the environment.
  * Injects the `_vercel_jwt` cookie securely inside the Playwright BrowserContext for the target domain.
  * Rejects tokenized deployment URLs that include bypass secrets in query parameters.
  * Ensures zero credentials or URL identifiers are printed in execution logs or committed to git.
* **Test File**: [live-deployed-smoke.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/live-deployed-smoke.spec.ts)
  * Runs check only when both environment variables are present.
  * Skips cleanly without failures when access parameters are not configured.
* **Playwright Config**: [live-deployed.playwright.config.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/live-deployed.playwright.config.ts)
  * Runs the live deployment smoke without starting the local `localhost:3000` web server.

---

## 2. Deployed Verification Capabilities

Once the environment variables are configured, the test harness checks the following target behaviors:

1. **Vercel Protection Bypass**: Asserts that navigation does not redirect to the Vercel SSO login page.
2. **App Shell Load**: Asserts that the `#root` container is visible on the DOM.
3. **Landing UI Signposts**: Verifies landing/welcome layouts are visible.
4. **Intelligent Assistant Trigger**: Confirms the Kindi assistant trigger is present.
5. **Console Sanity**: Captures and asserts zero high-severity console exceptions during initialization.

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
Live execution: Pending DEPLOYED_SMOKE_URL and VERCEL_BYPASS_TOKEN
```
