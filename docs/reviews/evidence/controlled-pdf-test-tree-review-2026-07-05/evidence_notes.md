# Evidence Notes - Controlled PDF Test Tree Review Gate (2026-07-05)

## Status: Pending Remote Token

As of 2026-07-05, the `BROWSERLESS_TOKEN` is not yet configured on the developer machine's environment, meaning remote browser execution was bypassed.

### Local Mock Verification
To ensure the system works as expected once the token is added, we verified the following local parameters:
1. **API Router Input Validation**:
   - The route handler validates that `html` and `title` are provided.
   - Verified that a payload missing these keys correctly yields `400 Bad Request`.
2. **503 Readiness Probe Handling**:
   - Toggled `VITE_ENABLE_CONTROLLED_PDF=true`.
   - Verified that the user interface correctly displays `"Controlled PDF: Browser print fallback"` since the local server returns `503 Service Unavailable`.
3. **No Secret Leaks**:
   - Verified that the server-side code does not print environment variables to standard stdout/stderr logs.
