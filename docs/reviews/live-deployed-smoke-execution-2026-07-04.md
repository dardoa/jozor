# Live Deployed Smoke Execution Report - 2026-07-04

**Status**: Harness Ready  
**Live execution**: Pending DEPLOYED_SMOKE_URL and VERCEL_BYPASS_TOKEN  
**Date**: 2026-07-04  
**Latest Reference Commit**: `e584d7f test(e2e): add live deployed smoke harness with protected access support`

---

## 1. Execution Summary

We executed the live deployed smoke test harness in the local workspace as a dry-run. This run verifies the harness behavior only and does not count as a live deployed smoke pass.

* **Execution Status**: `1 skipped` (The E2E test skipped cleanly in the absence of `DEPLOYED_SMOKE_URL` and `VERCEL_BYPASS_TOKEN` in the environment parameters).
* **Vercel Bypass Check**: Verified that the E2E helper throws an error if any bypass token is accidentally passed within the URL parameters, protecting the credentials from logging or leaking.
* **Console & Shell Verification**: Verification is deferred until the staging environment parameters are supplied.

---

## 2. Findings & Gates

| Gate Item | Status | Notes |
| :--- | :--- | :--- |
| **Harness Stability** | **Pass** | E2E helper and Playwright spec load correctly and skip cleanly without failures. |
| **Vercel SSO Bypass** | **Pending** | Requires `VERCEL_BYPASS_TOKEN` and `DEPLOYED_SMOKE_URL`. |
| **App Shell Boots** | **Pending** | Deferred to live execution. |
| **Console Errors** | **Pending** | Deferred to live execution. |
| **Kindi/Login UI Checks** | **Pending** | Deferred to live execution. |

---

## 3. External Tester Blockers

* **None from the codebase.** The E2E smoke test and access harness are fully prepared and stable.
* **Staging Configuration Blocker**: The live environment verification remains pending the input of the bypass secret and deployment target URL.
* **External tester invitations remain blocked** until the same harness is executed with live deployment access and returns a real pass.

---

## 4. Final Recommendation

```text
Status: Harness Ready
Live execution: Pending DEPLOYED_SMOKE_URL and VERCEL_BYPASS_TOKEN
External tester invitations: blocked until live deployed smoke passes
```
