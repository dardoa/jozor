# Paddle Sandbox Checkout Smoke Evidence - 2026-07-04

This file records sanitized execution evidence for the Paddle Sandbox Checkout Smoke audit.

## 1. Targeted Unit Tests

All 36 discovered billing-related tests passed across 9 files:

```text
src/features/admin/__tests__/AdminBillingDiagnostics.test.tsx (2 tests)
src/features/kindi/__tests__/useKindiController.billing.test.tsx (4 tests)
src/api/__tests__/adminBillingDiagnostics.test.ts (9 tests)
src/api/__tests__/createCheckoutSession.test.ts (3 tests)
src/api/__tests__/adminSubscriptions.test.ts (8 tests)
src/api/__tests__/customerPortal.test.ts (2 tests)
src/api/__tests__/billingWebhooks.test.ts (3 tests)
src/api/__tests__/paddleWebhook.test.ts (1 test)
src/api/__tests__/billingRoot.test.ts (4 tests)

Test Files: 9 passed
Tests: 36 passed
```

## 2. Playwright E2E Smoke Test Trace

Created and executed:

```text
tests/e2e/paddle-paywall-smoke.spec.ts
```

Sanitized result:

```text
Running 1 test using 1 worker
Paddle Paywall and Checkout Smoke Test > renders paywall and triggers upgrade checkout session request
window.Paddle initialized status: true
Checkout session API response status: 401
1 passed
```

## 3. Key Observations

1. Paddle SDK loaded and initialized successfully in the browser.
2. Clicking the upgrade button dispatched a POST request to `/api/billing/create-checkout-session`.
3. The local smoke run returned `401 Unauthorized` because it did not use a fully authenticated production-equivalent user session.
4. The UI handled the failure gracefully and rendered the expected checkout error state.
5. No Paddle secrets, API keys, webhook secrets, checkout URLs, customer emails, or tokens were committed.

## 4. Remaining Live Gate

A full Paddle sandbox transaction remains pending for a live authenticated sandbox user session. This is a beta-ops validation item, not a P0/P1 code blocker.
