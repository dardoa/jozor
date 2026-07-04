# Private Beta Invitation Gate Decision - 2026-07-04

**Decision**: Ready for owner approval to invite first controlled beta cohort.  
**External invitations**: Not authorized yet  
**Latest Reference Commit**: `e89f8df docs(beta): record public production smoke run`

---

## 1. Onboarding Status & Gate Sign-Off

The technical release gates are fully closed:

- **Launch Readiness Audit**: **Passed**
- **Vercel Env Audit**: **Passed**
- **E2E Live Smoke Run**: **Passed** (verified against `https://jozor.vercel.app/` with 0 console errors/logs in production).
- **Paddle Sandbox Check**: **Passed** (verified checkout portal loading and API session generation).

---

## 2. Onboarding Guidelines & Cohort Definition

* **Recommended Cohort**: 3-5 trusted testers.
* **Onboarding Process**: Handled via secure invitation emails dispatched directly by the owner. No registration URLs or public links may be posted.
* **Tester Data Safety Rule**:
  * All testers must operate on **copied or duplicated family tree files (GEDCOM)**.
  * Testers are strictly prohibited from using their sole, un-backed primary family trees, uploading official identity credentials, or placing highly private/sensitive photos during the first waves.
  * Testers must perform a local copy backup of their GEDCOMs before importing them.

---

## 3. Operational Stop Conditions (Invite Freeze Triggers)

If any of the following P0/P1 symptoms occur during beta testing, the cohort must be frozen, and the rollback procedure triggered immediately:

1. **P0 Runtime Errors**: App crash on initial load, blank page rendering, or unhandled exceptions blocking basic dashboard navigation.
2. **Privacy Leak**: A viewer/guest user successfully accessing, viewing, or exporting living ancestor names or birth details in unmasked form.
3. **Data Corruption**: GEDCOM import or export altering family relation pointers or corrupting person properties.
4. **Billing Sandbox Misrouting**: Live payment checkout session requests sent to production Paddle endpoints instead of the sandbox gateway.

---

## 4. Rollback Procedure

In the event of a freeze/emergency shutdown:

1. Locate the annotated tag `beta-v2.0-rollback` in git.
2. Revert the production deployment in the Vercel dashboard to the commit corresponding to the rollback tag.
3. Terminate staging/preview bypass cookies by regenerating the bypass token in the Vercel Settings.
4. Set the signup policy in Supabase Auth to fully restricted.
