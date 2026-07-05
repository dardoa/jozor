# Controlled PDF External Renderer Adapter (2026-07-05)

## Overview

Following the strategic decision to adopt an external rendering architecture (Option B), we implemented the connection to a headless Chromium rendering endpoint (compatible with Browserless.io) inside the Vercel serverless function router. This setup is fully gated behind the `VITE_ENABLE_CONTROLLED_PDF` feature flag.

---

## Configuration & Environment Variables

The Vercel function utilizes the following backend environment variables:
- **`BROWSERLESS_TOKEN`** (Required): The authentication token for accessing the managed Chromium browser instance. If missing, the serverless handler returns `503 Service Unavailable`.
- **`BROWSERLESS_ENDPOINT`** (Optional): Defaults to `https://chrome.browserless.io/pdf`. Specifies the target endpoint for PDF compilation.

**Important:** These variables are kept on the server-side only and are never exposed to the client-side bundle.

---

## Privacy & Security Boundaries

To guarantee the confidentiality of sensitive family data, we established strict privacy boundaries:
1. **No HTML Logging:** The serverless function never prints, dumps, or logs the incoming `html` payload or the parsed family names under any logging level.
2. **Scrubbed Upstream Errors:** If Browserless returns an error or connection fails, the handler intercepts the exception and returns a generic `502 Bad Gateway` response with the sanitized message: `"Controlled PDF renderer returned invalid PDF"`. No raw server status codes or stack traces are passed back to the client.
3. **Diagnostics Cleanup:** The `ControlledManuscriptPdfAdapter` filters metadata using an allowlist (e.g. `templateId`, `scopePersonCount`, etc.) and discards unallowlisted properties.

---

## Fallback & Activation Strategy

1. **Active Fallback:** The user-facing publishing flow defaults to `browser-print-fallback`.
2. **Missing Configuration Graceful Handling:** If `BROWSERLESS_TOKEN` is not set or the API returns an error, the client gracefully falls back to the browser print utility.
3. **Pending Activation:** Enabling the Controlled PDF path in production remains pending a final verification check with synthetic data on the remote Vercel environment.
