# First Beta Tester Onboarding Plan - 2026-07-04

**Status**: Ready as an onboarding plan  
**Execution**: Blocked until live deployed smoke passes  
**External invitations**: Not authorized yet  
**Latest Reference Commit**: `d557e09 docs(beta): add live deployed smoke execution results`

---

## 1. Onboarding Gate Prerequisites

This plan outlines the onboarding operations for the first wave of private beta testers. The actual launch is strictly gated:

* **Trigger Condition**: Fully passing Playwright `live-deployed-smoke.spec.ts` test run on the deployed staging environment.
* **Current Status**: **Blocked** (Waiting for staging access configuration).

---

## 2. Beta Cohort & Data Guidelines

* **Target Cohort Size**: 3–5 trusted internal/closed testers. No public signup or registration links will be shared.
* **Tester Identifiers**: Sanitize all logs. No real names, emails, phone numbers, or addresses should be written into git, logs, or reports.
* **Test Data Policy**:
  * **Strict Requirement**: All testers must work on a **copied test tree** or a **duplicated/copied GEDCOM file**.
  * **Prohibited Data**: Do not upload legal identity documents, highly sensitive media/images, or use the sole primary/original copy of any family tree.
  * **Backup**: All imported trees must be backed up locally by the tester before upload.

---

## 3. Core Test Scenarios

Testers will be instructed to perform and verify the following specific user flows:

1. **Authentication**: Sign up/sign in using staging authentication without security leaks.
2. **Tree Editing**: Add ancestors, update biographical events, and link relationship cards.
3. **Viewer Privacy**: Invite a secondary email with the `guest/viewer` role, log in as that viewer, and verify that all sensitive details (e.g. living names, birth dates) are masked.
4. **GEDCOM Import/Export**: Import a copied GEDCOM file, verify parsing, edit entries, and export the file ensuring masked fields do not leak in the exported data.
5. **Family Manuscript**: Open the Vault, compile narrative reviews, and verify PDF print-out layout.
6. **Kindi AI Assistant**: Ask Kindi genealogy questions, verify contextual search, and confirm lazy-loaded overlay chunk stability.
7. **Geographic Map**: Open migration paths, verify marker clustering, and confirm Leaflet map lazy chunk load stability.
8. **Paddle Sandbox Upgrade**: Trigger paywall modal from settings, click Pro upgrade, and verify the Paddle checkout iframe initializes in sandbox mode. Do not make real purchases.

---

## 4. Feedback Collection & Bug Classification

All observations, screenshots, and errors will be logged in a private coordinator sheet, categorized as follows:

* **P0 (Blocker)**: Crash on startup, security breach, database write failure, or data loss. Immediate invite freeze and rollback.
* **P1 (High)**: Major feature broken (e.g. GEDCOM import fails, or maps crash), or billing portal fails to open. Must be fixed before the next beta wave.
* **P2 (Medium/Low)**: Layout shifts, minor wording mistakes, or slow loading warnings. Logged for post-beta resolution.

---

## 5. Rollback & Revocation Plan

* **Access Revocation**: Delete/regenerate the Vercel Automation Bypass Secret. This immediately terminates active staging sessions.
* **Staging Rollback**: Revert Vercel promotion to the designated rollback commit or tag after it is created during the release handoff.
* **Auth Lockdown**: Restrict Supabase signup policies to disable new user creation.
