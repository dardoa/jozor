# E2E Authenticated Role Harness Report

This report documents the creation and validation of the Playwright E2E authenticated role harness designed to verify collaborator transitions and Supabase RLS policies honestly.

- **Status**: **Conditional Pass** (harness infrastructure successfully integrated; role-based transition test skips cleanly when env variables are not set. Live pass remains pending until staging credentials are supplied).
- **Date**: 2026-07-03

---

## 1. What Was Changed

### Helper Infrastructure
1. **Created [authState.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/helpers/authState.ts)**:
   - Manages Playwright `storageState` generation for owner and collaborator roles.
   - Saves session data to `.auth/owner.json` and `.auth/collab.json` dynamically when first needed.
   - Includes **session validation & self-healing**: checks if existing states are expired. If so, triggers a fresh UI login.
   - Supports force refresh via `process.env.E2E_REFRESH_AUTH_STATE === 'true'`.
2. **Created [collabHelpers.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/helpers/collabHelpers.ts)**:
   - Extracted and exported E2E shared collaboration UI actions (tree creation, settings menu interaction, collaborator invitation, role updates, and context menus).
3. **Ignored Auth Cache**:
   - Added `.auth/` to [.gitignore](file:///d:/AppDEV/Jozor1.1/.gitignore) to ensure no credentials or session tokens are committed.

### Test Harness Updates
- **Refactored [collaboration-live.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/collaboration-live.spec.ts)**:
   - Cleaned up duplicate UI helpers and imported them from `helpers/collabHelpers`.
- **Refactored [app-smoke.spec.ts](file:///d:/AppDEV/Jozor1.1/tests/e2e/app-smoke.spec.ts)**:
   - Swapped the simulation-based role transition test with a real E2E context test using Playwright `storageState`.
   - Enforced strict skip checks:
     ```ts
     if (!hasE2EAuthEnv()) {
       test.skip('shared tree access changes from owner to viewer to editor and editor changes persist after reload', () => undefined);
       return;
     }
     ```

---

## 2. Required Environment Variables

To run these tests with real authenticated contexts locally or on CI, explicitly enable the harness and populate the following variables (e.g. inside `.env.local` or environment variables):

```bash
E2E_AUTH_ROLE_HARNESS="true"
E2E_OWNER_EMAIL="<owner-test-email>"
E2E_OWNER_PASSWORD="<owner-test-password>"
E2E_COLLAB_EMAIL="<collaborator-test-email>"
E2E_COLLAB_PASSWORD="<collaborator-test-password>"

# Optional: Set to true to bypass cache and force a new login flow
E2E_REFRESH_AUTH_STATE="true"
```

---

## 3. Pending Scope & Recommendations

- If these environment variables are missing, the E2E tests skip cleanly.
- If `E2E_AUTH_ROLE_HARNESS` is not set to `true`, the E2E tests skip cleanly even when credential variables exist in local environment files.
- The original P2 smoke finding (**F-01: missing signed JWT for collab-user**) is now **resolved on the harness side**. The harness provides real authenticated sessions for remote Supabase RLS checks once staging credentials are supplied.
- The launch readiness decision remains a **Conditional Pass** until the staging credentials are set up on the CI pipeline to run these tests live.
