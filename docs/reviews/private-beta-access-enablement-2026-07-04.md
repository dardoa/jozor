# Private Beta Access Enablement Plan - 2026-07-04

**Decision**: Ready to execute live deployed smoke after access path is configured.  
**Tester Invitations**: Gated (External tester invitations remain gated until the smoke run passes).  
**Latest Reference Commit**: `513ba94 docs(beta): document live deployed smoke gate status`

---

## 1. Access Path Evaluation

To transition the Live Deployed Smoke gate status from Pending to Pass/Fail, we evaluated the following options to allow secure testing of the deployed preview:

1. **Option A: Vercel Protection Bypass Cookie/Token (Recommended)**
   * **Why**: Safely allows the tester's browser or Playwright automation context to view the protected preview branch using a secure token without making the deployment fully public.
   * **How**: Pass the bypass token via headers or cookie `_vercel_jwt` without exposing it in the code.
2. **Option B: Temporary Public Preview URL**
   * **Why**: Temporarily disabling Vercel Deployment Protection for the preview branch makes the application shell publicly reachable for verification.
   * **Risks**: Exposes the build to indexing or anonymous web access. Must only be enabled for the duration of the smoke test.
3. **Option C: Staging/Production Promotion**
   * **Why**: Promoting to a staging/production custom domain that bypasses default preview protection.
   * **Risks**: High risk of exposing unverified builds before complete integration sign-off.

---

## 2. Safe Execution Steps (Option A - Bypass Token)

To configure the bypass token path securely:

1. Log in to the Vercel Dashboard, select the project, and navigate to **Settings > Deployment Protection**.
2. Locate **Protection Bypass for Automation** and generate a bypass secret.
3. **Local Testing / CI Setup**:
   * Add the secret to your local `.env.local` or environment parameters as `VERCEL_BYPASS_TOKEN`.
   * Never commit this secret key to git.
4. **Browser/Playwright Execution**:
   * Playwright can inject the bypass cookie `_vercel_jwt` into the browser context before navigating, or append the token to the URL query param `?x-vercel-protection-bypass=<token>`.
   * Do not store tokenized URLs in committed screenshots, logs, reports, or CI output. Prefer environment variables and sanitized evidence notes.
   * Verify the page loads the application shell instead of the Vercel login screen.

---

## 3. Pre-Invitation Verification Checklist

Before inviting the first external beta tester, verify the following:

- [ ] **Deployment Bypass**: Deployed URL is accessible without redirecting to Vercel SSO login.
- [ ] **Live App Shell**: App boots successfully and loads `#root` without blank screen or P0/P1 console exceptions.
- [ ] **Authentication**: User can successfully register or log in using the staging Supabase Auth gateway.
- [ ] **Billing Iframe**: Paywall modal opens and clicking Pro upgrade successfully requests and renders the Paddle Sandbox Checkout overlay.
- [ ] **Rollback Tag**: Confirm `git tag -a beta-v2.0-rollback -m "Rollback baseline"` points to a stable production commit.

---

## 4. Rollback & Revocation Plan

If any critical blocker, data leak, or security vulnerability is identified in the deployed environment:

1. **Access Revocation**:
   * Go to Vercel Dashboard **Settings > Deployment Protection**.
   * Regenerate or delete the **Protection Bypass for Automation** secret token.
   * This immediately invalidates existing bypass cookies/links and locks access to Vercel SSO.
2. **Deployment Reversion**:
   * Promote the last known stable deployment commit via the Vercel dashboard or CLI.
3. **Invitations Gating**:
   * Disable the invitation email triggers or restrict user signup permissions in the Supabase Auth settings to prevent new accounts.

---

## 5. Current Gate Status

```text
Status: Ready once access path is configured
External tester invitations: blocked until live deployed smoke passes
```
