# Controlled PDF Rendering Strategy Spike (2026-07-05)

## Executive Summary

To enable Controlled PDF publishing for the Family Book manuscript, we conducted a technical spike evaluating two primary hosting/rendering strategies:
1. **Option A**: Running headless Chromium directly inside a Vercel Serverless Function (via `@sparticuz/chromium`).
2. **Option B**: Delegating rendering tasks to an external managed browser service (such as Browserless.io).

Based on package size audits, memory limit analysis, and local testing, **Option B (External Render Service)** is the recommended path for production due to Vercel's strict deployment constraints.

---

## Local Rendering Feasibility Spike

We verified headless rendering viability locally using our dev-dependency Playwright instance.
- **Script:** [`scripts/controlled-pdf-render-spike.mjs`](file:///d:/AppDEV/Jozor1.1/scripts/controlled-pdf-render-spike.mjs)
- **Input:** Synthetic RTL Arabic HTML with styled Amiri fonts and page-break rules.
- **Output:** Valid A4 PDF at [`tmp/synthetic_spike.pdf`](file:///d:/AppDEV/Jozor1.1/tmp/synthetic_spike.pdf).
- **Size:** 186.47 KB.
- **Duration:** ~6.4 seconds (includes initial Chromium spin-up).

**Result:** Headless Chrome successfully handles Arabic layout, RTL ordering, custom fonts (via `@import` / web fonts), and `@page` CSS margins perfectly. The visual output is consistent and print-ready.

---

## Technical Options Analysis

### Option A: Vercel Serverless Function + Headless Chromium

This option attempts to run Chromium inside Vercel's serverless nodes using `@sparticuz/chromium` + `playwright-core` or `puppeteer-core`.

#### Constraints & Risks:
1. **Bundle Size Limit (50MB)**: Vercel's maximum zip limit for serverless function deployments is 50MB. `@sparticuz/chromium` compiles to a compressed size of ~46-48MB. When combined with other backend dependencies, this routinely exceeds the limit, causing deployment failures.
2. **Memory Overhead (1024MB)**: Hobby/Pro accounts default to 1024MB memory allocations. Running Chromium and compiling a 200+ page manuscript from a massive DOM tree requires substantial memory, frequently leading to `OOM (Out Of Memory)` process crashes.
3. **Execution Time limits (10s-15s)**: Generating large books takes longer than Vercel's default function timeouts.
4. **Cold Starts**: Launching a packaged browser inside a serverless node adds a cold-start overhead of 3-5 seconds to the request lifecycle.
5. **Arabic Font Support**: Vercel nodes do not have local fonts installed. To support Arabic, fonts must be loaded inline or dynamically fetched by the headless browser during rendering.

---

### Option B: External Managed Rendering Service (Browserless.io)

This option uses `ControlledPdfApiClient` to post the sanitized HTML directly to a managed Chromium grid.

#### Constraints & Benefits:
1. **Bypasses Vercel Limits**: Zero impact on Vercel bundle size. The Vercel function remains a lightweight API router.
2. **High Stability**: Managed browser instances have dedicated resources and do not crash due to serverless memory exhaustion.
3. **Optimized Rendering**: Multi-page documents compile much faster because browser instances are kept hot (no cold start).
4. **Security & Privacy**: HTML payloads containing family data must be transmitted to the browser service. However:
   - Payload data is processed completely in-memory by Browserless and is not persisted.
   - Dedicated/private instances can be provisioned in specific regions (e.g. EU) to comply with data residency rules.
   - Payloads can be stripped of unnecessary diagnostic tags prior to transmission.

---

## Strategic Recommendation

We recommend proceeding with **Option B (External Adapter / Browserless.io)** for Phase 2:
- Keep the serverless API router `api/publishing/render-manuscript-pdf.ts` as the single gateway.
- Inside the router, forward the HTML to Browserless.io using a secure token kept in Vercel Environment variables (`BROWSERLESS_API_TOKEN`).
- Maintain a fallback strategy to `browser-print-fallback` if the service token is missing or if the API returns an error.

---

## Project Log Entry

We have updated the project log to record the results of this spike and set the direction for the next phase.
