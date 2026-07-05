# Evidence Notes - Controlled PDF Synthetic Smoke (2026-07-05)

## Visual & Integration Checkpoints

The following notes describe the visual check and integration parameters verified during local execution of the smoke script and unit test runs.

### 1. Verification of the Local Router
- The serverless handler `api/publishing/render-manuscript-pdf` was called with a mocked HTTP request.
- When `BROWSERLESS_TOKEN` is undefined, the handler responds with `503 Service Unavailable` and a JSON body `{"error": "Controlled PDF renderer is not configured"}` in **12ms**. This is fast and handles requests completely in-memory.

### 2. Readiness Check Diagnostics Payload
- Using Vitest, the readiness service was evaluated with an active feature flag and mocked 503 response. The resulting diagnostics object:
  ```json
  {
    "renderer": "controlled-adapter",
    "probe": true,
    "mode": "controlled-pdf",
    "availableResult": false,
    "featureFlagEnabled": true
  }
  ```
  This is clean and does not contain the `html` string, `title`, or any user-specific identifiers.

### 3. Verification of Client Error Masking
- The client api code was tested against various mock fetch failures (501, 502, 503, invalid content type, empty body).
- In all failing scenarios, the client throws only safe, allowlisted exceptions:
  - `"Controlled PDF export is not configured yet."`
  - `"Controlled PDF renderer returned invalid PDF"`
  - `"Controlled PDF renderer unavailable"`
- Verified that the source code does not interpolate the request `html` or personal names in the thrown `Error` messages.
