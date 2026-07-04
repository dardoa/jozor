# Live Deployed Smoke Gate Report - 2026-07-04

**Status**: Pending  
**Reason**: Requires Vercel deployment protection bypass or public staging URL  
**Date**: 2026-07-04  
**Latest Reference Commit**: `dbdaedd docs(beta): add vercel env deployment smoke audit`

---

## 1. Access Method Audit

We audited the availability of safe access paths to perform the live deployed browser smoke test:

* **Public/Staging URL**: `not provided` (The deployment utilizes a private Vercel preview deployment URL protected by Vercel SSO login).
* **Vercel Bypass Tokens**:
  * `VERCEL_AUTOMATION_BYPASS_SECRET`: **missing**
  * `VERCEL_PROTECTION_BYPASS`: **missing**
  * `VERCEL_BYPASS_TOKEN`: **missing**
* **Deployment Protection Status**: **active** (Redirects requests to the Vercel SSO login page).

---

## 2. Live Deployed Smoke Test Checklist (Reference Guide)

Once access to the deployed environment is established (either by providing a bypass token, configuring a public domain, or disabling protection temporarily), the following checklist must be manually validated by the operator or E2E automation:

1. **App Shell Load**: Open the deployed URL and verify that the layout and `#root` render successfully.
2. **App Welcome UI**: Verify the landing page, sign-in buttons, and translation triggers are functional.
3. **Session Restoration**: Log in using a test account and verify the session hydrates the application state.
4. **Tree Initialization**: Open or restore a test family tree.
5. **Viewer Masking**: Access the tree using a viewer/guest role and confirm that biographical details are masked on the UI.
6. **Export Sanitization**: Verify exporting GEDCOM or Markdown files from a masked view does not leak original names or birth dates.
7. **Kindi AI Dynamic Load**: Click the Kindi trigger and verify that the lazy-loaded overlay chunk imports and initializes correctly.
8. **Migration Map Dynamic Load**: Open the geography modal and verify the Leaflet map overlay chunk imports and renders correctly.
9. **Vault / Manuscript Preview**: Open the Vault, configure a narrative preview, and verify the manuscript previews correctly.
10. **Paywall Modal & Checkout Initialization**: Trigger the paywall modal via events or settings, click Pro upgrade, and verify the Paddle sandbox checkout overlay opens correctly. Do not complete a real payment.
11. **Console Check**: Monitor the browser console for P0/P1 exceptions or failing network requests.

---

## 3. Final Recommendation

```text
Status: Pending
Reason: requires Vercel deployment protection bypass or public staging URL
```

This gate is closed as an operations prerequisite. The application code is verified and prepared for smoke runs once access is configured.
