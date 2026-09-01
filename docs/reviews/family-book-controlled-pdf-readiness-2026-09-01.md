# Family Book Controlled PDF Readiness

Date: 2026-09-01

## Decision

The Family Book now uses a controlled-PDF-first export contract. When the controlled renderer is enabled and its authenticated readiness check passes, the generated PDF blob is downloaded directly. If configuration or rendering fails, the application truthfully falls back to browser print and retains the existing header/footer warning.

Runtime activation is intentionally pending. The linked Vercel project currently has neither `BROWSERLESS_TOKEN` nor `VITE_ENABLE_CONTROLLED_PDF` configured.

## Implemented Path

`Family manuscript model -> HTML renderer -> embedded font/images -> authenticated PDF API -> Browserless PDF -> verified PDF blob -> download`

The readiness check is a lightweight authenticated `GET`; it does not consume a Browserless render job.

## Security Boundaries

- The API requires an authenticated Jozor/Supabase session.
- The API rejects mismatched origins, executable markup, event handlers, and external resource references.
- The client embeds the Arabic font and supported profile images as data URIs before transmission.
- Failed or oversized images are omitted safely.
- Raw tree and person IDs are excluded from controlled-PDF diagnostics and API payload metadata.
- Request size, image count, per-image bytes, aggregate asset bytes, title length, and upstream render time are bounded.
- The returned payload must have `application/pdf` MIME type and a `%PDF-` signature.
- API responses are `no-store`, and Browserless headers/footers are explicitly disabled.

## Activation Checklist

1. Provision a Browserless account or a compatible controlled Chromium PDF endpoint.
2. Add server-only `BROWSERLESS_TOKEN` to Preview and Production in Vercel.
3. Optionally add `BROWSERLESS_ENDPOINT` when using a regional or self-hosted endpoint.
4. Add build-time `VITE_ENABLE_CONTROLLED_PDF=true` to Preview and Production.
5. Redeploy so the Vite flag is included in the client build.
6. Export a real Arabic Family Book with photos and verify page count, Arabic shaping, embedded images, no browser headers/footers, and no external resource URLs.

## Current Classification

- Application implementation: Pass
- Authentication and privacy controls: Pass
- Deterministic unit/API evidence: Pass
- Deployed controlled renderer: Blocked by missing external configuration
- Real Arabic controlled PDF owner review: Pending activation
- Browser print fallback: Available, transitional only
