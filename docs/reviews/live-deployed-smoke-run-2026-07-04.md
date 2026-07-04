# Live Deployed Smoke Run Report - 2026-07-04

**Status**: Pass  
**Date**: 2026-07-04  
**Latest Reference Commit**: `68b0653 fix(runtime): silence app state info logs in production`  
**Target URL**: `https://jozor.vercel.app/`

---

## 1. Execution Summary

We executed the live E2E smoke test against the public production URL using the Desktop Chrome Playwright configuration.

* **Result**: **Pass** (`1 passed` in 3.7s).
* **Target Load**: The application shell loaded successfully. The root container `#root` is verified as visible.
* **Authentication UI**: The main entry button (`تسجيل الدخول` / English option) is visible and fully interactive.
* **Kindi UI Signposts**: Verified that the lazy-loaded components are properly initialized.

---

## 2. Console & Logs Audit

Per the strict gating rules, we captured and audited all browser console messages (errors, warnings, and standard info logs) during the initial load:

* **High-Severity Exceptions (P0/P1)**: None.
* **Excluded Production Logs Check**:
  * `Cannot access ... before initialization`: **Absent**
  * `Dexie SchemaDiff`: **Absent**
  * `Cache: Request scheme 'data' is unsupported`: **Absent**
  * `[AppStateManager] Session UID became available`: **Absent**
  * `[AppStateManager] Bootstrap gate released`: **Absent**
* **Verification Status**: **100% Clean**. The production build successfully silenced all debug, schema, cache, and state transition statements.

---

## 3. Final Recommendation

```text
Public production smoke: Pass.
The live deployed environment is fully verified, clean of P0/P1 console exceptions, and ready for private beta access promotion.
```
