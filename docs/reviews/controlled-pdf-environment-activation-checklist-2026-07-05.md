# Controlled PDF Environment Activation Checklist (2026-07-05)

This document outlines the step-by-step operational checklist for activating the Browserless-backed Controlled PDF renderer in staging and production environments once credentials are provided.

---

## 1. Required Environment Configurations

Configure the following variables in the corresponding environments:

### Server-Side Variables (Vercel Functions)
- **`BROWSERLESS_TOKEN`** (Required): Secure API token obtained from Browserless.io.
- **`BROWSERLESS_ENDPOINT`** (Optional): Target URL for headless PDF generation. Defaults to `https://chrome.browserless.io/pdf`.

### Client-Side Variables (Vite Bundle)
- **`VITE_ENABLE_CONTROLLED_PDF`** (Required): Feature flag to enable client-side routing to the controlled path. Must be set to `true`.

---

## 2. Configuration Locations

- **Local Development:** Add variables to `.env.local` (do not commit this file).
- **Staging / Preview Environment:** Set via Vercel Project Settings for the Staging environment.
- **Production Environment:** Set via Vercel Project Settings for the Production environment (keep disabled until staging verification is complete).

---

## 3. Safe Activation Sequence

Follow this exact order of operations to verify the adapter pathway safely:

### Step 3.1: Configure the Secret
Configure `BROWSERLESS_TOKEN` on the target Vercel staging deployment. Leave `VITE_ENABLE_CONTROLLED_PDF` set to `false` initially.

### Step 3.2: Run Synthetic Smoke Check
Run the synthetic smoke script to verify connection capability:
```bash
node scripts/controlled-pdf-browserless-smoke.mjs
```
Confirm that `tmp/controlled_pdf_synthetic_smoke.pdf` is successfully generated and formatted.

### Step 3.3: Execute Test Tree Review Gate
Trigger a controlled PDF render using the sanitized test tree (35 people, Arabic sample data). Verify all items on the quality checklist (Arabic shaping, card wrapping, bibliography layout, timeline page breaks).

### Step 3.4: Staging Opt-in Activation
Enable `VITE_ENABLE_CONTROLLED_PDF=true` on the staging environment.
- Verify the readiness diagnostics panel displays: `"Controlled PDF: Ready"`.
- Confirm that PDF downloads call the `/api/publishing/render-manuscript-pdf` router.

### Step 3.5: Fallback Verification
Temporarily disable the token (or set an invalid `BROWSERLESS_TOKEN` value) on staging.
- Confirm that the readiness diagnostics panel falls back to: `"Controlled PDF: Browser print fallback"`.
- Verify that the Family Book PDF button still exports correctly using the browser print utility.

### Step 3.6: Production Activation
Once staging verification passes, repeat the process on the production environment.

---

## 4. Rollback Plan

If OOM crashes, performance bottlenecks, or layout errors are encountered in production, follow these rollback steps:
1. Set `VITE_ENABLE_CONTROLLED_PDF=false` in the production environment variables.
2. Redeploy the project or restart the deployment to apply the flag change.
3. Verify that the client defaults back to `browser-print-fallback` mode immediately.
4. Rotate or revoke the `BROWSERLESS_TOKEN` on the Browserless.io console if security key compromise is suspected.

---

## 5. Privacy & Data Integrity Checklist

- [ ] Do not include any real legal names or private documentation in initial connection tests.
- [ ] Ensure Vercel serverless function logs do not print incoming HTML payload data.
- [ ] Do not commit generated PDF files containing actual family names to the git repository.
- [ ] Confirm that viewer role privacy masking (e.g. hiding details for non-editor roles) is validated and fully active prior to sending real payloads.
