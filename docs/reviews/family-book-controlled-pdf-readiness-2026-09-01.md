# Family Book Controlled PDF Readiness

Date: 2026-09-01

## Decision

The Family Book now uses a controlled-PDF-first export contract. When the controlled renderer is enabled and its authenticated readiness check passes, the generated PDF blob is downloaded directly. If configuration or rendering fails, the application truthfully falls back to browser print and retains the existing header/footer warning.

The renderer no longer requires Browserless credentials. It runs an embedded serverless Chromium binary inside the authenticated Vercel function. Runtime activation requires only the build-time `VITE_ENABLE_CONTROLLED_PDF` flag and a deployment review.

## Implemented Path

`Family manuscript model -> HTML renderer -> embedded font/images -> authenticated PDF API -> embedded Chromium PDF -> verified PDF blob -> download`

The readiness check is a lightweight authenticated `GET`; it does not start Chromium.

## Security Boundaries

- The API requires an authenticated Jozor/Supabase session.
- The API rejects mismatched origins, executable markup, event handlers, and external resource references.
- The client embeds the Arabic font and supported profile images as data URIs before transmission.
- Failed or oversized images are omitted safely.
- Raw tree and person IDs are excluded from controlled-PDF diagnostics and API payload metadata.
- Chromium network requests are intercepted and only `data:` resources are allowed.
- Request size, image count, per-image bytes, aggregate asset bytes, title length, and render time are bounded.
- The returned payload must have `application/pdf` MIME type and a `%PDF-` signature.
- API responses are `no-store`, browser headers/footers are disabled, and the browser closes in `finally`.

## Activation Checklist

1. Add build-time `VITE_ENABLE_CONTROLLED_PDF=true` to Preview and Production.
2. Redeploy so the Vite flag is included in the client build.
3. Confirm the authenticated readiness endpoint reports `embedded-chromium`.
4. Export a real Arabic Family Book with photos and verify page count, Arabic shaping, embedded images, no browser headers/footers, and no external resource URLs.

## Current Classification

- Application implementation: Pass
- Authentication and privacy controls: Pass
- Deterministic unit/API evidence: Pass
- Embedded Chromium renderer: Implemented; deployment verification pending
- Real Arabic controlled PDF owner review: Pending feature activation
- Browser print fallback: Available, transitional only
