# Vercel Environment & Deployment Smoke Report - 2026-07-04

**Status**: Conditional Pass  
**Date**: 2026-07-04  
**Latest Reference Commit**: `303f132 docs(beta): finalize private beta go no-go checklist`

---

## 1. Vercel Project Link & Auth Status

* **Vercel CLI**: Installed (Version `49.2.0`).
* **CLI Authentication**: Authenticated (account name intentionally omitted).
* **Project Linked**: Yes, `.vercel/project.json` is present. Project and team identifiers are intentionally omitted from committed notes.

---

## 2. Environment Variable Presence Audit

Audited environment variable configuration in Vercel. All values remain securely encrypted. Presence has been mapped as follows:

| Group | Variable Name | Vercel Status | Scope / Usage |
| :--- | :--- | :--- | :--- |
| **Supabase** | `VITE_SUPABASE_URL` | **Present** | Client Supabase URL connection |
| | `VITE_SUPABASE_ANON_KEY` | **Present** | Client Supabase anonymous access |
| | `SUPABASE_SERVICE_ROLE_KEY` | **Present** | Server-side elevated database access |
| | `SUPABASE_JWT_SECRET` | **Present** | Session validation and API authentication |
| **Paddle** | `PADDLE_API_KEY` | **Present** | Server-side Paddle REST requests |
| | `PADDLE_ENVIRONMENT` | **Present** | Server environment selection (`sandbox`) |
| | `PADDLE_WEBHOOK_SECRET` | **Present** | Server verification of incoming webhooks |
| | `PADDLE_PRO_PRICE_ID` | **Present** | Mapping Pro tier subscription prices |
| | `PADDLE_FAMILY_PRICE_ID` | **Present** | Mapping Family tier subscription prices |
| | `VITE_PADDLE_CLIENT_TOKEN` | **Present** | Client-side Paddle SDK token |
| | `VITE_PADDLE_ENVIRONMENT` | **Present** | Client-side SDK environment selection |
| **AI / Gemini** | `GEMINI_API_KEY` | **Present** | Server-side LLM processing proxy requests |
| | `VITE_GEMINI_API_KEY` | **Not Configured** | Ignored (Client goes through local proxy api) |
| **Google Drive** | `VITE_GOOGLE_CLIENT_ID` | **Present** | Client-side Google Picker authentication |
| | `VITE_GOOGLE_API_KEY` | **Present** | Client-side Google Drive sync authorization |
| **App Origin** | `APP_ORIGIN` | **Present** | Server-side CORS origin checking |
| | `VITE_APP_ORIGIN` | **Present** | Client-side public URL binding |

---

## 3. Build & Compilation Verification

* **Local Typecheck**: Passed (`tsc --noEmit` exited with 0).
* **Local Build**: Passed (`vite build` compiled successfully in 21.11s with 3868 modules).
* **Vite Bundling**:
  * `KindiOverlayWrapper` size: `61.54 kB`
  * `MapViewImpl` size: `8.02 kB`
  * No chunk size warnings or build errors discovered.

---

## 4. Deployed URL Smoke Results

* **Tested URL**: Vercel preview deployment URL (omitted from committed notes).
* **Observation**: Opening the deployed preview URL results in a redirect to `Log in to Vercel` (Vercel deployment protection active).
* **Result**: **Conditional Pass**. The app shell loads but requires Vercel SSO bypass or public deployment configuration to verify frontend actions in a headless browser test.

---

## 5. Final Recommendation

```text
Decision: Conditional Pass - vercel environment variables and local builds are verified successfully.
Live deployed smoke remains gated pending Vercel deployment protection bypass or public domain promotion.
```
