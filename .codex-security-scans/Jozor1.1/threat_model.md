# Jozor Threat Model

## Overview

Jozor is a React/Vite family-tree application with local-first state, Google Drive backup/import, Supabase-backed collaboration, Vercel API routes, Supabase Edge Functions, push notifications, AI biography/chat generation, media upload, archive import/export, and realtime synchronization.

Primary assets are family-tree data, people records, relationship graphs, biographies, source links, media, Google OAuth tokens, Supabase JWTs, collaborator roles, invitation tokens, push subscriptions, AI usage quota state, and server-side secrets.

## Threat Model, Trust Boundaries, and Assumptions

Important trust boundaries:

- Browser to Vercel API routes in `api/`.
- Browser to Supabase tables, storage, realtime channels, and RPCs.
- Browser to Google OAuth and Google Drive files.
- Supabase Edge Function `resolve-tree-context` using service-role credentials.
- Imported JSON/ZIP/Drive/archive content entering app state.
- AI prompts and uploaded image content crossing from user data to the Gemini provider.
- Push cron/admin calls protected by `CRON_SECRET`.

Attacker-controlled inputs include imported Drive/backup JSON, Jozor archives, GEDCOM/JSON imports, tree/person fields, collaborator emails, invitation tokens, query/body values for API routes, uploaded images, media URLs, realtime operation payloads, and AI prompts. Operator-controlled inputs include environment variables and Supabase migrations. Developer-controlled inputs include tests, docs, and local dev tooling.

The scan assumes Supabase RLS and storage policies are part of the production control plane, Google Drive enforces Drive-level object access, and browser XSS would be high impact because tokens and private tree data live in browser-accessible storage/state.

## Attack Surface, Mitigations, and Attacker Stories

High-value attack surfaces:

- `api/auth/exchange.ts`, `utils/authUtils.ts`, and Supabase JWT creation/verification.
- `api/proxy.ts`, tree read/write proxying, and RPC-backed tree replacement.
- Supabase RLS/RPC migrations under `supabase/migrations/`.
- Google Drive load/save/import paths under `services/google/` and `hooks/google/`.
- Import/export/archive paths under `services/archive*`, `utils/archiveLogic.ts`, and `services/importTreeService.ts`.
- Client rendering of biography HTML, source links, person media, and user-generated fields.
- Push endpoints `api/push-notifier.ts` and `api/push-reminder-cron.ts`.
- Realtime/invitation services and collaborator lookup paths.

Existing mitigations include Supabase token validation, service-role use isolated to server routes/functions, collaborator role checks, RLS policies for tree data, CRON secret checks, AI usage caps, DOMPurify for biography HTML, media MIME checks for standard photo upload, archive path checks, and replacement of legacy Drive sharing.

## Severity Calibration

Critical: remote auth bypass or RLS/RPC flaw allowing arbitrary tree read/write across accounts; service-role exposure; stored XSS that steals tokens and reaches private trees.

High: editor/viewer privilege escalation, invitation acceptance bypass, arbitrary protected tree mutation, or reliable stored script execution from imported/shared content.

Medium: metadata leaks, user-specific phishing/open redirect/click-triggered script execution, weak diagnostics outside production, or object existence enumeration.

Low: local-only robustness issues, developer-only endpoint exposure in non-production, and self-XSS without meaningful token or data impact.
