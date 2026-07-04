# Vercel Environment & Deployment Smoke Evidence Notes - 2026-07-04

This file records sanitized execution evidence for the Vercel Environment & Deployment Smoke audit.

## 1. Vercel CLI Login & Link Checks

Safe checks performed:

```text
vercel --version
vercel whoami
```

Results:

```text
Vercel CLI: available
CLI authentication: authenticated
Local project link: present
```

The authenticated account name, team identifier, project identifier, and `.vercel/project.json` contents are intentionally omitted from committed notes.

## 2. Environment Variable Presence Audit

`vercel env ls` was used to verify presence only. No values were printed or committed.

Audited groups:

```text
Supabase
Paddle
Gemini / AI
Google Drive
App Origin
```

All required variables for the private beta deployment scope were reported as present, except `VITE_GEMINI_API_KEY`, which is intentionally not required because Gemini traffic goes through the server-side proxy.

## 3. Local Build Outputs

Sanitized build evidence:

```text
3868 modules transformed
MapViewImpl chunk: 8.02 kB
KindiOverlayWrapper chunk: 61.54 kB
Build completed successfully
```

No secret values or deployment identifiers were included in build evidence.

## 4. Deployed URL Access Trace

Playwright navigation to the Vercel preview deployment URL redirected to Vercel SSO deployment protection:

```text
Heading: Log in to Vercel
Result: deployment protection active
```

The preview URL is intentionally omitted from committed notes. This is expected for protected preview deployments and keeps external tester invitations gated until a public or bypass-enabled deployment is ready.
