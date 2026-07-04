# Live Deployed Smoke Gate Evidence Notes - 2026-07-04

This document logs evidence gathered during the Vercel protection bypass audit.

## 1. Environment Variable Audit (Bypass Secrets)

No bypass secrets are configured in local environment files (`.env`, `.env.local`):

* `VERCEL_AUTOMATION_BYPASS_SECRET`: **missing**
* `VERCEL_PROTECTION_BYPASS`: **missing**
* `VERCEL_BYPASS_TOKEN`: **missing**

Additionally, no bypass parameters are set in the Vercel project environment settings.

## 2. Protected Deployment Check

A web request to the protected Vercel preview deployment URL redirected directly to:

```text
https://vercel.com/login?next=...
```

This confirms Vercel Deployment Protection remains **active** on the preview/production branch, blocking headless browser smoke automation until bypass configuration is supplied.
