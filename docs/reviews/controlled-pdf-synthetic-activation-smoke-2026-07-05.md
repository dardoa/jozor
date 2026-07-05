# Controlled PDF Synthetic Activation Smoke Check (2026-07-05)

## Overview

Following the implementation of the external renderer adapter, we performed a synthetic activation smoke check to verify the behavior of the system under the `VITE_ENABLE_CONTROLLED_PDF` feature flag without sending real family tree data.

## Verdict: Pass (Conditional / Skipped remote fetch)

The local readiness check and client-server boundaries pass all structural expectations. The remote connection fetch was skipped in the default workspace run since no active `BROWSERLESS_TOKEN` secret is configured in the environment.

---

## Scenarios Checked

### 1. Missing Token Fallback (Default Local Environment)
- **Settings:** `VITE_ENABLE_CONTROLLED_PDF=true`, `BROWSERLESS_TOKEN` is unset/empty.
- **Observed Behavior:**
  - `ControlledPdfReadinessService` returns `available: false` and recommends `browser-print-fallback`.
  - The diagnostics payload logs `featureFlagEnabled: true`, `mode: "controlled-pdf"`, and `availableResult: false`.
  - Under `useExport.ts`, clicking `Family Book PDF` correctly triggers the browser print dialog.

### 2. Browserless Connection Verification (Local Mock)
- **Settings:** Mocked response simulating a Browserless.io service returning an A4 PDF stream.
- **Observed Behavior:**
  - `ControlledPdfApiClient` correctly POSTs `html`, `title`, and `language` to the API router.
  - The client successfully validates the `Content-Type: application/pdf` header and parses the binary buffer into a Blob.
  - Thrown exceptions cleanly mask all HTML source and personal details under generic messages.

---

## Checklist Verification Results

### Configuration & Science
- [x] Feature flag correctly toggles readiness: **Pass**
- [x] Missing token throws safe 503 error: **Pass**
- [x] Diagnostics contain allowlisted metadata keys only: **Pass**
- [x] Browser print remains default client path: **Pass**
- [x] No HTML markup leaked in logs: **Pass**

---

## Action Items Before Real Data Review

1. Set `BROWSERLESS_TOKEN` inside the deployment provider's environment settings.
2. Verify that readiness evaluates to `available: true` on the staging environment.
3. Perform a manual review round using a small test tree (not containing sensitive live data) to inspect the styling on Browserless.
