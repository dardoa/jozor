# Family Book Controlled PDF Readiness

Date: 2026-09-01 (production evidence updated 2026-09-02)

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

## Production Activation Evidence

- `VITE_ENABLE_CONTROLLED_PDF=true` is configured in Vercel Preview and Production.
- Production deployment `dpl_8SJkzu19hpMivYkdzewsJYTVEBw6` is Ready and aliased to `https://jozor.vercel.app`.
- The unauthenticated production endpoint returns the expected `401 Unauthorized` response with `no-store` and the controlled CORS policy.
- An authenticated synthetic production request containing Arabic text, mixed RTL/LTR years, an embedded Amiri font, and an embedded image returned a valid `%PDF-` document.
- The production proof is one A4 page (`594.96 x 841.92 pt`), contains no PDF JavaScript, renders shaped Arabic correctly, and preserves the embedded image.
- The remaining owner gate is a real Family Book export using owner-authorized tree content and photos; no live owner data was used in the synthetic production proof.

## Current Classification

- Application implementation: Pass
- Authentication and privacy controls: Pass
- Deterministic unit/API evidence: Pass
- Embedded Chromium renderer: Production deployed and verified
- Synthetic Arabic/font/image production proof: Pass
- Real owner Family Book visual review: Pending
- Browser print fallback: Available, transitional only
